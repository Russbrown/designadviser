import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // If no user is logged in, return default settings
    if (!session?.user?.id) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // Get user settings from database
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('global_advice, updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      // If no settings found (404), return default settings
      if (error.code === 'PGRST116') {
        return NextResponse.json(DEFAULT_SETTINGS);
      }
      console.error('Database error:', error);
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
    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Require authentication for saving settings
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required to save settings' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { globalAdvice } = body;

    if (typeof globalAdvice !== 'string') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Use upsert to insert or update user settings
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        global_advice: globalAdvice,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
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