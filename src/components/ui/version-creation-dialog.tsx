'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DesignEntry } from '@/types';
import { AnalyticsService } from '@/lib/analytics';
import { useAuth } from '@/contexts/auth-context';
import { FEATURES } from '@/lib/environment';

interface VersionCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: DesignEntry;
  onVersionCreated: (entryId: string, newVersion: {
    id: string;
    created_at: string;
    version_number: number;
    image_url: string | null;
    image_path: string | null;
    advice: string;
    entry_id: string;
    notes: string | null;
  }) => void;
  globalSettings: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Version comparison advice generation
const generateVersionAdvice = async (
  newImageUrl: string, 
  previousImageUrl: string,
  previousAdvice: string,
  previousSeniorCritique: string,
  previousGPT5Advice: string,
  context: string, 
  inquiries: string, 
  versionNotes: string,
  globalSettings: string
): Promise<{ advice: string; seniorCritique: string | null; gpt5Advice: string | null; miniAdvice: string | null }> => {
  try {
    const response = await fetch('/api/analyze-version', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newImageUrl,
        previousImageUrl,
        previousAdvice,
        previousSeniorCritique,
        previousGPT5Advice,
        context,
        inquiries,
        versionNotes,
        globalSettings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze design version');
    }

    const data = await response.json();
    return { 
      advice: data.advice, 
      seniorCritique: data.seniorCritique || null,
      gpt5Advice: data.gpt5Advice || null,
      miniAdvice: data.miniAdvice || null
    };
  } catch (error) {
    throw error;
  }
};

export function VersionCreationDialog({
  isOpen,
  onClose,
  entry,
  onVersionCreated,
  globalSettings,
  onLoadingChange,
}: VersionCreationDialogProps) {
  const { user } = useAuth();
  const [newImage, setNewImage] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    setNewImage(file);
    setError(null);
  }, []);

  const handleCreateVersion = async () => {
    if (!newImage) return;

    setIsAnalyzing(true);
    setError(null);
    onLoadingChange?.(true);

    const uploadStartTime = Date.now();

    try {
      // First upload the image to Supabase storage
      const formData = new FormData();
      formData.append('file', newImage);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadTime = Date.now() - uploadStartTime;
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to upload image: ${uploadResponse.status} ${errorData.error || uploadResponse.statusText}`);
      }
      
      const { url: imageUrl, path: imagePath } = await uploadResponse.json();

      // Save version to database WITHOUT advice first (quick save)
      const dbSaveStartTime = Date.now();
      
      const versionResponse = await fetch(`/api/entries/${entry.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          image_path: imagePath,
          advice: '', // Empty advice initially
          notes: notes || null,
        }),
      });
      
      const dbSaveTime = Date.now() - dbSaveStartTime;
      
      if (!versionResponse.ok) {
        const errorData = await versionResponse.text();
        throw new Error(`Failed to save version: ${versionResponse.status} ${versionResponse.statusText} - ${errorData}`);
      }
      
      const newVersion = await versionResponse.json();
      
      // Track version creation event
      AnalyticsService.trackVersionCreation(user?.id || null, {
        entryId: entry.id,
        versionNumber: newVersion.version_number,
        hasNotes: !!notes,
        fileName: newImage.name,
        fileSize: newImage.size,
        fileType: newImage.type,
      });
      
      // Immediately show the version to the user
      onVersionCreated(entry.id, newVersion);
      
      // Reset form and close dialog
      setNewImage(null);
      setNotes('');
      setError(null);
      onClose();

      // Start background advice generation (fire and forget)
      generateVersionAdviceInBackground(newVersion.id, entry.id, imageUrl, notes, globalSettings, user?.id || null);
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload and save version';
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
      onLoadingChange?.(false);
    }
  };

  // Background function to generate version advice after version is created
  const generateVersionAdviceInBackground = async (
    versionId: string,
    entryId: string,
    newImageUrl: string,
    versionNotes: string,
    globalSettings: string,
    userId: string | null
  ) => {
    try {
      const analysisStartTime = Date.now();
      
      // Get the most recent design (either the latest version or the original entry)
      const latestVersion = entry.design_versions && entry.design_versions.length > 0 
        ? entry.design_versions.sort((a, b) => b.version_number - a.version_number)[0]
        : null;
      
      const previousImageUrl = latestVersion ? latestVersion.image_url : entry.image_url;
      const previousAdvice = latestVersion ? latestVersion.advice : entry.advice;
      
      if (!previousImageUrl) {
        return;
      }
      
      // Generate version comparison advice
      const { advice } = await generateVersionAdvice(
        newImageUrl,
        previousImageUrl,
        previousAdvice || '',
        '', // previousSeniorCritique no longer used
        '', // previousGPT5Advice no longer used
        entry.context || '',
        entry.inquiries || '',
        versionNotes,
        globalSettings
      );
      
      const analysisTime = Date.now() - analysisStartTime;

      // Update the version with advice via PATCH API
      const updateResponse = await fetch(`/api/entries/${entryId}/versions/${versionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advice,
        }),
      });
      
      if (!updateResponse.ok) {
        return;
      }
      
    } catch (error) {
      // Don't show error to user since this is background - they already have the version
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setNewImage(null);
      setNotes('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Version</DialogTitle>
          <DialogDescription>
            Upload a new iteration of this design to track its evolution. AI feedback will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Design Reference */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <img 
              src={entry.image_url || ''} 
              alt="Original design" 
              className="w-16 h-16 object-cover rounded-md"
            />
            <div>
              <h4 className="font-medium">Original Design</h4>
              <p className="text-sm text-muted-foreground">
                Version 1 • {(entry.design_versions?.length || 0) + 1} total versions
              </p>
            </div>
          </div>

          {/* New Version Upload */}
          <div>
            <Label className="text-base font-medium">New Version Upload</Label>
            <div className="mt-2">
              <ImageUpload 
                onImageUpload={handleImageUpload}
                currentImage={newImage ? URL.createObjectURL(newImage) : undefined}
              />
            </div>
          </div>

          {/* Version Notes */}
          <div className="space-y-2">
            <Label htmlFor="version-notes">Version Notes (Optional)</Label>
            <Textarea
              id="version-notes"
              placeholder="Describe what changed in this version, what you're trying to improve, or any specific questions about this iteration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be included with the original context when generating AI feedback for this version.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 border border-destructive bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isAnalyzing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateVersion}
            disabled={!newImage || isAnalyzing}
          >
{isAnalyzing ? 'Creating Version...' : 'Create Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}