'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: string;
  onSettingsChange: (settings: string) => void;
  userId?: string | null;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  initialSettings, 
  onSettingsChange,
  userId
}: SettingsModalProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when initialSettings changes
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only allow saving if user is logged in
      if (!userId) {
        alert('You must be signed in to save settings');
        return;
      }

      // Save to server
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalAdvice: settings, user_id: userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save settings:', errorData);
        alert(`Failed to save settings: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      const result = await response.json();
      console.log('Settings saved successfully:', result);
      
      onSettingsChange(settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSettings(initialSettings); // Reset to original value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configure Global Advice Settings</DialogTitle>
          <DialogDescription>
            Set up global context that will be included with every design analysis to personalize the AI feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="global-settings">
              Global Context & Guidelines
            </Label>
            <Textarea
              id="global-settings"
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              placeholder="Enter your company/brand guidelines, design preferences, target audience, or any context you want included in every analysis...

Examples:
• Our brand focuses on minimalism and accessibility
• Target audience is young professionals aged 25-35  
• Always prioritize mobile-first design
• Company colors are blue (#1E40AF) and white
• Prefer clean typography and plenty of whitespace"
              className="min-h-[200px] resize-none"
            />
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Tip:</p>
            <p>
              This context will be automatically included with every design analysis. 
              Be specific about your brand guidelines, target audience, and design preferences 
              to get more personalized and relevant feedback.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}