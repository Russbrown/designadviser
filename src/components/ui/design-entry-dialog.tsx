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

interface DesignEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryCreated: (newEntry: DesignEntry) => void;
  globalSettings: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Design analysis generation using the same logic as the main page
const generateAdvice = async (imageUrl: string, context: string, inquiries: string, globalSettings: string): Promise<{ advice: string; seniorCritique: string | null; gpt5Advice: string | null; miniAdvice: string | null }> => {
  const startTime = Date.now();

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
      throw new Error(errorData.error || 'Failed to analyze design');
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

export function DesignEntryDialog({ 
  isOpen, 
  onClose, 
  onEntryCreated, 
  globalSettings,
  onLoadingChange 
}: DesignEntryDialogProps) {
  const { user } = useAuth();
  const [newImage, setNewImage] = useState<File | null>(null);
  const [designProblem, setDesignProblem] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = useCallback((file: File) => {
    setNewImage(file);
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!newImage || !user) return;

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
      
      // Track image upload event
      AnalyticsService.trackImageUpload(user?.id || null, {
        fileName: newImage.name,
        fileSize: newImage.size,
        fileType: newImage.type
      });
      
      // Use design problem as both context and inquiries 
      const inquiries = designProblem || '';
      
      // Skip AI name generation for speed - use simple fallback
      const generatedName = 'Design Entry';

      // Save entry to database WITHOUT advice first (quick save)
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
          context: null,
          inquiries: designProblem || null,
          advice: '', // Empty advice initially
        }),
      });
      
      const dbSaveTime = Date.now() - dbSaveStartTime;
      
      if (!entryResponse.ok) {
        const errorData = await entryResponse.text();
        throw new Error(`Failed to save entry: ${entryResponse.status} ${entryResponse.statusText} - ${errorData}`);
      }
      
      const newEntry = await entryResponse.json();
      newEntry.design_versions = [];
      
      // Immediately show the entry to the user
      onEntryCreated(newEntry);
      
      // Reset form and close dialog
      setNewImage(null);
      setDesignProblem('');
      setError(null);
      onClose();

      // Start background advice generation (fire and forget)
      generateAdviceInBackground(newEntry.id, imageUrl, '', inquiries, globalSettings, user.id);
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload and save design entry';
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
      onLoadingChange?.(false);
    }
  };

  // Background function to generate advice after entry is created
  const generateAdviceInBackground = async (
    entryId: string, 
    imageUrl: string, 
    context: string, 
    inquiries: string, 
    globalSettings: string,
    userId: string
  ) => {
    try {
      const analysisStartTime = Date.now();
      
      // Generate advice using OpenAI API
      const { advice } = await generateAdvice(imageUrl, context, inquiries, globalSettings);
      
      const analysisTime = Date.now() - analysisStartTime;
      
      // Track design analysis completion
      AnalyticsService.trackDesignAnalysis(userId, {
        hasContext: !!context,
        hasInquiries: !!inquiries,
        analysisLength: advice.length
      });

      // Update the entry with advice
      const updateResponse = await fetch(`/api/entries/${entryId}`, {
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
      // Don't show error to user since this is background - they already have the entry
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setNewImage(null);
      setDesignProblem('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Design Entry</DialogTitle>
          <DialogDescription>
            Upload your design and get personalized AI-powered feedback to help improve your work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Design Image</Label>
            <ImageUpload 
              onImageUpload={handleImageUpload}
              currentImage={newImage ? URL.createObjectURL(newImage) : undefined}
              onClear={() => setNewImage(null)}
            />
          </div>

          {/* Design Problem Input */}
          <div className="space-y-2">
            <Label htmlFor="designProblem">What would you like feedback on? (Optional)</Label>
            <Textarea
              id="designProblem"
              value={designProblem}
              onChange={(e) => setDesignProblem(e.target.value)}
              placeholder="Describe what you're trying to achieve with this design, any specific concerns, or areas where you'd like focused feedback..."
              className="min-h-[100px]"
              disabled={isAnalyzing}
            />
          </div>

          {error && (
            <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-destructive mb-1">Analysis Failed</h4>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAnalyzing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newImage || isAnalyzing || !user}
          >
            {isAnalyzing ? 'Analyzing...' : 'Get AI Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}