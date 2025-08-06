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

// Advice generation using the same API as main page
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

    try {
      // First upload the image to Supabase storage
      const formData = new FormData();
      formData.append('file', newImage);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { url: imageUrl, path: imagePath } = await uploadResponse.json();
      
      // Generate advice for the new version using original context + notes
      const combinedContext = `${entry.context || ''}\n\nVersion Notes: ${notes}`;
      const advice = await generateAdvice(imageUrl, combinedContext, entry.inquiries || '', globalSettings);

      // Save version to database
      const versionResponse = await fetch(`/api/entries/${entry.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          image_path: imagePath,
          advice,
          notes: notes || null,
        }),
      });
      
      if (!versionResponse.ok) {
        throw new Error('Failed to save version');
      }
      
      const newVersion = await versionResponse.json();
      onVersionCreated(entry.id, newVersion);
      
      // Reset form and close dialog
      setNewImage(null);
      setNotes('');
      setError(null);
      onClose();
    } catch (error) {
      console.error('Error creating version:', error);
      setError(error instanceof Error ? error.message : 'Failed to create version');
    } finally {
      setIsAnalyzing(false);
      onLoadingChange?.(false);
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
            Upload a new iteration of this design to track its evolution and get updated AI feedback.
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
            {isAnalyzing ? 'Creating Version...' : 'Create Version & Get AI Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}