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
  console.log('🔍 [GENERATE_ADVICE] Starting analysis request:', {
    imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'null',
    imageUrlFull: imageUrl,
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
      console.log('🚀 [DESIGN_ENTRY_DIALOG] Starting design analysis process:', {
        fileName: newImage.name,
        fileSize: newImage.size,
        fileType: newImage.type,
        designProblem: designProblem ? designProblem.substring(0, 50) + '...' : 'None',
        userId: user.id
      });

      // First upload the image to Supabase storage
      console.log('📤 [DESIGN_ENTRY_DIALOG] Starting file upload to Supabase...');
      const formData = new FormData();
      formData.append('file', newImage);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadTime = Date.now() - uploadStartTime;
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`💥 [DESIGN_ENTRY_DIALOG] Upload failed after ${uploadTime}ms:`, {
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
      console.log(`✅ [DESIGN_ENTRY_DIALOG] Upload successful in ${uploadTime}ms:`, {
        imageUrl: imageUrl.substring(0, 50) + '...',
        imagePath
      });
      
      // Track image upload event
      AnalyticsService.trackImageUpload(user?.id || null, {
        fileName: newImage.name,
        fileSize: newImage.size,
        fileType: newImage.type
      });
      
      // Generate a design name using AI
      const nameResponse = await fetch('/api/generate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          context: '',
          designProblem,
        }),
      });
      
      let generatedName = 'Design Entry';
      if (nameResponse.ok) {
        const nameData = await nameResponse.json();
        generatedName = nameData.name || 'Design Entry';
      }
      
      // Use design problem as both context and inquiries 
      const inquiries = designProblem || '';
      
      console.log('🧠 [DESIGN_ENTRY_DIALOG] Starting AI analysis...');
      const analysisStartTime = Date.now();
      
      // Generate advice using OpenAI API
      const { advice } = await generateAdvice(imageUrl, '', inquiries, globalSettings);
      
      const analysisTime = Date.now() - analysisStartTime;
      console.log(`✅ [DESIGN_ENTRY_DIALOG] Analysis completed in ${analysisTime}ms:`, {
        adviceLength: advice.length
      });
      
      // Track design analysis completion
      AnalyticsService.trackDesignAnalysis(user?.id || null, {
        hasContext: false,
        hasInquiries: !!inquiries,
        analysisLength: advice.length
      });

      // Save entry to database
      console.log('💾 [DESIGN_ENTRY_DIALOG] Saving entry to database...');
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
          advice,
        }),
      });
      
      const dbSaveTime = Date.now() - dbSaveStartTime;
      
      if (!entryResponse.ok) {
        const errorData = await entryResponse.text();
        console.error(`💥 [DESIGN_ENTRY_DIALOG] Database save failed after ${dbSaveTime}ms:`, {
          status: entryResponse.status,
          statusText: entryResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to save entry: ${entryResponse.status} ${entryResponse.statusText} - ${errorData}`);
      }
      
      console.log(`✅ [DESIGN_ENTRY_DIALOG] Database save successful in ${dbSaveTime}ms`);
      
      const newEntry = await entryResponse.json();
      newEntry.design_versions = [];
      
      onEntryCreated(newEntry);
      
      const totalProcessTime = Date.now() - uploadStartTime;
      console.log(`🎉 [DESIGN_ENTRY_DIALOG] Complete process finished successfully in ${totalProcessTime}ms`);
      
      // Reset form and close dialog
      setNewImage(null);
      setDesignProblem('');
      setError(null);
      onClose();
    } catch (error) {
      const totalProcessTime = Date.now() - uploadStartTime;
      console.error(`💥 [DESIGN_ENTRY_DIALOG] Complete process failed after ${totalProcessTime}ms:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate AI-powered design advice';
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
      onLoadingChange?.(false);
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