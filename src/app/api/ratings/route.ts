import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const entryId = searchParams.get('entry_id');
    const versionId = searchParams.get('version_id');

    if (!userId || (!entryId && !versionId)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('advice_ratings')
      .select('*')
      .eq('user_id', userId);

    if (entryId) {
      query = query.eq('entry_id', entryId);
    } else if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching rating:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ratings GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rating' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating, feedback, user_id, entry_id, version_id } = body;

    if (!rating || !user_id || (!entry_id && !version_id)) {
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
      .insert({
        rating,
        feedback: feedback || null,
        user_id,
        entry_id: entry_id || null,
        version_id: version_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting rating:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ratings POST:', error);
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    );
  }
}