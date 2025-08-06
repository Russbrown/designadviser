import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

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

export async function GET() {
  try {
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      return NextResponse.json(settings);
    } catch (error) {
      // If file doesn't exist, return default settings
      return NextResponse.json(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { globalAdvice } = body;

    if (typeof globalAdvice !== 'string') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    await ensureDataDirectory();

    const settings = {
      globalAdvice,
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings 
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}