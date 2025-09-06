'use client';

import { useState, useCallback, useEffect } from 'react';
import { DesignEntry, TextUpdate, TimelineItem, isDesignEntry, isTextUpdate } from '@/types';
import { Timeline } from '@/components/ui/timeline';
import { DesignViewer } from '@/components/ui/design-viewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VersionCreationDialog } from '@/components/ui/version-creation-dialog';
import { TextUpdateDialog } from '@/components/ui/text-update-dialog';
import { DesignEntryDialog } from '@/components/ui/design-entry-dialog';
import { UserMenu } from '@/components/ui/user-menu';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { SettingsModal } from '@/components/ui/settings-modal';
import { useAuth } from '@/contexts/auth-context';
import { Settings } from 'lucide-react';
import { ErrorHandler } from '@/components/error-handler';
import { AnalyticsService } from '@/lib/analytics';
import { FEATURES } from '@/lib/environment';


export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<DesignEntry[]>([]);
  const [textUpdates, setTextUpdates] = useState<TextUpdate[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DesignEntry | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVersionAnalyzing, setIsVersionAnalyzing] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Version creation state
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionTargetEntry, setVersionTargetEntry] = useState<DesignEntry | null>(null);
  const [textUpdateDialogOpen, setTextUpdateDialogOpen] = useState(false);
  const [editingTextUpdate, setEditingTextUpdate] = useState<TextUpdate | null>(null);
  const [designEntryDialogOpen, setDesignEntryDialogOpen] = useState(false);

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
        // Load entries and text updates in parallel
        const entriesUrl = user?.id ? `/api/entries?user_id=${user.id}` : '/api/entries';
        const textUpdatesUrl = user?.id ? `/api/text-updates?user_id=${user.id}` : '/api/text-updates';
        
        const [entriesResponse, textUpdatesResponse] = await Promise.all([
          fetch(entriesUrl),
          fetch(textUpdatesUrl)
        ]);
        
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

        if (textUpdatesResponse.ok) {
          const textUpdatesData = await textUpdatesResponse.json();
          console.log('Loaded text updates from API:', textUpdatesData.length);
          setTextUpdates(textUpdatesData);
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

  // Combine entries and text updates into chronologically sorted timeline items
  useEffect(() => {
    const combined: TimelineItem[] = [...entries, ...textUpdates];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTimelineItems(combined);
  }, [entries, textUpdates]);


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

  const handleTextUpdateCreated = useCallback((newTextUpdate: TextUpdate) => {
    setTextUpdates(prev => [newTextUpdate, ...prev]);
  }, []);

  const handleTextUpdateUpdated = useCallback((updatedTextUpdate: TextUpdate) => {
    setTextUpdates(prev => 
      prev.map(update => 
        update.id === updatedTextUpdate.id ? updatedTextUpdate : update
      )
    );
  }, []);

  const handleDesignEntryCreated = useCallback((newEntry: DesignEntry) => {
    setEntries(prev => [newEntry, ...prev]);
    // Navigate to the newly created entry
    setSelectedEntry(newEntry);
  }, []);

  const handleTimelineItemSelect = useCallback((item: TimelineItem) => {
    if (isDesignEntry(item)) {
      handleEntrySelect(item);
    }
    // Text updates don't have individual views, they're just displayed in timeline
  }, [handleEntrySelect]);

  const handleTextUpdateSelect = useCallback((textUpdate: TextUpdate) => {
    setEditingTextUpdate(textUpdate);
    setTextUpdateDialogOpen(true);
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
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
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
      <div className="container mx-auto max-w-[850px] py-8 px-4">
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
            ? "Uploading your design and creating the new version. AI feedback will generate automatically after."
            : "Uploading your design and creating the entry. AI feedback will generate automatically after."
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[850px] py-8 px-4 space-y-8">
      <ErrorHandler />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-black">Design Journal</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="overflow-clip relative rounded-[5px] shrink-0 size-5"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="size-full"
            >
              <circle cx="10" cy="10" r="2.5" stroke="#1C274C" strokeWidth="1.5"/>
              <path d="M3.05094 8.8663C3.44472 9.11372 3.6981 9.53521 3.6981 10.0003C3.6981 10.4653 3.44472 10.8868 3.05094 11.1342C2.78297 11.3026 2.61032 11.4372 2.48748 11.5973C2.21839 11.948 2.09964 12.3912 2.15733 12.8294C2.2006 13.1581 2.39475 13.4944 2.78303 14.1669C3.17132 14.8394 3.36546 15.1757 3.62847 15.3775C3.97916 15.6466 4.42237 15.7654 4.86062 15.7077C5.06065 15.6813 5.26349 15.5991 5.54322 15.4513C5.95445 15.2339 6.44624 15.2252 6.84905 15.4578C7.25181 15.6904 7.49014 16.1206 7.50752 16.5854C7.51935 16.9016 7.54957 17.1184 7.62679 17.3048C7.79594 17.7132 8.1204 18.0376 8.52878 18.2068C8.83506 18.3337 9.22335 18.3337 9.99992 18.3337C10.7765 18.3337 11.1648 18.3337 11.4711 18.2068C11.8794 18.0376 12.2039 17.7132 12.3731 17.3048C12.4503 17.1184 12.4805 16.9016 12.4923 16.5854C12.5097 16.1206 12.748 15.6904 13.1508 15.4579C13.5536 15.2253 14.0453 15.234 14.4565 15.4513C14.7363 15.5992 14.9392 15.6814 15.1392 15.7078C15.5775 15.7655 16.0207 15.6467 16.3714 15.3776C16.6344 15.1758 16.8285 14.8395 17.2168 14.167C17.3897 13.8676 17.524 13.6348 17.6238 13.4397M16.9489 11.1343C16.5551 10.8869 16.3017 10.4654 16.3017 10.0004C16.3017 9.53529 16.5551 9.11375 16.9489 8.8663C17.2168 8.69796 17.3894 8.5634 17.5123 8.40332C17.7813 8.05264 17.9001 7.60942 17.8424 7.17118C17.7991 6.84249 17.605 6.50623 17.2167 5.8337C16.8284 5.16117 16.6343 4.82491 16.3713 4.62309C16.0206 4.354 15.5774 4.23524 15.1391 4.29294C14.9391 4.31927 14.7362 4.40149 14.4565 4.54935C14.0453 4.76669 13.5535 4.77536 13.1507 4.54279C12.748 4.31024 12.5097 3.88007 12.4923 3.41535C12.4805 3.09909 12.4503 2.88228 12.3731 2.69585C12.2039 2.28747 11.8794 1.96302 11.4711 1.79386C11.1648 1.66699 10.7765 1.66699 9.99992 1.66699C9.22335 1.66699 8.83506 1.66699 8.52878 1.79386C8.1204 1.96302 7.79594 2.28747 7.62678 2.69585C7.54957 2.88227 7.51935 3.09906 7.50752 3.41527C7.49014 3.88004 7.25179 4.31025 6.84901 4.54279C6.44623 4.77534 5.95449 4.76665 5.54329 4.54932C5.26353 4.40146 5.06067 4.31923 4.86063 4.2929C4.42238 4.2352 3.97916 4.35396 3.62848 4.62305C3.36547 4.82487 3.17132 5.16113 2.78304 5.83366C2.61018 6.13306 2.47579 6.36582 2.37607 6.56093" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Tab Buttons Container */}
      <div className="flex w-full gap-4 items-start justify-start">
        {/* Design Advice Tab */}
        <div 
          className="flex-1 box-border flex gap-2 h-[50px] items-center justify-center p-[6px] rounded-[6px] hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => setDesignEntryDialogOpen(true)}
          style={{ 
            opacity: !user ? 0.5 : 1, 
            pointerEvents: !user ? 'none' : 'auto',
            background: 'linear-gradient(180deg, #F6F9FB 0%, #F5F8FD 100%)',
            border: '1px solid #E9EFF1',
          }}
        >
          <div className="flex gap-2.5 items-center justify-center rounded-[6px] shrink-0 size-5">
            <div className="relative shrink-0 size-[18px]">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="size-full"
              >
                <g clipPath="url(#clip0_70_1405)">
                  <path d="M12.25 10L10 10M10 10L7.75 10M10 10L10 7.75M10 10L10 12.25" stroke="#393F41" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17.5 10C17.5 13.5355 17.5 15.3033 16.4017 16.4017C15.3033 17.5 13.5355 17.5 10 17.5C6.46447 17.5 4.6967 17.5 3.59835 16.4017C2.5 15.3033 2.5 13.5355 2.5 10C2.5 6.46447 2.5 4.6967 3.59835 3.59835C4.6967 2.5 6.46447 2.5 10 2.5C13.5355 2.5 15.3033 2.5 16.4017 3.59835C17.132 4.32865 17.3767 5.35491 17.4587 7" stroke="#393F41" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_70_1405">
                    <rect width="18" height="18" fill="white" transform="translate(1 1)"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
          <div className="font-medium leading-[0] shrink-0 text-[#23282a] text-[14px] whitespace-nowrap">
            Design Advice
          </div>
        </div>

        {/* Project Update Tab */}
        <div 
          className="flex-1 box-border flex gap-2 h-[50px] items-center justify-center p-[6px] rounded-[6px] hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => setTextUpdateDialogOpen(true)}
          style={{ 
            opacity: !user ? 0.5 : 1, 
            pointerEvents: !user ? 'none' : 'auto',
            background: 'linear-gradient(180deg, #F6F9FB 0%, #F5F8FD 100%)',
            border: '1px solid #E9EFF1',
          }}
        >
          <div className="relative shrink-0 size-5">
            <svg 
              width="21" 
              height="20" 
              viewBox="0 0 21 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="size-full"
            >
              <path d="M3.8335 18.333H7.16683M17.1668 18.333H10.5002" stroke="#393F41" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12.0735 3.05276L12.6915 2.43484C13.7153 1.41104 15.3752 1.41104 16.399 2.43484C17.4228 3.45865 17.4228 5.11856 16.399 6.14236L15.7811 6.76028M12.0735 3.05276C12.0735 3.05276 12.1508 4.36584 13.3094 5.52444C14.468 6.68304 15.7811 6.76028 15.7811 6.76028M12.0735 3.05276L6.39271 8.73359C6.00794 9.11837 5.81555 9.31075 5.65009 9.52288C5.45492 9.77311 5.28759 10.0439 5.15106 10.3303C5.03532 10.5732 4.94928 10.8313 4.7772 11.3475L4.04803 13.535M15.7811 6.76028L12.9406 9.6007M10.1002 12.4411C9.71546 12.8259 9.52307 13.0183 9.31094 13.1837C9.06071 13.3789 8.78996 13.5462 8.50348 13.6828C8.26063 13.7985 8.00251 13.8845 7.48628 14.0566L5.29878 14.7858M5.29878 14.7858L4.76406 14.964C4.51002 15.0487 4.22993 14.9826 4.04058 14.7932C3.85123 14.6039 3.78511 14.3238 3.8698 14.0698L4.04803 13.535M5.29878 14.7858L4.04803 13.535" stroke="#393F41" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="font-medium leading-[0] shrink-0 text-[#23282a] text-[14px] whitespace-nowrap">
            Project Update
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-8">
        {!user && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <p className="text-sm text-orange-700 text-center">
                🔒 <strong>Sign in required</strong> to create design entries and get AI advice. Create an account to save your design entries and access all features.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your design entries...</p>
            </div>
          </div>
        ) : (
          <Timeline 
            timelineItems={timelineItems}
            onEntrySelect={handleEntrySelect}
            onNewVersion={handleNewVersion}
            onDeleteEntry={handleDeleteEntry}
            onTextUpdateSelect={handleTextUpdateSelect}
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
          ? "Uploading your design and creating the new version. AI feedback will generate automatically after."
          : "Uploading your design and creating the entry. AI feedback will generate automatically after."
        }
      />

      {/* Design Entry Dialog */}
      <DesignEntryDialog
        isOpen={designEntryDialogOpen}
        onClose={() => setDesignEntryDialogOpen(false)}
        onEntryCreated={handleDesignEntryCreated}
        globalSettings={globalSettings}
        onLoadingChange={setIsAnalyzing}
      />

      {/* Text Update Dialog */}
      <TextUpdateDialog
        isOpen={textUpdateDialogOpen}
        onClose={() => {
          setTextUpdateDialogOpen(false);
          setEditingTextUpdate(null);
        }}
        editingTextUpdate={editingTextUpdate}
        onTextUpdateCreated={handleTextUpdateCreated}
        onTextUpdateUpdated={handleTextUpdateUpdated}
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
