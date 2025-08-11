import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { securityLogger, getClientIP } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
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
    
    console.log('Upload request - File:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'No file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    if (!allowedTypes.includes(file.type)) {
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
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Additional extension validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}-${randomId}.${fileExtension}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('design-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('design-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      path: data.path,
      url: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    // Generic error message to prevent information disclosure
    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
}