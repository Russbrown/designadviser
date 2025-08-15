/**
 * Environment utilities for feature flagging
 * 
 * To enable development features in production, set NEXT_PUBLIC_DEV_FEATURES=true
 * This is useful for testing features on staging or when developing locally
 */

// Check for explicit development feature override
const DEV_FEATURES_ENABLED = process.env.NEXT_PUBLIC_DEV_FEATURES === 'true';

// Check if we're in development mode (server-side only for API routes)
export const isDevelopment = process.env.NODE_ENV === 'development';

// Check if we're in production mode
export const isProduction = process.env.NODE_ENV === 'production';

// Feature flags - Production by default, can be overridden with NEXT_PUBLIC_DEV_FEATURES
export const FEATURES = {
  // Show both advice tabs (General, Senior Designer)
  SHOW_ALL_ADVICE_TABS: true,
  
  // Show advice voting functionality  
  SHOW_ADVICE_VOTING: true,
  
  // Generate multiple advice types via API (server-side only)
  GENERATE_MULTIPLE_ADVICE: true,
} as const;

// Log feature flags for debugging
if (typeof window !== 'undefined') {
  // Client-side logging
  console.log('🎛️ Feature Flags:', {
    SHOW_ALL_ADVICE_TABS: FEATURES.SHOW_ALL_ADVICE_TABS,
    SHOW_ADVICE_VOTING: FEATURES.SHOW_ADVICE_VOTING,
    DEV_FEATURES_ENABLED,
  });
}