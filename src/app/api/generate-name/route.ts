import { NextRequest, NextResponse } from 'next/server';
import { generateDesignName } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, context, designProblem } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Generate the design name
    const name = await generateDesignName({
      imageUrl,
      context: context || '',
      designProblem: designProblem || '',
    });

    return NextResponse.json({ name });
  } catch (error) {
    console.error('Name generation API error:', error);
    
    // Return a fallback name instead of an error to avoid breaking the flow
    return NextResponse.json({ name: 'Design Entry' });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}