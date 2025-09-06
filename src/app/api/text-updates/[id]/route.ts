import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  console.log('💾 [TEXT_UPDATE_UPDATE] Starting text update update operation');
  
  try {
    // Verify user authentication
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    console.log('🔐 [TEXT_UPDATE_UPDATE] Authentication check:', { userId, textUpdateId: params.id });
    
    if (!userId || userId === 'null') {
      console.log('❌ [TEXT_UPDATE_UPDATE] Authentication failed - no user ID');
      return NextResponse.json(
        { error: 'Authentication required to update text updates' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content } = body;
    
    console.log('📋 [TEXT_UPDATE_UPDATE] Received text update data:', {
      title: title || 'No title',
      contentLength: content?.length || 0,
      userId,
      textUpdateId: params.id
    });

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('❌ [TEXT_UPDATE_UPDATE] Invalid content provided');
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Prepare the text update data
    const updateData = {
      title: title && title.trim() ? title.trim() : null,
      content: content.trim()
    };

    console.log('💫 [TEXT_UPDATE_UPDATE] Executing Supabase update...');
    const updateStart = Date.now();

    // Update only if the user owns the text update
    const { data, error } = await supabaseAdmin
      .from('text_updates')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    const updateTime = Date.now() - updateStart;

    if (error) {
      console.error('💥 [TEXT_UPDATE_UPDATE] Supabase update error:', {
        updateTime: `${updateTime}ms`,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        fullError: error
      });
      
      // If no rows were affected, it might be because the user doesn't own the text update
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Text update not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Text update not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    const totalTime = Date.now() - startTime;
    console.log('✅ [TEXT_UPDATE_UPDATE] Text update update successful:', {
      updateTime: `${updateTime}ms`,
      totalTime: `${totalTime}ms`,
      updateId: data.id
    });

    return NextResponse.json(data);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [TEXT_UPDATE_UPDATE] Text update update failed after ${totalTime}ms:`, error);
    
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
      { error: 'Failed to update text update', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}