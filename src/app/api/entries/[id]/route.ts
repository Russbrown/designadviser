import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔍 [GET_ENTRY] Fetching entry:', { id });
    
    // Fetch the entry with its versions
    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .select(`
        *,
        design_versions (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('💥 [GET_ENTRY] Database error:', error);
      throw error;
    }

    console.log('✅ [GET_ENTRY] Entry fetched successfully:', { 
      id, 
      hasAdvice: !!data.advice,
      adviceLength: data.advice?.length || 0 
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [GET_ENTRY] Failed to fetch entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log('📝 [PATCH_ENTRY] Updating entry:', { id, fields: Object.keys(body) });
    
    // Update the entry with provided fields
    const { data, error } = await supabaseAdmin
      .from('design_entries')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('💥 [PATCH_ENTRY] Database error:', error);
      throw error;
    }

    console.log('✅ [PATCH_ENTRY] Entry updated successfully:', { id });
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [PATCH_ENTRY] Failed to update entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
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
    
    // Delete the entry (this will cascade delete versions due to foreign key constraint)
    const { error } = await supabaseAdmin
      .from('design_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}