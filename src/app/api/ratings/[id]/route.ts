import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { rating, feedback } = body;
    const { id: ratingId } = await params;

    if (!rating || !ratingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('advice_ratings')
      .update({
        rating,
        feedback: feedback || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rating:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ratings PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ratingId } = await params;

    if (!ratingId) {
      return NextResponse.json(
        { error: 'Missing rating ID' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('advice_ratings')
      .delete()
      .eq('id', ratingId);

    if (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in ratings DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete rating' },
      { status: 500 }
    );
  }
}