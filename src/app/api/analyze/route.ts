import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesign } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, context, inquiries, globalSettings } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Call OpenAI for analysis
    const advice = await analyzeDesign({
      imageUrl,
      context: context || '',
      inquiries: inquiries || '',
      globalSettings: globalSettings || '',
    });

    return NextResponse.json({ advice });
  } catch (error) {
    console.error('Analysis API error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze design';

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