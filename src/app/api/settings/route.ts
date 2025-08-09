import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      console.error('Database error getting settings:', error);
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
    const body = await request.json();
    const { globalAdvice, user_id } = body;

    console.log('Settings API received:', { globalAdvice: globalAdvice?.length, user_id }); // Debug log

    if (typeof globalAdvice !== 'string') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // If no user_id provided, reject the request
    if (!user_id) {
      console.log('No user_id provided in request'); // Debug log
      return NextResponse.json(
        { error: 'Authentication required to save settings' },
        { status: 401 }
      );
    }

    // First, try to see if the record exists
    const { data: existingSettings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    console.log('Existing settings for user:', existingSettings);

    // Use upsert to insert or update user settings
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: user_id,
        global_advice: globalAdvice,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error saving settings:', error);
      return NextResponse.json(
        { error: 'Failed to save settings' },
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
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}