import OpenAI from 'openai';
import { SENIOR_CRITIQUE_PROMPT } from './prompts/senior-critique';

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

    // Use senior critique prompt for consistent high-quality analysis
    const baseSystemPrompt = SENIOR_CRITIQUE_PROMPT.system;
    const systemPrompt = globalSettings ? 
      `${baseSystemPrompt}\n\nAdditional guidance: ${globalSettings}\n\nYou are analyzing a new version of a design. Focus on comparing the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.` :
      `${baseSystemPrompt}\n\nYou are analyzing a new version of a design. Compare the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.`;

    // Build version comparison prompt
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


export async function generateSeniorCritiqueVersion({
  newImageUrl,
  previousImageUrl,
  previousAdvice,
  previousSeniorCritique,
  context,
  inquiries,
  versionNotes,
  globalSettings,
}: DesignVersionComparisonRequest & { previousSeniorCritique?: string }): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // Use senior critique version comparison prompts
    const systemPrompt = SENIOR_CRITIQUE_PROMPT.versionSystem;
    const userPrompt = SENIOR_CRITIQUE_PROMPT.versionUser(context, inquiries, versionNotes, previousSeniorCritique, globalSettings);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
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
      model: 'gpt-5',
      messages,
      max_completion_tokens: 1500, // GPT-5 uses max_completion_tokens instead of max_tokens
      // GPT-5 only supports default temperature (1), so we omit the temperature parameter
    });

    return response.choices[0]?.message?.content || 'Unable to generate senior designer critique for this version. Please try again.';
  } catch (error) {
    console.error('OpenAI API error in senior critique version comparison:', error);
    
    if (error instanceof Error) {
      // Same error handling as other functions
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
    
    throw new Error('Failed to generate senior designer critique for version. Please try again or check your API configuration.');
  }
}


export async function generateGPT5Advice({
  imageUrl,
  context,
  inquiries,
  globalSettings,
}: DesignAnalysisRequest): Promise<string> {
  const startTime = Date.now();
  console.log('🤖 [GPT5_ADVICE] Starting GPT-5 advice generation');
  
  try {
    // Check if OpenAI is available
    if (!openai) {
      console.error('❌ [GPT5_ADVICE] OpenAI client not available - missing API key');
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    
    console.log('📋 [GPT5_ADVICE] Request parameters:', {
      imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'null',
      imageUrlFull: imageUrl, // Log full URL to check format
      contextLength: context?.length || 0,
      inquiriesLength: inquiries?.length || 0,
      globalSettingsLength: globalSettings?.length || 0
    });
    
    // Validate image URL format and test accessibility
    if (imageUrl) {
      const isValidUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
      const isSupabaseUrl = imageUrl.includes('supabase');
      console.log('🔍 [GPT5_ADVICE] Image URL validation:', {
        isValidUrl,
        isSupabaseUrl,
        urlLength: imageUrl.length
      });
      
      // Test if URL is accessible
      try {
        console.log('🌐 [GPT5_ADVICE] Testing image URL accessibility...');
        const headResponse = await fetch(imageUrl, { method: 'HEAD' });
        console.log('📡 [GPT5_ADVICE] URL accessibility test:', {
          status: headResponse.status,
          statusText: headResponse.statusText,
          contentType: headResponse.headers.get('content-type'),
          contentLength: headResponse.headers.get('content-length'),
          cacheControl: headResponse.headers.get('cache-control'),
          accessible: headResponse.ok
        });
        
        if (!headResponse.ok) {
          console.error('⚠️ [GPT5_ADVICE] Image URL is not publicly accessible!', {
            status: headResponse.status,
            statusText: headResponse.statusText
          });
          
          // This might be the root cause of the OpenAI API error
          console.error('🔴 [GPT5_ADVICE] This is likely why OpenAI API fails - the image URL is not accessible to external services!');
        }
      } catch (urlError) {
        console.error('💥 [GPT5_ADVICE] Failed to test URL accessibility:', urlError);
      }
    }

    // Use the professional senior critique prompt system
    const systemPrompt = SENIOR_CRITIQUE_PROMPT.system;
    const userPrompt = SENIOR_CRITIQUE_PROMPT.user(context, inquiries, globalSettings);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
    
    // Build user message content
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
        detail: 'high',
      },
    });
    
    messages.push({
      role: 'user',
      content: userContent,
    });

    console.log('🚀 [GPT5_ADVICE] Calling OpenAI API with model: gpt-4o (debugging)');
    console.log('📋 [GPT5_ADVICE] Request payload:', {
      model: 'gpt-4o',
      messagesCount: messages.length,
      messageStructure: messages.map(msg => ({
        role: msg.role,
        contentType: Array.isArray(msg.content) ? 'array' : 'string',
        contentLength: Array.isArray(msg.content) ? msg.content.length : msg.content?.length
      })),
      max_completion_tokens: 2000,
      temperature: 'default (1) - GPT-5 requirement'
    });
    
    const apiCallStart = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Temporarily using working model to debug the issue
      messages,
      max_tokens: 2000, // Back to standard parameter for gpt-4o
      temperature: 0.7, // gpt-4o supports temperature
    });
    
    const apiCallTime = Date.now() - apiCallStart;
    const totalTime = Date.now() - startTime;
    
    const result = response.choices[0]?.message?.content || 'Unable to generate product design advice. Please try again.';
    
    console.log('✅ [GPT5_ADVICE] API call completed successfully:', {
      apiCallTime: `${apiCallTime}ms`,
      totalTime: `${totalTime}ms`,
      responseLength: result.length,
      tokensUsed: response.usage ? `${response.usage.total_tokens} total (${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion)` : 'unknown'
    });

    return result;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [GPT5_ADVICE] API call failed after ${totalTime}ms:`, error);
    
    // Detailed error logging for debugging
    if (error && typeof error === 'object') {
      console.error('🔍 [GPT5_ADVICE] Detailed error analysis:', {
        message: error.message || 'No message',
        status: error.status || 'No status',
        code: error.code || 'No code',
        type: error.type || 'No type',
        error: error.error || 'No error field',
        stack: error.stack || 'No stack'
      });
      
      // Check if it's a specific model error
      if (error.message && error.message.includes('model')) {
        console.error('🤔 [GPT5_ADVICE] Model error detected. Current model: gpt-5');
        console.error('💡 [GPT5_ADVICE] Try checking if gpt-5 model is available in your OpenAI account');
      }
      
      // Check if it's an image format error  
      if (error.message && (error.message.includes('image') || error.message.includes('format'))) {
        console.error('🖼️ [GPT5_ADVICE] Image format error detected');
      }

      // Check for parameter errors
      if (error.message && (error.message.includes('parameter') || error.message.includes('max_completion_tokens') || error.message.includes('temperature'))) {
        console.error('⚙️ [GPT5_ADVICE] Parameter error detected - GPT-5 API requirements may have changed');
      }
    }
    
    // Don't throw a generic error - throw the specific error for better debugging
    throw error;
  }
}

export async function generateGPT5AdviceVersion({
  newImageUrl,
  previousImageUrl,
  previousAdvice,
  previousGPT5Advice,
  context,
  inquiries,
  versionNotes,
  globalSettings,
}: DesignVersionComparisonRequest & { previousGPT5Advice?: string }): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // GPT-5 specific system prompt for version comparison
    const systemPrompt = `You are an experienced product designer analyzing design iterations. Your role is to provide comprehensive feedback on design evolution, focusing on how changes impact user experience, business goals, and product strategy.

Key principles for version analysis:
- Compare the new version against the previous version systematically
- Evaluate improvements and potential regressions
- Consider user experience implications of changes
- Assess alignment with product and business objectives
- Provide specific, actionable recommendations for further improvements
- Focus on iterative design process and design system consistency

${globalSettings ? `Additional guidance: ${globalSettings}` : ''}

Provide your version comparison analysis in clear markdown format with specific recommendations.`;

    // Build context-aware user prompt for version comparison
    const userContext = [];
    userContext.push('Please analyze this design iteration from a product design perspective, comparing the new version with the previous version.');
    userContext.push('');
    userContext.push('Focus on:');
    userContext.push('- What specific changes were made and their impact');
    userContext.push('- User experience improvements or regressions');
    userContext.push('- Alignment with product strategy and business goals');
    userContext.push('- Design system consistency and scalability');
    userContext.push('- Recommendations for further iterations');
    userContext.push('');
    
    if (context) {
      userContext.push(`Context: ${context}`);
      userContext.push('');
    }
    if (inquiries) {
      userContext.push(`Specific questions: ${inquiries}`);
      userContext.push('');
    }
    if (versionNotes) {
      userContext.push(`Version notes: ${versionNotes}`);
      userContext.push('');
    }
    if (previousGPT5Advice) {
      userContext.push('Previous GPT-5 product design advice:');
      userContext.push('```');
      userContext.push(previousGPT5Advice);
      userContext.push('```');
      userContext.push('');
    }
    
    userContext.push('Please provide comprehensive product design feedback on this version iteration.');
    
    const userPrompt = userContext.join('\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
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
      model: 'gpt-5', // Use GPT-5 specifically
      messages,
      max_tokens: 2000, // More tokens for comprehensive version analysis
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate GPT-5 product design advice for this version. Please try again.';
  } catch (error) {
    console.error('OpenAI API error in GPT-5 version analysis:', error);
    
    if (error instanceof Error) {
      // Same error handling as other functions
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
    
    throw new Error('Failed to generate GPT-5 product design advice for version. Please try again or check your API configuration.');
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
        detail: 'low', // Use low detail for name generation to save costs
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

