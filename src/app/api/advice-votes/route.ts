import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const entryId = searchParams.get('entry_id');
    const versionId = searchParams.get('version_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('advice_votes')
      .select('*')
      .eq('user_id', userId);

    if (entryId) {
      query = query.eq('entry_id', entryId);
    }
    if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching advice vote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, entry_id, version_id, preferred_advice_type, feedback } = body;

    // Validate required fields
    if (!user_id || !preferred_advice_type || ![1, 2, 3].includes(preferred_advice_type)) {
      return NextResponse.json(
        { error: 'User ID and valid preferred advice type (1, 2, or 3) are required' },
        { status: 400 }
      );
    }

    if (!entry_id && !version_id) {
      return NextResponse.json(
        { error: 'Either entry_id or version_id is required' },
        { status: 400 }
      );
    }

    if (entry_id && version_id) {
      return NextResponse.json(
        { error: 'Cannot vote on both entry and version simultaneously' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('advice_votes')
      .insert([{
        user_id,
        entry_id: entry_id || null,
        version_id: version_id || null,
        preferred_advice_type,
        feedback: feedback || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating advice vote:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'You have already voted on this advice' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vote' },
      { status: 500 }
    );
  }
}