/**
 * Environment utilities for feature flagging
 */

// Check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';

// Check if we're in production mode
export const isProduction = process.env.NODE_ENV === 'production';

// Feature flags
export const FEATURES = {
  // Show all advice tabs (General, Senior Designer, GPT-4o-mini)
  SHOW_ALL_ADVICE_TABS: isDevelopment,
  
  // Show advice voting functionality
  SHOW_ADVICE_VOTING: isDevelopment,
  
  // Generate multiple advice types via API
  GENERATE_MULTIPLE_ADVICE: isDevelopment,
} as const;

// Log feature flags in development
if (isDevelopment) {
  console.log('🔧 Development Features Enabled:', FEATURES);
}