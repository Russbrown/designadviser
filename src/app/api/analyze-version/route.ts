import { NextRequest, NextResponse } from 'next/server';
import { analyzeDesignVersion } from '@/lib/openai';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 [ANALYZE_VERSION] Starting version analysis request at', new Date().toISOString());
  
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = rateLimit(rateLimitKey, 10, 60000); // 10 analyses per minute
    
    if (!rateLimitResult.success) {
      console.log('🚫 [ANALYZE_VERSION] Rate limit exceeded for key:', rateLimitKey);
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
    const { 
      newImageUrl, 
      previousImageUrl, 
      previousAdvice,
      previousSeniorCritique,
      previousGPT5Advice,
      context, 
      inquiries, 
      versionNotes,
      globalSettings 
    } = body;

    console.log('📋 [ANALYZE_VERSION] Request parameters:', {
      newImageUrl: newImageUrl ? `${newImageUrl.substring(0, 50)}...` : 'null',
      previousImageUrl: previousImageUrl ? `${previousImageUrl.substring(0, 50)}...` : 'null',
      contextLength: context?.length || 0,
      inquiriesLength: inquiries?.length || 0,
      versionNotesLength: versionNotes?.length || 0,
      globalSettingsLength: globalSettings?.length || 0
    });

    // Input validation and sanitization
    if (!newImageUrl || typeof newImageUrl !== 'string') {
      console.log('❌ [ANALYZE_VERSION] Missing or invalid newImageUrl:', newImageUrl);
      return NextResponse.json(
        { error: 'Valid new image URL is required' },
        { status: 400 }
      );
    }

    if (!previousImageUrl || typeof previousImageUrl !== 'string') {
      console.log('❌ [ANALYZE_VERSION] Missing or invalid previousImageUrl:', previousImageUrl);
      return NextResponse.json(
        { error: 'Valid previous image URL is required' },
        { status: 400 }
      );
    }

    const sanitizedContext = typeof context === 'string' ? context.trim().substring(0, 2000) : '';
    const sanitizedInquiries = typeof inquiries === 'string' ? inquiries.trim().substring(0, 2000) : '';
    const sanitizedVersionNotes = typeof versionNotes === 'string' ? versionNotes.trim().substring(0, 2000) : '';
    const sanitizedGlobalSettings = typeof globalSettings === 'string' ? globalSettings.trim().substring(0, 5000) : '';
    const sanitizedPreviousAdvice = typeof previousAdvice === 'string' ? previousAdvice.trim().substring(0, 5000) : '';
    
    console.log('✅ [ANALYZE_VERSION] Input validation passed, sanitized lengths:', {
      context: sanitizedContext.length,
      inquiries: sanitizedInquiries.length,
      versionNotes: sanitizedVersionNotes.length,
      globalSettings: sanitizedGlobalSettings.length,
      previousAdvice: sanitizedPreviousAdvice.length
    });

    // Use the same working approach as main analyze endpoint - single call using senior critique prompt
    console.log('🚀 [ANALYZE_VERSION] Generating version comparison advice (single optimized call)');
    const analysisStartTime = Date.now();
    
    try {
      // Single call using the senior critique approach for consistency
      const advice = await analyzeDesignVersion({
        newImageUrl,
        previousImageUrl,
        previousAdvice: sanitizedPreviousAdvice,
        context: sanitizedContext,
        inquiries: sanitizedInquiries,
        versionNotes: sanitizedVersionNotes,
        globalSettings: sanitizedGlobalSettings,
      });

      const analysisTime = Date.now() - analysisStartTime;
      console.log('🎉 [ANALYZE_VERSION] Version analysis completed successfully in', analysisTime, 'ms, length:', advice.length);
      
      // Return consistent format with main analyze endpoint
      return NextResponse.json({ 
        advice: advice, // Senior critique advice becomes the main advice
        seniorCritique: null, // Removed to optimize performance  
        gpt5Advice: advice, // Also available as gpt5Advice for compatibility
        miniAdvice: null 
      });
    } catch (error) {
      const analysisTime = Date.now() - analysisStartTime;
      console.error('💥 [ANALYZE_VERSION] Version analysis failed after', analysisTime, 'ms:', error);
      throw error; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('💥 [ANALYZE_VERSION] Request failed after', totalTime, 'ms');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    // Sanitize error message to prevent information disclosure
    const errorMessage = error instanceof Error && error.message.length < 200
      ? error.message 
      : 'Failed to analyze design version. Please try again.';

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