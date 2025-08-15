import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesignVersion, generateSeniorCritiqueVersion, generateMiniAdviceVersion } from '@/lib/openai';
import { FEATURES } from '@/lib/environment';

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

    if (FEATURES.GENERATE_MULTIPLE_ADVICE) {
      // Development: Generate all three types of analysis for the version
      const [advice, seniorCritique, miniAdvice] = await Promise.all([
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
        generateMiniAdviceVersion({
          newImageUrl,
          previousImageUrl,
          previousAdvice: previousAdvice || '',
          context: context || '',
          inquiries: inquiries || '',
          versionNotes: versionNotes || '',
          globalSettings: globalSettings || '',
        })
      ]);

      return NextResponse.json({ advice, seniorCritique, miniAdvice });
    } else {
      // Production: Only generate general version analysis
      const advice = await analyzeDesignVersion({
        newImageUrl,
        previousImageUrl,
        previousAdvice: previousAdvice || '',
        context: context || '',
        inquiries: inquiries || '',
        versionNotes: versionNotes || '',
        globalSettings: globalSettings || '',
      });

      return NextResponse.json({ 
        advice, 
        seniorCritique: null, 
        miniAdvice: null 
      });
    }
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