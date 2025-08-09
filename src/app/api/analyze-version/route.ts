import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesignVersion } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      newImageUrl, 
      previousImageUrl, 
      previousAdvice, 
      context, 
      inquiries, 
      versionNotes,
      globalSettings 
    } = body;

    // Validate required fields
    if (!newImageUrl || !previousImageUrl) {
      return NextResponse.json(
        { error: 'Both new and previous image URLs are required' },
        { status: 400 }
      );
    }

    // Call OpenAI for version comparison analysis
    const advice = await analyzeDesignVersion({
      newImageUrl,
      previousImageUrl,
      previousAdvice: previousAdvice || '',
      context: context || '',
      inquiries: inquiries || '',
      versionNotes: versionNotes || '',
      globalSettings: globalSettings || '',
    });

    return NextResponse.json({ advice });
  } catch (error) {
    console.error('Version analysis API error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze design version';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}