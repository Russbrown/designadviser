'use client';

import { useState, useCallback, useEffect } from 'react';
import { DesignEntry } from '@/types';
import { ImageUpload } from '@/components/ui/image-upload';
import { AdviceForm } from '@/components/ui/advice-form';
import { Timeline } from '@/components/ui/timeline';
import { DesignViewer } from '@/components/ui/design-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VersionCreationDialog } from '@/components/ui/version-creation-dialog';
import { UserMenu } from '@/components/ui/user-menu';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { SettingsModal } from '@/components/ui/settings-modal';
import { useAuth } from '@/contexts/auth-context';
import { Settings } from 'lucide-react';
import { ErrorHandler } from '@/components/error-handler';
import { AnalyticsService } from '@/lib/analytics';
import { FEATURES } from '@/lib/environment';

// Real OpenAI-powered design analysis
const generateAdvice = async (imageUrl: string, context: string, inquiries: string, globalSettings: string): Promise<{ advice: string; seniorCritique: string | null; gpt5Advice: string | null; miniAdvice: string | null }> => {
  const startTime = Date.now();
  console.log('🔍 [GENERATE_ADVICE] Starting analysis request:', {
    imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'null',
    imageUrlFull: imageUrl, // Show full URL for debugging
    contextLength: context?.length || 0,
    inquiriesLength: inquiries?.length || 0,
    globalSettingsLength: globalSettings?.length || 0
  });

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        context,
        inquiries,
        globalSettings,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`💥 [GENERATE_ADVICE] API call failed after ${responseTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error || 'No error message',
        debug: errorData.debug || 'No debug info'
      });
      
      if (errorData.debug) {
        console.error('🔍 [DEBUG] Server debug info:', errorData.debug);
      }
      
      throw new Error(errorData.error || 'Failed to analyze design');
    }

    const data = await response.json();
    
    console.log(`✅ [GENERATE_ADVICE] GPT-5 API call successful in ${responseTime}ms:`, {
      hasAdvice: !!data.advice,
      adviceLength: data.advice?.length || 0
    });
    
    return { 
      advice: data.advice, 
      seniorCritique: data.seniorCritique || null,
      gpt5Advice: data.gpt5Advice || null,
      miniAdvice: data.miniAdvice || null 
    };
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`💥 [GENERATE_ADVICE] Request failed after ${errorTime}ms:`, error);
    
    // Re-throw the error to be handled by the component
    throw error;
  }
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<DesignEntry[]>([]);
  const [globalSettings, setGlobalSettings] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DesignEntry | null>(null);
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVersionAnalyzing, setIsVersionAnalyzing] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Version creation state
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionTargetEntry, setVersionTargetEntry] = useState<DesignEntry | null>(null);

  // Track pageview on mount
  useEffect(() => {
    AnalyticsService.trackPageView();
  }, []);

  // Load entries and settings from database on mount
  useEffect(() => {
    const loadData = async () => {
      // Wait for auth to be ready
      if (authLoading) return;
      
      try {
        // Load entries - server now handles user filtering securely
        const entriesUrl = user?.id ? `/api/entries?user_id=${user.id}` : '/api/entries';
        const entriesResponse = await fetch(entriesUrl);
        if (entriesResponse.ok) {
          const data = await entriesResponse.json();
          
          console.log('Loaded entries from API:', data.map((entry: DesignEntry) => ({
            id: entry.id,
            versionsCount: entry.design_versions?.length || 0,
            versions: entry.design_versions?.map((v) => ({ 
              id: v.id, 
              version_number: v.version_number 
            })) || []
          })));
          setEntries(data);
        }

        // Load settings
        const settingsUrl = user?.id ? `/api/settings?user_id=${user.id}` : '/api/settings';
        const settingsResponse = await fetch(settingsUrl);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          console.log('Loaded settings from API:', settingsData);
          setGlobalSettings(settingsData.globalAdvice || '');
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authLoading, user?.id]);


  const handleImageUpload = useCallback((file: File) => {
    setCurrentImage(file);
    setError(null); // Clear any previous errors when new image is uploaded
  }, []);

  const handleAdviceSubmit = useCallback(async (designProblem: string) => {
    if (!currentImage) return;
    
    // Require authentication for uploads
    if (!user) {
      setError('Please sign in to upload designs and get AI advice');
      return;
    }

    console.log('🚀 [CLIENT] Starting design analysis process:', {
      fileName: currentImage.name,
      fileSize: currentImage.size,
      fileType: currentImage.type,
      designProblem: designProblem ? designProblem.substring(0, 50) + '...' : 'None',
      userId: user.id
    });

    setIsAnalyzing(true);
    setError(null); // Clear any previous errors
    
    const uploadStartTime = Date.now();
    
    try {
      // First upload the image to Supabase storage
      console.log('📤 [CLIENT] Starting file upload to Supabase...');
      const formData = new FormData();
      formData.append('file', currentImage);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadTime = Date.now() - uploadStartTime;
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`💥 [CLIENT] Upload failed after ${uploadTime}ms:`, {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorData.error || 'No error message',
          debug: errorData.debug || 'No debug info'
        });
        
        if (errorData.debug) {
          console.error('🔍 [DEBUG] Upload server debug info:', errorData.debug);
        }
        
        throw new Error(`Failed to upload image: ${uploadResponse.status} ${errorData.error || uploadResponse.statusText}`);
      }
      
      const { url: imageUrl, path: imagePath } = await uploadResponse.json();
      console.log(`✅ [CLIENT] Upload successful in ${uploadTime}ms:`, {
        imageUrl: imageUrl.substring(0, 50) + '...',
        imagePath
      });
      
      // Track image upload event
      AnalyticsService.trackImageUpload(user?.id || null, {
        fileName: currentImage.name,
        fileSize: currentImage.size,
        fileType: currentImage.type
      });
      
      // Generate a design name using AI
      const nameResponse = await fetch('/api/generate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          context: '', // No separate context field anymore
          designProblem,
        }),
      });
      
      let generatedName = 'Design Entry'; // Fallback name
      if (nameResponse.ok) {
        const nameData = await nameResponse.json();
        generatedName = nameData.name || 'Design Entry';
      }
      
      // Use design problem as both context and inquiries 
      const inquiries = designProblem || '';
      
      console.log('🧠 [CLIENT] Starting AI analysis...');
      const analysisStartTime = Date.now();
      
      // Generate advice using OpenAI API - this will throw if it fails
      const { advice, seniorCritique, gpt5Advice, miniAdvice } = await generateAdvice(imageUrl, '', inquiries, globalSettings);
      
      const analysisTime = Date.now() - analysisStartTime;
      console.log(`✅ [CLIENT] GPT-5 analysis completed in ${analysisTime}ms:`, {
        adviceLength: advice.length
      });
      
      // Track design analysis completion
      AnalyticsService.trackDesignAnalysis(user?.id || null, {
        hasContext: false,
        hasInquiries: !!inquiries,
        analysisLength: advice.length
      });

      // Save entry to database
      console.log('💾 [CLIENT] Saving entry to database...');
      const dbSaveStartTime = Date.now();
      
      const entryUrl = `/api/entries?user_id=${user.id}`;
      const entryResponse = await fetch(entryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: generatedName,
          image_url: imageUrl,
          image_path: imagePath,
          context: null, // No separate context field anymore
          inquiries: designProblem || null,
          advice, // Now contains GPT-5 advice from optimized single call
          // Removed senior_critique since we're only using GPT-5 for performance
        }),
      });
      
      const dbSaveTime = Date.now() - dbSaveStartTime;
      
      if (!entryResponse.ok) {
        const errorData = await entryResponse.text();
        console.error(`💥 [CLIENT] Database save failed after ${dbSaveTime}ms:`, {
          status: entryResponse.status,
          statusText: entryResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to save entry: ${entryResponse.status} ${entryResponse.statusText} - ${errorData}`);
      }
      
      console.log(`✅ [CLIENT] Database save successful in ${dbSaveTime}ms`);
      
      const newEntry = await entryResponse.json();
      newEntry.design_versions = [];
      
      setEntries(prev => [newEntry, ...prev]);
      setCurrentImage(null);
      setError(null); // Clear error on success
      
      const totalProcessTime = Date.now() - uploadStartTime;
      console.log(`🎉 [CLIENT] Complete process finished successfully in ${totalProcessTime}ms`);
      
      // Navigate to the newly created entry
      setSelectedEntry(newEntry);
    } catch (error) {
      const totalProcessTime = Date.now() - uploadStartTime;
      console.error(`💥 [CLIENT] Complete process failed after ${totalProcessTime}ms:`, error);
      
      // Set error message to display to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate AI-powered design advice';
      
      setError(errorMessage);
      // Don't clear the image or create an entry - let user retry
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentImage, globalSettings, user]);

  const handleEntrySelect = useCallback((entry: DesignEntry) => {
    console.log('Selecting entry:', {
      entryId: entry.id,
      versionsCount: entry.design_versions?.length || 0,
      versions: entry.design_versions?.map(v => ({ 
        id: v.id, 
        version_number: v.version_number 
      })) || []
    });
    setSelectedEntry(entry);
  }, []);

  const handleBackToTimeline = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  const handleNewVersion = useCallback((entryId: string) => {
    const targetEntry = entries.find(entry => entry.id === entryId);
    if (targetEntry) {
      setVersionTargetEntry(targetEntry);
      setVersionDialogOpen(true);
    }
  }, [entries]);

  const handleVersionCreated = useCallback((entryId: string, newVersion: {
    id: string;
    created_at: string;
    version_number: number;
    image_url: string | null;
    image_path: string | null;
    advice: string;
    entry_id: string;
    notes: string | null;
  }) => {
    // Update entries state
    setEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          design_versions: [...(entry.design_versions || []), newVersion]
        };
      }
      return entry;
    }));
    
    // Also update selectedEntry if it's the same entry being viewed
    setSelectedEntry(prev => {
      if (prev && prev.id === entryId) {
        return {
          ...prev,
          design_versions: [...(prev.design_versions || []), newVersion]
        };
      }
      return prev;
    });
    
    setVersionDialogOpen(false);
    setVersionTargetEntry(null);
  }, []);

  const handleCloseVersionDialog = useCallback(() => {
    setVersionDialogOpen(false);
    setVersionTargetEntry(null);
  }, []);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove entry from state
        setEntries(prev => prev.filter(entry => entry.id !== entryId));
        // Go back to timeline if we're viewing the deleted entry
        setSelectedEntry(prev => prev?.id === entryId ? null : prev);
        console.log('Entry deleted successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete entry:', errorData.error || 'Unknown error');
        setError(`Failed to delete entry: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError('Network error while deleting entry');
    }
  }, []);

  const handleNameUpdate = useCallback((entryId: string, newName: string) => {
    // Update entries state
    setEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        return { ...entry, name: newName };
      }
      return entry;
    }));
    
    // Update selectedEntry if it's the same entry being viewed
    setSelectedEntry(prev => {
      if (prev && prev.id === entryId) {
        return { ...prev, name: newName };
      }
      return prev;
    });
  }, []);

  const handleSettingsChange = useCallback((settings: string) => {
    setGlobalSettings(settings);
  }, []);

  if (selectedEntry) {
    return (
      <div className="container mx-auto py-8 px-4">
        <DesignViewer
          entry={selectedEntry}
          onBack={handleBackToTimeline}
          onNewVersion={handleNewVersion}
          onDelete={handleDeleteEntry}
          onNameUpdate={handleNameUpdate}
        />
        
        {/* Version Creation Dialog - also render in design viewer */}
        {versionTargetEntry && (
          <VersionCreationDialog
            isOpen={versionDialogOpen}
            onClose={handleCloseVersionDialog}
            entry={versionTargetEntry}
            onVersionCreated={handleVersionCreated}
            globalSettings={globalSettings}
            onLoadingChange={setIsVersionAnalyzing}
          />
        )}

        {/* Loading overlay */}
        <LoadingOverlay 
          isVisible={isAnalyzing || isVersionAnalyzing}
          title={isVersionAnalyzing ? "Creating new version..." : "Analyzing your design..."}
          description={isVersionAnalyzing 
            ? "Our AI is analyzing your updated design and generating fresh insights for this version."
            : "Our AI is reviewing your design and preparing personalized feedback. This usually takes 10-20 seconds."
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <ErrorHandler />
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">Design Journal</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="text-xs"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Advice
          </Button>
          <UserMenu />
        </div>
      </div>

      {!user && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-700">
              🔒 <strong>Sign in required</strong> to upload designs and get AI advice. Create an account to save your design entries and access all features.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Design Entry</CardTitle>
            <CardDescription>
              Upload your design and get personalized AI-powered feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={!user ? 'opacity-50 pointer-events-none' : ''}>
              <ImageUpload 
                onImageUpload={handleImageUpload}
                currentImage={currentImage ? URL.createObjectURL(currentImage) : undefined}
                onClear={() => setCurrentImage(null)}
              />
              
              <AdviceForm 
                onSubmit={handleAdviceSubmit}
                isLoading={isAnalyzing}
                hasImage={!!currentImage}
              />
            </div>
            
            {!user && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Sign in to upload your designs and get personalized AI feedback
                </p>
              </div>
            )}
            
            {error && (
              <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive mb-1">AI Analysis Failed</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Unable to generate AI-powered design advice
                    </p>
                    <p className="text-sm text-destructive mb-3">{error}</p>
                    <Button
                      variant="outline"
                      onClick={() => setError(null)}
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your design entries...</p>
            </div>
          </div>
        ) : (
          <Timeline 
            entries={entries}
            onEntrySelect={handleEntrySelect}
            onNewVersion={handleNewVersion}
            onDeleteEntry={handleDeleteEntry}
          />
        )}
      </div>

      {/* Version Creation Dialog */}
      {versionTargetEntry && (
        <VersionCreationDialog
          isOpen={versionDialogOpen}
          onClose={handleCloseVersionDialog}
          entry={versionTargetEntry}
          onVersionCreated={handleVersionCreated}
          globalSettings={globalSettings}
          onLoadingChange={setIsVersionAnalyzing}
        />
      )}

      {/* Loading overlay */}
      <LoadingOverlay 
        isVisible={isAnalyzing || isVersionAnalyzing}
        title={isVersionAnalyzing ? "Creating new version..." : "Analyzing your design..."}
        description={isVersionAnalyzing 
          ? "Our AI is analyzing your updated design and generating fresh insights for this version."
          : "Our AI is reviewing your design and preparing personalized feedback. This usually takes 10-20 seconds."
        }
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        initialSettings={globalSettings}
        onSettingsChange={handleSettingsChange}
        userId={user?.id}
      />
    </div>
  );
}
