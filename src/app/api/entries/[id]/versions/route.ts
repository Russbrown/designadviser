import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('design_versions')
      .select('*')
      .eq('entry_id', id)
      .order('version_number', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { image_url, image_path, advice, notes } = body;

    // Get the current highest version number for this entry
    const { data: existingVersions, error: versionError } = await supabase
      .from('design_versions')
      .select('version_number')
      .eq('entry_id', id)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) throw versionError;

    const nextVersionNumber = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 2; // Start from version 2 since original entry is version 1

    const { data, error } = await supabase
      .from('design_versions')
      .insert([{
        entry_id: id,
        version_number: nextVersionNumber,
        image_url,
        image_path,
        advice,
        notes
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}