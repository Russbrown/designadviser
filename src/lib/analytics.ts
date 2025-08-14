import posthog from 'posthog-js'

export class AnalyticsService {
  static isInitialized = false;

  static init() {
    if (typeof window !== 'undefined' && !this.isInitialized) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
        // Disable web vitals to prevent the warning
        capture_performance: false,
      });
      this.isInitialized = true;
    }
  }

  static trackLogin(userId: string, userEmail?: string) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.identify(userId, {
      email: userEmail,
    });
    posthog.capture('user_login', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      user_agent: window.navigator.userAgent,
    });
  }

  static trackImageUpload(userId: string | null, metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('image_upload', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      file_name: metadata?.fileName,
      file_size: metadata?.fileSize,
      file_type: metadata?.fileType,
    });
  }

  static trackDesignAnalysis(userId: string | null, metadata?: {
    hasContext?: boolean;
    hasInquiries?: boolean;
    analysisLength?: number;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('design_analysis', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      has_context: metadata?.hasContext,
      has_inquiries: metadata?.hasInquiries,
      analysis_length: metadata?.analysisLength,
    });
  }

  static trackVersionCreation(userId: string | null, metadata?: {
    entryId?: string;
    versionNumber?: number;
    hasNotes?: boolean;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('version_created', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      entry_id: metadata?.entryId,
      version_number: metadata?.versionNumber,
      has_notes: metadata?.hasNotes,
      file_name: metadata?.fileName,
      file_size: metadata?.fileSize,
      file_type: metadata?.fileType,
    });
  }

  static trackSettingsUpdate(userId: string | null, metadata?: {
    settingsLength?: number;
    hadPreviousSettings?: boolean;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('global_settings_updated', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      settings_length: metadata?.settingsLength,
      had_previous_settings: metadata?.hadPreviousSettings,
    });
  }

  static trackAdviceRating(userId: string | null, metadata?: {
    rating?: number;
    hasFeedback?: boolean;
    entryId?: string;
    versionId?: string;
    isUpdate?: boolean;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('advice_rated', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      rating: metadata?.rating,
      has_feedback: metadata?.hasFeedback,
      entry_id: metadata?.entryId,
      version_id: metadata?.versionId,
      is_update: metadata?.isUpdate,
    });
  }

  static trackAdviceVote(userId: string | null, metadata?: {
    preferredAdviceType?: number;
    hasFeedback?: boolean;
    entryId?: string;
    versionId?: string;
    isUpdate?: boolean;
  }) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('advice_voted', {
      user_id: userId,
      timestamp: new Date().toISOString(),
      preferred_advice_type: metadata?.preferredAdviceType,
      has_feedback: metadata?.hasFeedback,
      entry_id: metadata?.entryId,
      version_id: metadata?.versionId,
      is_update: metadata?.isUpdate,
    });
  }

  static trackPageView(path?: string) {
    if (typeof window === 'undefined') return;
    
    this.init();
    posthog.capture('$pageview', {
      $current_url: path || window.location.href,
    });
  }

  static reset() {
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  }
}