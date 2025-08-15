export const GENERAL_ANALYSIS_PROMPT = {
  // System prompt for general design analysis
  system: (globalSettings?: string) => globalSettings || '',
  
  // User prompt template for general analysis
  user: (context?: string, inquiries?: string) => {
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
    
    return userContext.length > 0 ? userContext.join('\n\n') : '';
  },

  // Version comparison prompt
  versionSystem: (globalSettings?: string) => {
    return globalSettings ? 
      `${globalSettings}\n\nYou are analyzing a new version of a design. Focus on comparing the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.` :
      'You are analyzing a new version of a design. Compare the changes between the previous and current versions, and provide specific, actionable advice based on the improvements or areas that need attention. Always keep the original design problem in mind and assess how well each version addresses that core challenge.';
  },

  versionUser: (context?: string, inquiries?: string, versionNotes?: string, previousAdvice?: string) => {
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
    
    return userContext.join('\n\n');
  }
};