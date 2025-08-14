import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesignVersion, generateSeniorCritiqueVersion, preprocessImage, generatePreprocessedAdvice } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      newImageUrl, 
      previousImageUrl, 
      previousAdvice,
      previousSeniorCritique, 
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

    // First, preprocess the new image to extract structured data
    const preprocessedData = await preprocessImage({ imageUrl: newImageUrl });

    // Generate all three types of analysis for the version
    const [advice, seniorCritique, preprocessedAdvice] = await Promise.all([
      analyzeDesignVersion({
        newImageUrl,
        previousImageUrl,
        previousAdvice: previousAdvice || '',
        context: context || '',
        inquiries: inquiries || '',
        versionNotes: versionNotes || '',
        globalSettings: globalSettings || '',
      }),
      generateSeniorCritiqueVersion({
        newImageUrl,
        previousImageUrl,
        previousAdvice: previousAdvice || '',
        previousSeniorCritique: previousSeniorCritique || '',
        context: context || '',
        inquiries: inquiries || '',
        versionNotes: versionNotes || '',
        globalSettings: globalSettings || '',
      }),
      generatePreprocessedAdvice({
        imageUrl: newImageUrl,
        context: context || '',
        inquiries: inquiries || '',
        globalSettings: globalSettings || '',
        preprocessedData,
      })
    ]);

    return NextResponse.json({ advice, seniorCritique, preprocessedAdvice });
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