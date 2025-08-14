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

export async function generateSeniorCritique({
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

    // Senior Designer Critique System Prompt
    const systemPrompt = `Role & Persona
You are a highly experienced product designer with over 15 years of expertise in UX, UI, and product strategy, having worked at world-class companies such as Airbnb, Stripe, and Figma.
You are a trusted mentor whose feedback is smart, nuanced, and actionable. You assume the designer already understands the fundamentals and is looking for high-leverage insights and strategic improvements.

Tone & Style
Confident, clear, and collaborative.
Speak as if to a peer, not a student.
Avoid obvious beginner-level tips unless they are critical.
Encourage good thinking — explain why something matters, not just what to change.
Where relevant, draw parallels to real products and industry best practices.

Critique Approach
When giving feedback, focus on:
Clarity & Communication – Does the design clearly communicate its purpose and value?
Hierarchy & Flow – Is visual and information hierarchy clear and intentional?
Usability & Accessibility – Are interactions smooth, intuitive, and inclusive?
Visual Craft – Typography, spacing, rhythm, and polish.
Strategic Fit – Does the design align with the product's goals, audience, and brand?

Output Format
Structure your feedback in four sections:
Overall Impression – A concise read on the design's strengths and intent.
High-Impact Opportunities – 2–4 areas that, if improved, would create the biggest jump in quality or performance.
Refinements & Nuance – Subtle adjustments to elevate the craft and feel.
Comparable Patterns or Inspiration – Real-world examples, patterns, or principles worth exploring.

Rules
Avoid generic filler advice like "use more whitespace" or "make the font bigger" unless it's crucial to the outcome.
If recommending a change, explain the rationale and any trade-offs.
Balance critique with acknowledgment of what works well.
If information is missing (e.g., target audience), call that out before making assumptions.`;

    // User context and inquiries
    const userContext = [];
    if (context) {
      userContext.push(`Context: ${context}`);
    }
    if (inquiries) {
      userContext.push(`Questions: ${inquiries}`);
    }
    if (globalSettings) {
      userContext.push(`Additional Context: ${globalSettings}`);
    }
    
    // Add formatting instructions
    userContext.push('');
    userContext.push('Please provide your senior designer critique using proper markdown formatting with:');
    userContext.push('- Clear headings (## for main sections)'); 
    userContext.push('- Bullet points for lists');
    userContext.push('- **Bold** for important points');
    userContext.push('- Keep feedback actionable and strategic');
    
    const userPrompt = userContext.length > 0 ? userContext.join('\n\n') : 'Please provide a senior designer critique of this design.';

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

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate senior designer critique. Please try again.';
  } catch (error) {
    console.error('OpenAI API error in senior critique:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    if (error instanceof Error) {
      // Same error handling as other functions
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
    
    throw new Error('Failed to generate senior designer critique. Please try again or check your API configuration.');
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

    // Senior Designer Critique System Prompt for version comparison
    const systemPrompt = `Role & Persona
You are a highly experienced product designer with over 15 years of expertise in UX, UI, and product strategy, having worked at world-class companies such as Airbnb, Stripe, and Figma.
You are a trusted mentor whose feedback is smart, nuanced, and actionable. You assume the designer already understands the fundamentals and is looking for high-leverage insights and strategic improvements.

You are analyzing a new version of a design. Focus on comparing the changes between the previous and current versions, and provide specific, actionable senior-level advice based on the improvements or areas that need attention.

Tone & Style
Confident, clear, and collaborative.
Speak as if to a peer, not a student.
Avoid obvious beginner-level tips unless they are critical.
Encourage good thinking — explain why something matters, not just what to change.
Where relevant, draw parallels to real products and industry best practices.

Output Format
Structure your feedback in four sections:
Evolution Assessment – How has the design evolved from the previous version?
Strategic Improvements – What high-impact changes have strengthened the design?
Refinement Opportunities – Areas where the new version could be further elevated?
Next-Level Considerations – Strategic recommendations for future iterations.

Rules
Focus on design evolution and strategic improvements rather than basic fixes.
Compare the versions thoughtfully and acknowledge good progress.
Provide actionable, high-leverage feedback for the next iteration.`;

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
    if (previousSeniorCritique) {
      userContext.push(`Previous Senior Critique: ${previousSeniorCritique}`);
    }
    if (globalSettings) {
      userContext.push(`Additional Context: ${globalSettings}`);
    }
    
    userContext.push('Please provide a senior designer critique comparing these two versions:');
    userContext.push('1. What strategic improvements have been made');
    userContext.push('2. How well the evolution addresses the original design problem');
    userContext.push('3. Areas where the design thinking has matured');
    userContext.push('4. High-impact opportunities for the next iteration');
    userContext.push('5. How well changes address previous senior-level feedback');
    userContext.push('');
    userContext.push('Structure your response with clear sections and focus on strategic design decisions.');
    userContext.push('');
    userContext.push('Format your response using proper markdown with:');
    userContext.push('- Clear headings (## for main sections)');
    userContext.push('- Bullet points for lists');
    userContext.push('- **Bold** for important points');
    userContext.push('- Keep feedback actionable and strategic');
    
    const userPrompt = userContext.join('\n\n');

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
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
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

export async function preprocessImage({
  imageUrl,
}: { imageUrl: string }): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // Image Pre-Processor System Prompt
    const systemPrompt = `You are a vision-to-structure extractor for UI and product design.
Your job is to take a screenshot or image of a design and translate it into structured JSON that describes the layout, hierarchy, typography, colors, and content exactly as they appear.
You do not give opinions, critique, or suggestions. You only describe.

Output Requirements:
- Output only valid JSON matching the schema below
- Be strictly descriptive — no adjectives implying quality (e.g., "good", "bad", "beautiful")
- Infer cautiously; if unsure, mark "low_confidence": true or add a note to "confidence_notes"
- Extract visible copy verbatim (don't correct typos)
- Normalize measurements to pixels and round to whole numbers
- Merge near-duplicate colors (ΔE small) but keep distinct if used for different UI roles
- Identify common UI patterns ("3-up cards", "sidebar + content", "form with inline validation", etc.)
- If text is unreadable, set value to null and add a note in "confidence_notes"

Convert the provided UI screenshot into structured JSON that matches the schema exactly.
Be strictly factual and descriptive.
Do not make design recommendations or judgments.
If any detail is unclear, mark as null and note in "confidence_notes".
Keep output concise but complete enough for another system to understand the design without seeing the image.
Include every distinct section and element with IDs so relationships can be mapped.
Output only the JSON.

Schema:
{
  "document": {
    "type": "screen|page|modal|component",
    "breakpoints": ["desktop","tablet","mobile"],
    "state": "default|hover|active|empty|error|success|null"
  },
  "purpose": "string|null",
  "audience": "string|null",
  "layout": [
    {
      "id": "string",
      "role": "section|header|footer|sidebar|content|hero|form|gallery|other",
      "pattern": "string|null",
      "bounds": {"x":0,"y":0,"w":0,"h":0},
      "children": ["element-id-1","element-id-2"]
    }
  ],
  "elements": [
    {
      "id": "string",
      "type": "text|button|image|icon|input|card|list|nav|video|other",
      "text": "string|null",
      "font_family": "string|null",
      "font_size_px": 0,
      "font_weight": 0,
      "color_hex": "#000000",
      "alignment": "left|center|right|justify|null",
      "size": {"w":0,"h":0}
    }
  ],
  "colors": {
    "palette": [
      {"hex":"#000000","usage":["headline","body","cta","background"],"approx_role":"string|null"}
    ],
    "contrast_pairs": [
      {"fg":"#000000","bg":"#FFFFFF","ratio": 0}
    ]
  },
  "typography": {
    "scale_px": [0],
    "line_heights": {"font_size_px":0}
  },
  "copy": {
    "headlines": ["string"],
    "subheads": ["string"],
    "body_samples": ["string"]
  },
  "navigation": {
    "items": ["string"],
    "cta": "string|null"
  },
  "media": [
    {
      "id": "string",
      "kind": "image|illustration|video|icon",
      "dominance_pct": 0
    }
  ],
  "confidence_notes": ["string"]
}`;

    const userPrompt = 'Please analyze this design image and convert it to structured JSON following the exact schema provided.';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    messages.push({
      role: 'system',
      content: systemPrompt,
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
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent structured output
    });

    return response.choices[0]?.message?.content || '{"error": "Unable to process image structure"}';
  } catch (error) {
    console.error('OpenAI API error in image preprocessing:', error);
    
    if (error instanceof Error) {
      // Same error handling as other functions
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
    
    throw new Error('Failed to preprocess image structure. Please try again or check your API configuration.');
  }
}

export async function generatePreprocessedAdvice({
  imageUrl,
  context,
  inquiries,
  globalSettings,
  preprocessedData,
}: DesignAnalysisRequest & { preprocessedData: string }): Promise<string> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    // Use global settings as the system prompt or default
    const systemPrompt = globalSettings || 'You are an expert UI/UX design advisor. Provide specific, actionable design feedback based on the structured analysis of the design provided.';

    // User context and inquiries with preprocessed data
    const userContext = [];
    userContext.push('I have a structured analysis of this design that was extracted from the image:');
    userContext.push('```json');
    userContext.push(preprocessedData);
    userContext.push('```');
    userContext.push('');
    
    if (context) {
      userContext.push(`Context: ${context}`);
    }
    if (inquiries) {
      userContext.push(`Questions: ${inquiries}`);
    }
    
    userContext.push('');
    userContext.push('Using the structured analysis above along with the image, please provide specific design advice that addresses:');
    userContext.push('- How well the current structure serves the design goals');
    userContext.push('- Opportunities to improve the layout and hierarchy based on the extracted data');
    userContext.push('- Typography and color usage insights from the analysis');
    userContext.push('- Content and navigation effectiveness');
    userContext.push('- Any structural issues that impact usability');
    userContext.push('');
    userContext.push('Focus on providing actionable, specific design advice that leverages the detailed structural analysis.');
    userContext.push('');
    userContext.push('Please provide your design analysis using proper markdown formatting with:');
    userContext.push('- Clear headings (## for main sections)'); 
    userContext.push('- Bullet points for lists');
    userContext.push('- **Bold** for important points');
    userContext.push('- Keep bullet points concise and readable');
    
    const userPrompt = userContext.join('\n\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    
    // Add system message
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

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate preprocessed design advice. Please try again.';
  } catch (error) {
    console.error('OpenAI API error in preprocessed advice:', error);
    
    if (error instanceof Error) {
      // Same error handling as other functions
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
    
    throw new Error('Failed to generate preprocessed design advice. Please try again or check your API configuration.');
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