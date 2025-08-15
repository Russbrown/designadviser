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
  try {
    // Verify user authentication
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId || userId === 'null') {
      return NextResponse.json(
        { error: 'Authentication required to create entries' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image_url, image_path, context, inquiries, advice, senior_critique, mini_advice } = body;
    
    // Log what we're receiving
    console.log('Received entry data:', { name, image_url, image_path, context, inquiries, advice: !!advice, senior_critique: !!senior_critique, mini_advice: !!mini_advice });

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

    // Add optional fields only if they exist
    if (senior_critique) {
      entryData.senior_critique = senior_critique;
    }
    if (mini_advice) {
      entryData.mini_advice = mini_advice;
    }

    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}