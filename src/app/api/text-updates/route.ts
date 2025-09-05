import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (passed by frontend)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    let query = supabaseAdmin
      .from('text_updates')
      .select('*');

    // Apply proper filtering based on authentication status
    if (userId && userId !== 'null') {
      // Authenticated user: show their text updates + anonymous text updates
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      // Unauthenticated: only show anonymous text updates
      query = query.is('user_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching text updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch text updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('💾 [TEXT_UPDATE] Starting text update save operation');
  
  try {
    // Verify user authentication
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    console.log('🔐 [TEXT_UPDATE] Authentication check:', { userId });
    
    if (!userId || userId === 'null') {
      console.log('❌ [TEXT_UPDATE] Authentication failed - no user ID');
      return NextResponse.json(
        { error: 'Authentication required to create text updates' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content } = body;
    
    console.log('📋 [TEXT_UPDATE] Received text update data:', {
      title: title || 'No title',
      contentLength: content?.length || 0,
      userId
    });

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('❌ [TEXT_UPDATE] Invalid content provided');
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Prepare the text update data
    const updateData = {
      title: title && title.trim() ? title.trim() : null,
      content: content.trim(),
      user_id: userId
    };

    console.log('💫 [TEXT_UPDATE] Executing Supabase insert...');
    const insertStart = Date.now();

    const { data, error } = await supabaseAdmin
      .from('text_updates')
      .insert([updateData])
      .select()
      .single();

    const insertTime = Date.now() - insertStart;

    if (error) {
      console.error('💥 [TEXT_UPDATE] Supabase insert error:', {
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
    console.log('✅ [TEXT_UPDATE] Text update save successful:', {
      insertTime: `${insertTime}ms`,
      totalTime: `${totalTime}ms`,
      updateId: data.id
    });

    return NextResponse.json(data);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [TEXT_UPDATE] Text update save failed after ${totalTime}ms:`, error);
    
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
      { error: 'Failed to create text update', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}