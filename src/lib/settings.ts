export interface Settings {
  globalAdvice: string;
  lastUpdated: string;
}

const STORAGE_KEY = 'design-adviser-settings';

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  globalAdvice: `Company: [Your Company Name]
Brand Guidelines: 
- Primary colors: 
- Typography: 
- Design principles: 

Industry: 
Target Audience: 
Design Style Preferences: 

Focus Areas:
- User Experience
- Accessibility
- Brand Consistency
- Visual Hierarchy
- Conversion Optimization

Additional Context:
`,
  lastUpdated: new Date().toISOString(),
};

// Client-side localStorage utilities
export const settingsStorage = {
  // Save settings to localStorage
  save: (settings: Settings) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn('Failed to save settings to localStorage:', error);
      }
    }
  },

  // Load settings from localStorage
  load: (): Settings | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    }
    return null;
  },

  // Clear localStorage settings
  clear: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear settings from localStorage:', error);
      }
    }
  },
};

// API utilities
export const settingsAPI = {
  // Load settings from server
  load: async (): Promise<Settings> => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to load settings from server:', error);
      // Fallback to localStorage
      const localSettings = settingsStorage.load();
      return localSettings || DEFAULT_SETTINGS;
    }
  },

  // Save settings to server
  save: async (settings: Settings): Promise<void> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Also save to localStorage as backup
      settingsStorage.save(settings);
    } catch (error) {
      console.warn('Failed to save settings to server:', error);
      // Still save to localStorage even if server fails
      settingsStorage.save(settings);
      throw error;
    }
  },
};

// Combined utility for seamless settings management
export const settings = {
  // Load settings with fallback chain: server → localStorage → defaults
  load: async (): Promise<Settings> => {
    try {
      return await settingsAPI.load();
    } catch (error) {
      console.warn('Using default settings due to load failure:', error);
      return DEFAULT_SETTINGS;
    }
  },

  // Save settings with dual persistence (server + localStorage)
  save: async (globalAdvice: string): Promise<void> => {
    const settingsData: Settings = {
      globalAdvice,
      lastUpdated: new Date().toISOString(),
    };

    return await settingsAPI.save(settingsData);
  },
};