'use client';

import { useState, useEffect } from 'react';
import { DesignEntry } from '@/types';
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
  
  // Combine original entry with versions for navigation
  // Original entry is always version 1, additional versions start from 2
  const allVersions = [
    {
      id: entry.id,
      created_at: entry.created_at,
      image_url: entry.image_url,
      advice: entry.advice,
      version_number: 1,
      isOriginal: true,
    },
    // Filter out any versions with version_number 1 (shouldn't exist but just in case)
    ...(entry.design_versions || []).filter(v => v.version_number !== 1)
  ].sort((a, b) => a.version_number - b.version_number);

  // Debug logging to see what versions we have
  console.log('Entry versions:', {
    entryId: entry.id,
    originalEntry: { version_number: 1, isOriginal: true },
    designVersions: entry.design_versions,
    allVersions: allVersions.map(v => ({ 
      version_number: v.version_number, 
      isOriginal: 'isOriginal' in v ? v.isOriginal : false,
      id: v.id 
    }))
  });

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

  const currentVersion = allVersions[currentVersionIndex];
  
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
        console.error('Failed to update entry name:', errorData);
        alert('Failed to update entry name. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error updating entry name:', error);
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setEditedName(entry.name || '');
  };

  return (
    <div className="space-y-6">
      {/* Consolidated Header */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Single row: Back button, Title, Edit button, Actions */}
            {!isEditingName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={onBack} title="Back to Timeline">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="group relative">
                    <div className="flex items-start gap-2">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {entry.name || 'Untitled Design'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDate(entry.created_at)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleNameEdit}
                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Version navigation - show if multiple versions */}
                  {allVersions.length > 1 && (
                    <div className="flex items-center gap-3 mr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevious}
                        disabled={currentVersionIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium transition-all duration-300 ease-in-out">
                          Version {currentVersion.version_number} of {allVersions.length}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(currentVersion.created_at)}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNext}
                        disabled={currentVersionIndex === allVersions.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <Button onClick={() => onNewVersion(entry.id)}>
                    New Version
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={onBack} title="Back to Timeline">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter design name..."
                    className="flex-1"
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
                <p className="text-xs text-muted-foreground">
                  Press Enter to save, Escape to cancel
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current version display - Single column layout */}
      <div className="space-y-6">
        {/* Design Image */}
        <Card>
          <CardHeader className="relative">
            <div className="flex items-baseline justify-between">
              <CardTitle className="transition-all duration-300 flex-shrink-0">Version {currentVersion.version_number}</CardTitle>
              
              {/* Context and Design Problem - Inline */}
              {(entry.context || entry.inquiries) && (
                <div className="flex items-baseline flex-1 ml-6 gap-4">
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
            </div>
            
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
          </CardHeader>
          <CardContent>
            <img 
              src={currentVersion.image_url || ''} 
              alt={`Design version ${currentVersion.version_number}`}
              className="w-full rounded-lg shadow-md"
            />
          </CardContent>
        </Card>

        {/* Advice */}
        <Card>
          <CardHeader>
            <CardTitle>Design Advice</CardTitle>
          </CardHeader>
          <CardContent>
            {currentVersion.advice ? (
              <MarkdownRenderer content={currentVersion.advice} />
            ) : (
              <p className="text-muted-foreground italic">
                No advice generated for this version yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Danger Zone - Delete Entry */}
      <div className="mt-12 pt-8 border-t border-destructive/20">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete this design entry and all its versions. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={handleDeleteClick}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Entry
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">
                    Are you absolutely sure?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently delete the design entry &quot;{entry.context || 'Design Entry'}&quot; and all {(entry.design_versions?.length || 0) + 1} versions. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Yes, delete permanently
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteCancel}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}