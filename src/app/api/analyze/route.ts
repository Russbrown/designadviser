import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesign, generateSeniorCritique, generateMiniAdvice } from '@/lib/openai';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { FEATURES } from '@/lib/environment';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = rateLimit(rateLimitKey, 10, 60000); // 10 analyses per minute
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many analysis requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          }
        }
      );
    }

    const body = await request.json();
    const { imageUrl, context, inquiries, globalSettings } = body;

    // Input validation and sanitization
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Valid image URL is required' },
        { status: 400 }
      );
    }

    const sanitizedContext = typeof context === 'string' ? context.trim().substring(0, 2000) : '';
    const sanitizedInquiries = typeof inquiries === 'string' ? inquiries.trim().substring(0, 2000) : '';
    const sanitizedGlobalSettings = typeof globalSettings === 'string' ? globalSettings.trim().substring(0, 5000) : '';

    if (FEATURES.GENERATE_MULTIPLE_ADVICE) {
      // Development: Generate all three types of analysis
      const [advice, seniorCritique, miniAdvice] = await Promise.all([
        analyzeDesign({
          imageUrl,
          context: sanitizedContext,
          inquiries: sanitizedInquiries,
          globalSettings: sanitizedGlobalSettings,
        }),
        generateSeniorCritique({
          imageUrl,
          context: sanitizedContext,
          inquiries: sanitizedInquiries,
          globalSettings: sanitizedGlobalSettings,
        }),
        generateMiniAdvice({
          imageUrl,
          context: sanitizedContext,
          inquiries: sanitizedInquiries,
          globalSettings: sanitizedGlobalSettings,
        })
      ]);

      return NextResponse.json({ advice, seniorCritique, miniAdvice });
    } else {
      // Production: Only generate general advice
      const advice = await analyzeDesign({
        imageUrl,
        context: sanitizedContext,
        inquiries: sanitizedInquiries,
        globalSettings: sanitizedGlobalSettings,
      });

      return NextResponse.json({ 
        advice, 
        seniorCritique: null, 
        miniAdvice: null 
      });
    }
  } catch (error) {
    console.error('Analysis API error:', error);
    
    // Sanitize error message to prevent information disclosure
    const errorMessage = error instanceof Error && error.message.length < 200
      ? error.message 
      : 'Failed to analyze design. Please try again.';

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