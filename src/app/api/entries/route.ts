import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (passed by frontend)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    let query = supabaseAdmin
      .from('design_entries')
      .select(`
        *,
        design_versions (*)
      `);

    // Apply proper filtering based on authentication status
    if (userId && userId !== 'null') {
      // Authenticated user: show their entries + anonymous entries
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      // Unauthenticated: only show anonymous entries
      query = query.is('user_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('💾 [DB_SAVE] Starting database save operation');
  
  try {
    // Verify user authentication
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    console.log('🔐 [DB_SAVE] Authentication check:', { userId });
    
    if (!userId || userId === 'null') {
      console.log('❌ [DB_SAVE] Authentication failed - no user ID');
      return NextResponse.json(
        { error: 'Authentication required to create entries' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image_url, image_path, context, inquiries, advice } = body;
    
    console.log('📋 [DB_SAVE] Received entry data:', {
      name: name || 'No name',
      image_url: image_url ? `${image_url.substring(0, 50)}...` : 'No URL',
      image_path: image_path || 'No path',
      context: context || 'No context',
      inquiries: inquiries || 'No inquiries',
      adviceLength: advice?.length || 0,
      adviceType: 'GPT-5 (optimized single call)'
    });

    // Prepare the entry data
    const entryData: Record<string, unknown> = {
      name,
      image_url,
      image_path,
      context,
      inquiries,
      advice,
      user_id: userId
    };

    // Optimized: Only saving GPT-5 advice in main advice column
    console.log('✅ [DB_SAVE] GPT-5 advice will be saved in main advice column:', advice?.length || 0, 'characters');

    console.log('🚀 [DB_SAVE] Prepared entry data structure:', {
      fieldsCount: Object.keys(entryData).length,
      hasRequiredFields: !!(entryData.name && entryData.image_url && entryData.advice),
      userId: entryData.user_id
    });

    console.log('💫 [DB_SAVE] Executing Supabase insert...');
    const insertStart = Date.now();

    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .insert([entryData])
      .select()
      .single();

    const insertTime = Date.now() - insertStart;

    if (error) {
      console.error('💥 [DB_SAVE] Supabase insert error:', {
        insertTime: `${insertTime}ms`,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        fullError: error
      });
      throw error;
    }

    const totalTime = Date.now() - startTime;
    console.log('✅ [DB_SAVE] Database save successful:', {
      insertTime: `${insertTime}ms`,
      totalTime: `${totalTime}ms`,
      entryId: data.id
    });

    return NextResponse.json(data);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [DB_SAVE] Database save failed after ${totalTime}ms:`, error);
    
    // Detailed error logging
    if (error && typeof error === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any;
      console.error('Detailed database error:', {
        message: errorObj.message || 'No message',
        code: errorObj.code || 'No code',
        details: errorObj.details || 'No details',
        hint: errorObj.hint || 'No hint',
        stack: errorObj.stack || 'No stack'
      });
    }

    return NextResponse.json(
      { error: 'Failed to create entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}