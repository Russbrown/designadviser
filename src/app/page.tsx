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

// Real OpenAI-powered design analysis
const generateAdvice = async (imageUrl: string, context: string, inquiries: string, globalSettings: string): Promise<string> => {
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze design');
    }

    const data = await response.json();
    return data.advice;
  } catch (error) {
    console.error('Error generating advice:', error);
    
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

  // Load entries and settings from database on mount
  useEffect(() => {
    const loadData = async () => {
      // Wait for auth to be ready
      if (authLoading) return;
      
      try {
        // Load entries
        const entriesResponse = await fetch('/api/entries');
        if (entriesResponse.ok) {
          const data = await entriesResponse.json();
          
          // Filter entries to only show user's own entries and anonymous entries
          const filteredData = data.filter((entry: DesignEntry) => {
            return entry.user_id === null || entry.user_id === user?.id;
          });
          
          console.log('Loaded entries from API:', filteredData.map((entry: DesignEntry) => ({
            id: entry.id,
            versionsCount: entry.design_versions?.length || 0,
            versions: entry.design_versions?.map((v) => ({ 
              id: v.id, 
              version_number: v.version_number 
            })) || []
          })));
          setEntries(filteredData);
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

    setIsAnalyzing(true);
    setError(null); // Clear any previous errors
    
    try {
      // First upload the image to Supabase storage
      const formData = new FormData();
      formData.append('file', currentImage);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { url: imageUrl, path: imagePath } = await uploadResponse.json();
      
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
      
      // Generate advice using OpenAI API - this will throw if it fails
      const advice = await generateAdvice(imageUrl, '', inquiries, globalSettings);
      
      // Track design analysis completion
      AnalyticsService.trackDesignAnalysis(user?.id || null, {
        hasContext: false,
        hasInquiries: !!inquiries,
        analysisLength: advice.length
      });

      // Save entry to database
      const entryResponse = await fetch('/api/entries', {
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
          advice,
          user_id: user?.id || null,
        }),
      });
      
      if (!entryResponse.ok) {
        const errorData = await entryResponse.text();
        console.error('Entry save failed:', {
          status: entryResponse.status,
          statusText: entryResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to save entry: ${entryResponse.status} ${entryResponse.statusText} - ${errorData}`);
      }
      
      const newEntry = await entryResponse.json();
      newEntry.design_versions = [];
      
      setEntries(prev => [newEntry, ...prev]);
      setCurrentImage(null);
      setError(null); // Clear error on success
      
      // Navigate to the newly created entry
      setSelectedEntry(newEntry);
    } catch (error) {
      console.error('Error generating AI advice:', error);
      
      // Set error message to display to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate AI-powered design advice';
      
      setError(errorMessage);
      // Don't clear the image or create an entry - let user retry
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentImage, globalSettings, user?.id]);

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
          <h1 className="text-3xl font-bold">Design Adviser</h1>
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700">
              💡 <strong>Sign in</strong> to save your design entries permanently. Without an account, your entries will only be visible during this session.
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
