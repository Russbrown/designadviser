import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const body = await request.json();
    
    console.log('📝 [PATCH_VERSION] Updating version:', { entryId: id, versionId, fields: Object.keys(body) });
    
    // Update the version with provided fields
    const { data, error } = await supabaseAdmin
      .from('design_versions')
      .update(body)
      .eq('id', versionId)
      .eq('entry_id', id) // Extra security check
      .select()
      .single();

    if (error) {
      console.error('💥 [PATCH_VERSION] Database error:', error);
      throw error;
    }

    console.log('✅ [PATCH_VERSION] Version updated successfully:', { entryId: id, versionId });
    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 [PATCH_VERSION] Failed to update version:', error);
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}