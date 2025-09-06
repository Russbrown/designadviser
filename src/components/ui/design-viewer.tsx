'use client';

import { useState, useEffect, useCallback } from 'react';
import { DesignEntry, DesignVersion } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Clock, ArrowLeft, Trash2, Edit3, Check, X, ChevronDown } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface DesignViewerProps {
  entry: DesignEntry;
  onBack: () => void;
  onNewVersion: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onNameUpdate: (entryId: string, newName: string) => void;
}

export function DesignViewer({ entry, onBack, onNewVersion, onDelete, onNameUpdate }: DesignViewerProps) {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entry.name || '');
  const [previousVersionCount, setPreviousVersionCount] = useState(0);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(entry);
  // Removed tab state - now showing only GPT-5 advice
  
  // Use currentEntry for the most up-to-date data
  // Combine original entry with versions for navigation
  // Original entry is always version 1, additional versions start from 2
  const allVersions = [
    {
      id: currentEntry.id,
      created_at: currentEntry.created_at,
      image_url: currentEntry.image_url,
      advice: currentEntry.advice,
      version_number: 1,
    },
    // Filter out any versions with version_number 1 (shouldn't exist but just in case)
    ...(currentEntry.design_versions || []).filter(v => v.version_number !== 1)
  ].sort((a, b) => a.version_number - b.version_number);

  const currentVersion = allVersions[currentVersionIndex];

  // Poll for advice updates if current version advice is empty
  const pollForAdviceUpdate = useCallback(async () => {
    if (!currentVersion) {
      return; // No current version available
    }
    
    const currentVersionHasAdvice = currentVersion.advice && currentVersion.advice.trim() !== '';
    
    if (currentVersionHasAdvice) {
      setIsLoadingAdvice(false);
      return; // Already have advice for current version
    }

    try {
      const response = await fetch(`/api/entries/${currentEntry.id}`);
      if (!response.ok) {
        return;
      }
      
      const updatedEntry = await response.json();
      
      // Check if the current version now has advice
      if (updatedEntry) {
        let hasNewAdvice = false;
        
        if (currentVersion.version_number === 1) {
          // For original entry (version 1)
          if (updatedEntry.advice && updatedEntry.advice.trim() !== '') {
            hasNewAdvice = true;
          }
        } else {
          // For design versions (version 2+)
          const updatedVersion = updatedEntry.design_versions?.find((v: DesignVersion) => v.version_number === currentVersion.version_number);
          if (updatedVersion && updatedVersion.advice && updatedVersion.advice.trim() !== '') {
            hasNewAdvice = true;
          }
        }
        
        if (hasNewAdvice) {
          setCurrentEntry(updatedEntry);
          setIsLoadingAdvice(false);
        }
      }
    } catch (error) {
      // Error polling for advice - will retry
    }
  }, [currentEntry.id, currentVersion?.advice, currentVersion?.version_number]);

  // Set up polling when current version has no advice
  useEffect(() => {
    if (!currentVersion) {
      return; // No current version available
    }
    
    const currentVersionHasAdvice = currentVersion.advice && currentVersion.advice.trim() !== '';
    
    if (!currentVersionHasAdvice) {
      setIsLoadingAdvice(true);
      
      // Poll immediately
      pollForAdviceUpdate();
      
      // Set up periodic polling
      const pollInterval = setInterval(pollForAdviceUpdate, 3000); // Poll every 3 seconds
      
      // Clean up after 2 minutes if no advice received
      const timeoutId = setTimeout(() => {
        clearInterval(pollInterval);
        setIsLoadingAdvice(false);
      }, 120000);
      
      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      };
    } else {
      setIsLoadingAdvice(false);
    }
  }, [currentVersion?.advice, currentVersion?.version_number, pollForAdviceUpdate]);

  // Update currentEntry when prop changes
  useEffect(() => {
    setCurrentEntry(entry);
  }, [entry]);

  // Effect to automatically show the newest version when new versions are added
  useEffect(() => {
    const currentVersionCount = allVersions.length;
    
    // If we have more versions than before, navigate to the newest version
    if (currentVersionCount > previousVersionCount && previousVersionCount > 0) {
      setCurrentVersionIndex(currentVersionCount - 1);
    }
    
    // Update the previous count
    setPreviousVersionCount(currentVersionCount);
  }, [allVersions.length, previousVersionCount]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const goToPrevious = () => {
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentVersionIndex < allVersions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(entry.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
    setEditedName(entry.name || '');
  };

  const handleNameSave = async () => {
    try {
      const response = await fetch(`/api/entries/${entry.id}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedName || null }),
      });

      if (response.ok) {
        onNameUpdate(entry.id, editedName);
        setIsEditingName(false);
      } else {
        const errorData = await response.json();
        alert('Failed to update entry name. Please try again.');
      }
    } catch (error) {
      alert('Failed to update entry name. Please try again.');
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setEditedName(entry.name || '');
  };

  return (
    <div className="space-y-6">
      {/* Header with Figma-style design */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button onClick={onBack} className="overflow-clip relative rounded-[5px] shrink-0 size-[17px]">
            <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.604 7.22897H9.94374C11.2979 7.22897 12.3957 8.32673 12.3957 9.68089C12.3957 11.035 11.2979 12.1328 9.94375 12.1328H6.72901M4.604 7.22897L6.19775 5.75781M4.604 7.22897L6.19775 8.70012" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.5832 9.00033C15.5832 12.3394 15.5832 14.009 14.5458 15.0463C13.5085 16.0837 11.839 16.0837 8.49984 16.0837C5.16072 16.0837 3.49116 16.0837 2.45383 15.0463C1.4165 14.009 1.4165 12.3394 1.4165 9.00033C1.4165 5.66121 1.4165 3.99165 2.45383 2.95432C3.49116 1.91699 5.16072 1.91699 8.49984 1.91699C11.839 1.91699 13.5085 1.91699 14.5458 2.95432C15.2356 3.64405 15.4667 4.6133 15.5441 6.16699" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* Title */}
          {!isEditingName ? (
            <div className="group relative flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-black">
                {entry.name || 'Untitled Design'}
              </h1>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNameEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter design name..."
                className="text-[20px] font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
              />
              <Button size="sm" onClick={handleNameSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleNameCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Version Indicators */}
          <div className="flex items-center gap-1">
            {allVersions.map((version, index) => (
              <button
                key={version.id}
                onClick={() => setCurrentVersionIndex(index)}
                className="flex items-center justify-center size-5 rounded-full border transition-colors"
                style={{
                  borderColor: index === currentVersionIndex ? "#23282A" : "#AEB4B7",
                  backgroundColor: "transparent",
                  borderStyle: index === currentVersionIndex ? "solid" : "dashed"
                }}
              >
                <span 
                  className="text-[11px] leading-none"
                  style={{ 
                    color: index === currentVersionIndex ? "#23282A" : "#AEB4B7",
                    fontWeight: index === currentVersionIndex ? "bold" : "normal"
                  }}
                >
                  {version.version_number}
                </span>
              </button>
            ))}
          </div>
          
          {/* New Version Button */}
          <div 
            className="box-border flex gap-2 items-center justify-center p-[6px] rounded-[6px] cursor-pointer"
            onClick={() => onNewVersion(entry.id)}
            style={{ 
              background: 'linear-gradient(180deg, #F6F9FB 0%, #F5F8FD 100%)',
              border: '1px solid #E9EFF1',
            }}
          >
            <div className="overflow-clip relative shrink-0 size-[18px]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <div className="font-medium leading-[0] text-[#23282a] text-[14px] whitespace-nowrap">
              New version
            </div>
          </div>
        </div>
      </div>

      {/* Current version display - Single column layout */}
      <div className="space-y-6">
        {/* Context and Design Problem - Inline */}
        {(entry.context || entry.inquiries) && (
          <div className="flex items-baseline gap-4">
            <div className="flex-1 space-y-1 min-w-0">
              {entry.context && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {entry.context}
                </div>
              )}
              
              {entry.inquiries && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {entry.inquiries}
                </div>
              )}
            </div>
            
            {/* Dropdown toggle for full text */}
            {((entry.context && entry.context.length > 60) || (entry.inquiries && entry.inquiries.length > 60)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContextDropdown(!showContextDropdown)}
                className="h-6 px-2 text-xs flex-shrink-0"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showContextDropdown ? 'rotate-180' : ''}`} />
                {showContextDropdown ? 'Less' : 'More'}
              </Button>
            )}
          </div>
        )}
        
        {/* Expanded dropdown content */}
        {showContextDropdown && (entry.context || entry.inquiries) && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {entry.context && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Context</h4>
                <p className="text-sm text-muted-foreground">
                  {entry.context}
                </p>
              </div>
            )}
            
            {entry.inquiries && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Design Problem</h4>
                <p className="text-sm text-muted-foreground">
                  {entry.inquiries}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Design Image */}
        {currentVersion && (
          <>
            <img 
              src={currentVersion.image_url || ''} 
              alt={`Design version ${currentVersion.version_number}`}
              className="max-w-full max-h-[350px] h-auto rounded-lg shadow-md object-contain mx-auto block"
            />
            
            {/* GPT-5 Advice Section */}
            <div className="pt-4">
              {currentVersion.advice ? (
                <MarkdownRenderer content={currentVersion.advice} />
              ) : isLoadingAdvice ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <p className="italic">Generating design advice...</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No GPT-5 design advice generated for this version yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>


    </div>
  );
}