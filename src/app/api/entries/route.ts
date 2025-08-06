import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .select(`
        *,
        design_versions (*)
      `)
      .order('created_at', { ascending: false });

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
    const body = await request.json();
    const { name, image_url, image_path, context, inquiries, advice, user_id } = body;

    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .insert([{
        name,
        image_url,
        image_path,
        context,
        inquiries,
        advice,
        user_id: user_id || null // Support both authenticated and anonymous usage
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}