import OpenAI from 'openai';

// Initialize OpenAI only if API key is available (not during build time)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface DesignAnalysisRequest {
  imageUrl: string;
  context: string;
  inquiries: string;
  globalSettings: string;
}

export async function analyzeDesign({
  imageUrl,
  context,
  inquiries,
  globalSettings,
}: DesignAnalysisRequest): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    // Use only the globalSettings as the system prompt
    const systemPrompt = globalSettings || '';

    // User context and inquiries only
    const userContext = [];
    if (context) {
      userContext.push(`Context: ${context}`);
    }
    if (inquiries) {
      userContext.push(`Questions: ${inquiries}`);
    }
    
    const userPrompt = userContext.length > 0 ? userContext.join('\n\n') : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    // Only add system message if globalSettings is provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    // Build user message content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];
    if (userPrompt) {
      userContent.push({
        type: 'text',
        text: userPrompt,
      });
    }
    userContent.push({
      type: 'image_url',
      image_url: {
        url: imageUrl,
        detail: 'high',
      },
    });
    
    messages.push({
      role: 'user',
      content: userContent,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to analyze the design. Please try again.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error instanceof Error) {
      // More specific error handling
      if (error.message.includes('401') || error.message.includes('API key') || error.message.includes('Unauthorized')) {
        throw new Error('Invalid OpenAI API key. Please check your API key in .env.local file.');
      }
      
      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      }
      
      if (error.message.includes('400') || error.message.includes('Bad Request')) {
        throw new Error('Invalid request to OpenAI API. The image may be too large or in an unsupported format.');
      }
      
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        throw new Error('OpenAI API is temporarily unavailable. Please try again in a few moments.');
      }
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      // Pass through the original error message if it's descriptive
      if (error.message.length > 10) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
    
    throw new Error('Failed to analyze design with AI. Please try again or check your API configuration.');
  }
}