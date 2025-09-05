import { NextRequest, NextResponse } from 'next/server';
import { generateGPT5Advice } from '@/lib/openai';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { FEATURES } from '@/lib/environment';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 [ANALYZE] Starting analysis request at', new Date().toISOString());
  
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = rateLimit(rateLimitKey, 10, 60000); // 10 analyses per minute
    
    if (!rateLimitResult.success) {
      console.log('🚫 [ANALYZE] Rate limit exceeded for key:', rateLimitKey);
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
    
    console.log('📋 [ANALYZE] Request parameters:', {
      imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'null',
      contextLength: context?.length || 0,
      inquiriesLength: inquiries?.length || 0,
      globalSettingsLength: globalSettings?.length || 0,
      generateMultipleAdvice: FEATURES.GENERATE_MULTIPLE_ADVICE
    });

    // Input validation and sanitization
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('❌ [ANALYZE] Missing or invalid imageUrl:', imageUrl);
      return NextResponse.json(
        { error: 'Valid image URL is required' },
        { status: 400 }
      );
    }

    const sanitizedContext = typeof context === 'string' ? context.trim().substring(0, 2000) : '';
    const sanitizedInquiries = typeof inquiries === 'string' ? inquiries.trim().substring(0, 2000) : '';
    const sanitizedGlobalSettings = typeof globalSettings === 'string' ? globalSettings.trim().substring(0, 5000) : '';
    
    console.log('✅ [ANALYZE] Input validation passed, sanitized lengths:', {
      context: sanitizedContext.length,
      inquiries: sanitizedInquiries.length,
      globalSettings: sanitizedGlobalSettings.length
    });

    // Optimized: Only generate GPT-5 advice for best performance
    console.log('🚀 [ANALYZE] Generating GPT-5 advice (optimized single call)');
    const analysisStartTime = Date.now();
    
    try {
      // Single GPT-5 call for optimal performance
      const gpt5Advice = await generateGPT5Advice({
        imageUrl,
        context: sanitizedContext,
        inquiries: sanitizedInquiries,
        globalSettings: sanitizedGlobalSettings,
      });

      const analysisTime = Date.now() - analysisStartTime;
      console.log('🎉 [ANALYZE] GPT-5 analysis completed successfully in', analysisTime, 'ms, length:', gpt5Advice.length);
      
      // Return GPT-5 advice as the main advice for optimal UX
      return NextResponse.json({ 
        advice: gpt5Advice, // GPT-5 advice becomes the main advice
        seniorCritique: null, // Removed to optimize performance
        gpt5Advice: gpt5Advice, // Also available as gpt5Advice for compatibility
        miniAdvice: null 
      });
    } catch (error) {
      const analysisTime = Date.now() - analysisStartTime;
      console.error('💥 [ANALYZE] GPT-5 analysis failed after', analysisTime, 'ms:', error);
      throw error; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('💥 [ANALYZE] Request failed after', totalTime, 'ms');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    // Sanitize error message to prevent information disclosure
    const errorMessage = error instanceof Error && error.message.length < 200
      ? error.message 
      : 'Failed to analyze design. Please try again.';

    // In development, include more debug info
    const debugInfo = process.env.NODE_ENV === 'development' ? {
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
    } : undefined;

    return NextResponse.json(
      { 
        error: errorMessage,
        debug: debugInfo
      },
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