import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Fixed: Using database storage instead of file system

// Default settings
const DEFAULT_SETTINGS = {
  globalAdvice: `Company: [Your Company Name]
Brand Guidelines: 
- Primary colors: 
- Typography: 
- Design principles: 

Industry: 
Target Audience: 
Design Style Preferences: 

Focus Areas:
- User Experience
- Accessibility
- Brand Consistency
- Visual Hierarchy
- Conversion Optimization

Additional Context:
`,
  lastUpdated: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  try {
    console.log('Settings API v2.0 - Database version'); // Version marker
    // Check for user_id in query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    // If no user_id provided, return default settings
    if (!userId) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // Get user settings from database
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*') // Select all columns to see what's available
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no settings found, return default settings
      if (error.code === 'PGRST116') {
        return NextResponse.json(DEFAULT_SETTINGS);
      }
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json({
      globalAdvice: userSettings.global_advice || DEFAULT_SETTINGS.globalAdvice,
      lastUpdated: userSettings.updated_at,
    });
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Settings POST API v2.0 - Database version'); // Version marker
    const body = await request.json();
    const { globalAdvice, user_id } = body;


    if (typeof globalAdvice !== 'string') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // If no user_id provided, reject the request
    if (!user_id) {
      return NextResponse.json(
        { error: 'Authentication required to save settings' },
        { status: 401 }
      );
    }


    console.log('Attempting to save settings for user:', user_id);

    // Use upsert to insert or update user settings
    // The onConflict parameter tells Supabase which column to use for conflict resolution
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: user_id,
        global_advice: globalAdvice,
      }, {
        onConflict: 'user_id' // This tells upsert to update when user_id matches
      })
      .select()
      .single();

    console.log('Upsert result:', { data: userSettings, error });

    if (error) {
      console.error('Database error saving settings:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to save settings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings: {
        globalAdvice: userSettings.global_advice,
        lastUpdated: userSettings.updated_at,
      }
    });
  } catch (error) {
    console.error('Unexpected error saving settings:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to save settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}