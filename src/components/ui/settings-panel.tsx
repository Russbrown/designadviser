'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Check, X } from 'lucide-react';
import { settings, DEFAULT_SETTINGS } from '@/lib/settings';

interface SettingsPanelProps {
  onSettingsChange: (settings: string) => void;
  initialSettings?: string;
}

export function SettingsPanel({ onSettingsChange, initialSettings = '' }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(initialSettings || DEFAULT_SETTINGS.globalAdvice);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const loadedSettings = await settings.load();
        setLocalSettings(loadedSettings.globalAdvice);
        onSettingsChange(loadedSettings.globalAdvice);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setLocalSettings(DEFAULT_SETTINGS.globalAdvice);
        onSettingsChange(DEFAULT_SETTINGS.globalAdvice);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [onSettingsChange]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      await settings.save(localSettings);
      onSettingsChange(localSettings);
      setSaveStatus('success');
      
      // Auto-hide success message after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      
      // Auto-hide error message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS.globalAdvice);
    setSaveStatus('idle');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Advice Settings
              {isLoading && <span className="text-xs text-muted-foreground">(Loading...)</span>}
            </CardTitle>
            <CardDescription>
              Customize the system-level context that will be applied to all design advice
              {saveStatus === 'success' && (
                <span className="text-green-600 text-sm ml-2 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved permanently
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Configure'}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="global-settings">Global Context Template</Label>
              <Textarea
                id="global-settings"
                placeholder="Define your company's design standards, brand guidelines, target audience, and any other context that should influence all design advice..."
                value={localSettings}
                onChange={(e) => setLocalSettings(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This context will be automatically included with every design analysis to ensure advice is tailored to your brand and standards.
                {saveStatus === 'error' && (
                  <span className="text-red-600 ml-2 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Failed to save - using local backup
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                size="sm" 
                disabled={isSaving || isLoading}
                className="flex items-center gap-1"
              >
                {isSaving ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Saving...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <Check className="h-3 w-3" />
                    Saved
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline" 
                size="sm"
                disabled={isSaving || isLoading}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}