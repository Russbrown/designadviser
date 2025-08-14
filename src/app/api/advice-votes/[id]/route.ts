import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { preferred_advice_type, feedback, user_id } = body;

    // Validate required fields
    if (!preferred_advice_type || ![1, 2, 3].includes(preferred_advice_type)) {
      return NextResponse.json(
        { error: 'Valid preferred advice type (1, 2, or 3) is required' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update the vote, ensuring user can only update their own votes
    const { data, error } = await supabaseAdmin
      .from('advice_votes')
      .update({
        preferred_advice_type,
        feedback: feedback || null,
      })
      .eq('id', id)
      .eq('user_id', user_id) // Security: ensure user can only update their own votes
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Vote not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating advice vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete the vote, ensuring user can only delete their own votes
    const { error } = await supabaseAdmin
      .from('advice_votes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Security: ensure user can only delete their own votes

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting advice vote:', error);
    return NextResponse.json(
      { error: 'Failed to delete vote' },
      { status: 500 }
    );
  }
}