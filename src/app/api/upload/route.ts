import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { securityLogger, getClientIP } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('📤 [UPLOAD] Starting file upload request at', new Date().toISOString());
  
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = rateLimit(rateLimitKey, 5, 60000); // 5 uploads per minute
    
    if (!rateLimitResult.success) {
      securityLogger.log({
        type: 'rate_limit_exceeded',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: { endpoint: '/api/upload', limit: rateLimitResult.limit }
      });

      return NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
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

    // Verify user authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Allow anonymous uploads but log them for security monitoring
    if (authError && !user) {
      console.warn('Anonymous upload attempt from IP:', getClientIP(request));
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('📋 [UPLOAD] File details:', file ? {
      name: file.name,
      size: `${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    } : 'No file provided');
    
    if (!file) {
      console.log('❌ [UPLOAD] No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    
    console.log('✅ [UPLOAD] Starting file validation:', {
      fileType: file.type,
      fileSize: file.size,
      maxSize: maxSize,
      allowedTypes: allowedTypes
    });

    if (!allowedTypes.includes(file.type)) {
      console.log('❌ [UPLOAD] Invalid file type:', file.type, 'Allowed:', allowedTypes);
      securityLogger.log({
        type: 'invalid_file_upload',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: { fileType: file.type, fileName: file.name }
      });

      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      console.log('❌ [UPLOAD] File too large:', {
        fileSize: file.size,
        maxSize: maxSize,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(2)
      });
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Additional extension validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      console.log('❌ [UPLOAD] Invalid file extension:', fileExtension, 'Allowed:', allowedExtensions);
      return NextResponse.json(
        { error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.' },
        { status: 400 }
      );
    }
    
    console.log('✅ [UPLOAD] File validation passed');

    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}-${randomId}.${fileExtension}`;
    
    console.log('🚀 [UPLOAD] Starting Supabase storage upload:', {
      fileName: fileName,
      bucket: 'design-images'
    });
    
    const uploadStart = Date.now();
    
    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('design-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      const uploadTime = Date.now() - uploadStart;
      console.error('💥 [UPLOAD] Supabase storage error after', uploadTime, 'ms:', error);
      throw error;
    }
    
    const uploadTime = Date.now() - uploadStart;
    console.log('✅ [UPLOAD] Supabase upload successful in', uploadTime, 'ms:', data.path);

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('design-images')
      .getPublicUrl(fileName);
      
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 [UPLOAD] Upload process completed successfully in', totalTime, 'ms:', {
      path: data.path,
      url: publicUrlData.publicUrl
    });

    return NextResponse.json({
      path: data.path,
      url: publicUrlData.publicUrl
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [UPLOAD] Upload failed after ${totalTime}ms:`, error);
    
    // Detailed error logging for debugging
    if (error && typeof error === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any;
      console.error('Detailed error info:', {
        message: errorObj.message || 'No message',
        status: errorObj.status || 'No status', 
        statusText: errorObj.statusText || 'No statusText',
        code: errorObj.code || 'No code',
        stack: errorObj.stack || 'No stack'
      });
    }
    
    // In development, include more debug info
    const debugInfo = process.env.NODE_ENV === 'development' ? {
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
    } : undefined;

    // Generic error message to prevent information disclosure
    return NextResponse.json(
      { 
        error: 'Failed to upload file. Please try again.',
        debug: debugInfo
      },
      { status: 500 }
    );
  }
}