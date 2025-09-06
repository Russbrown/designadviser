'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit3 } from 'lucide-react';

interface TextUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingTextUpdate?: {
    id: string;
    created_at: string;
    title: string | null;
    content: string;
    user_id: string | null;
  } | null;
  onTextUpdateCreated: (textUpdate: {
    id: string;
    created_at: string;
    title: string | null;
    content: string;
    user_id: string | null;
  }) => void;
  onTextUpdateUpdated?: (textUpdate: {
    id: string;
    created_at: string;
    title: string | null;
    content: string;
    user_id: string | null;
  }) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function TextUpdateDialog({
  isOpen,
  onClose,
  editingTextUpdate,
  onTextUpdateCreated,
  onTextUpdateUpdated,
  onLoadingChange
}: TextUpdateDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editingTextUpdate?.title || '');
  const [content, setContent] = useState(editingTextUpdate?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be signed in to create text updates');
      return;
    }

    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    onLoadingChange?.(true);

    try {
      const isEditing = !!editingTextUpdate;
      const url = isEditing 
        ? `/api/text-updates/${editingTextUpdate.id}?user_id=${user.id}`
        : `/api/text-updates?user_id=${user.id}`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || (isEditing ? 'Failed to update text update' : 'Failed to create text update'));
      }

      const updatedTextUpdate = await response.json();
      
      if (isEditing && onTextUpdateUpdated) {
        onTextUpdateUpdated(updatedTextUpdate);
      } else {
        onTextUpdateCreated(updatedTextUpdate);
      }
      
      setTitle('');
      setContent('');
      onClose();
      
    } catch (error) {
      console.error(editingTextUpdate ? 'Failed to update text update:' : 'Failed to create text update:', error);
      setError(error instanceof Error ? error.message : (editingTextUpdate ? 'Failed to update text update' : 'Failed to create text update'));
    } finally {
      setIsSubmitting(false);
      onLoadingChange?.(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      setError(null);
      setActiveTab('write');
      onClose();
    }
  };

  // Reset form when editing text update changes
  React.useEffect(() => {
    if (editingTextUpdate) {
      setTitle(editingTextUpdate.title || '');
      setContent(editingTextUpdate.content || '');
    } else {
      setTitle('');
      setContent('');
    }
    setError(null);
    setActiveTab('write');
  }, [editingTextUpdate]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingTextUpdate ? 'Edit Text Update' : 'Add Text Update'}</DialogTitle>
          <DialogDescription>
            {editingTextUpdate ? 'Edit your text update. You can use Markdown formatting for rich text.' : 'Add a text update to your timeline. You can use Markdown formatting for rich text.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this update..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'write' | 'preview')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="write" className="flex-1 flex flex-col min-h-0 mt-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your update here... You can use Markdown formatting like **bold**, *italic*, ## headings, - lists, etc."
                className="flex-1 min-h-[200px] resize-none font-mono text-sm"
                disabled={isSubmitting}
                autoFocus
              />
              
              <div className="text-xs text-muted-foreground mt-2">
                Supports Markdown formatting. Character count: {content.length}/10,000
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="flex-1 min-h-[200px] border rounded-md p-4 overflow-y-auto bg-muted/10">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <div className="text-muted-foreground italic text-center py-8">
                    No content to preview. Switch to the Write tab to add content.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="text-sm text-destructive mt-2 p-2 bg-destructive/10 rounded">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? (editingTextUpdate ? 'Updating...' : 'Publishing...') : (editingTextUpdate ? 'Update' : 'Publish Update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}