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

export interface DesignVersionComparisonRequest {
  newImageUrl: string;
  previousImageUrl: string;
  previousAdvice: string;
  context: string;
  inquiries: string;
  versionNotes: string;
  globalSettings: string;
}

export interface DesignNameGenerationRequest {
  imageUrl: string;
  context: string;
  designProblem: string;
}

export async function analyzeDesign({
  imageUrl,
  context,
  inquiries,
  globalSettings,
}: DesignAnalysisRequest): Promise<string> {
  try {

    console.log(context);
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
    
    // Add formatting instructions
    userContext.push('');
    userContext.push('Focus on providing actionable, specific design advice that addresses any problems mentioned.');
    userContext.push('');
    userContext.push('Please provide your design analysis using proper markdown formatting with:');
    userContext.push('- Clear headings (## for main sections)'); 
    userContext.push('- Bullet points for lists');
    userContext.push('- **Bold** for important points');
    userContext.push('- Keep bullet points concise and readable');
    
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
    console.error('Error details:', JSON.stringify(error, null, 2));
    
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

export async function analyzeDesignVersion({
  newImageUrl,
  previousImageUrl,
  previousAdvice,
  context,
  inquiries,
  versionNotes,
  globalSettings,
}: DesignVersionComparisonRequest): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // Build the system prompt with comparison context
    const systemPrompt = globalSettings ? 
      `${globalSettings}\n\nYou are analyzing a new version of a design. Focus on comparing the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.` :
      'You are analyzing a new version of a design. Compare the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.';

    // Build user context for version comparison
    const userContext = [];
    if (inquiries) {
      userContext.push(`ORIGINAL DESIGN PROBLEM: ${inquiries}`);
      userContext.push('↳ This is the core design challenge that needs to be addressed throughout all versions.');
    }
    if (context) {
      userContext.push(`Original Context: ${context}`);
    }
    if (versionNotes) {
      userContext.push(`Changes Made in This Version: ${versionNotes}`);
    }
    if (previousAdvice) {
      userContext.push(`Previous Design Analysis: ${previousAdvice}`);
    }
    
    userContext.push('Please analyze both designs and provide specific feedback on:');
    userContext.push('1. What improvements have been made since the previous version');
    userContext.push('2. Areas where the design has progressed well');
    userContext.push('3. How well this version addresses the ORIGINAL DESIGN PROBLEM stated above');
    userContext.push('4. New issues or opportunities for improvement in this version');
    userContext.push('5. How well the changes address any issues mentioned in the previous analysis');
    userContext.push('6. Specific actionable recommendations for the next iteration that keep the original design problem in mind');
    userContext.push('');
    userContext.push('Structure your response with clear sections and be specific about visual changes you can observe.');
    userContext.push('');
    userContext.push('Format your response using proper markdown with:');
    userContext.push('- Clear headings (## for main sections)');
    userContext.push('- Bullet points for lists');
    userContext.push('- **Bold** for important points');
    userContext.push('- Keep bullet points concise and on single lines when possible');
    
    const userPrompt = userContext.join('\n\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    // Add system message
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
    
    // Build user message with both images
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];
    
    userContent.push({
      type: 'text',
      text: userPrompt,
    });
    
    userContent.push({
      type: 'text',
      text: 'Previous Design:',
    });
    
    userContent.push({
      type: 'image_url',
      image_url: {
        url: previousImageUrl,
        detail: 'high',
      },
    });
    
    userContent.push({
      type: 'text',
      text: 'New Design Version:',
    });
    
    userContent.push({
      type: 'image_url',
      image_url: {
        url: newImageUrl,
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

    return response.choices[0]?.message?.content || 'Unable to analyze the design versions. Please try again.';
  } catch (error) {
    console.error('OpenAI API error in version comparison:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    if (error instanceof Error) {
      // More specific error handling (same as original function)
      if (error.message.includes('401') || error.message.includes('API key') || error.message.includes('Unauthorized')) {
        throw new Error('Invalid OpenAI API key. Please check your API key in .env.local file.');
      }
      
      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      }
      
      if (error.message.includes('400') || error.message.includes('Bad Request')) {
        throw new Error('Invalid request to OpenAI API. The images may be too large or in an unsupported format.');
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
    
    throw new Error('Failed to analyze design versions with AI. Please try again or check your API configuration.');
  }
}

export async function generateDesignName({
  imageUrl,
  context,
  designProblem,
}: DesignNameGenerationRequest): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // Build the prompt for name generation
    const userContext = [];
    userContext.push('Generate a concise, descriptive name for this design based on the image.');
    
    if (context) {
      userContext.push(`Context: ${context}`);
    }
    if (designProblem) {
      userContext.push(`Design Problem: ${designProblem}`);
    }
    
    userContext.push('Requirements:');
    userContext.push('- Keep it under 6 words');
    userContext.push('- Make it descriptive and memorable');
    userContext.push('- Focus on the main purpose or key visual element');
    userContext.push('- Avoid generic names like "Design" or "Image"');
    userContext.push('- Return ONLY the name, no additional text');
    
    const userPrompt = userContext.join('\n\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    messages.push({
      role: 'system',
      content: 'You are an expert at creating concise, descriptive names for design projects. Generate a short, memorable name based on what you see in the image and the provided context.',
    });
    
    // Build user message with image
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];
    
    userContent.push({
      type: 'text',
      text: userPrompt,
    });
    
    userContent.push({
      type: 'image_url',
      image_url: {
        url: imageUrl,
        detail: 'high', // Use high detail for all image analysis
      },
    });
    
    messages.push({
      role: 'user',
      content: userContent,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 50, // Short response for just the name
      temperature: 0.8, // Higher temperature for more creative names
    });

    const generatedName = response.choices[0]?.message?.content?.trim();
    
    // Fallback to a generic name if generation fails
    return generatedName || 'Design Entry';
  } catch (error) {
    console.error('OpenAI API error in name generation:', error);
    
    // Return a fallback name instead of throwing
    return 'Design Entry';
  }
}