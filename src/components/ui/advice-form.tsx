'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface AdviceFormProps {
  onSubmit: (name: string, context: string, inquiries: string) => void;
  isLoading?: boolean;
  hasImage?: boolean;
}

export function AdviceForm({ onSubmit, isLoading = false, hasImage = false }: AdviceFormProps) {
  const [name, setName] = useState('');
  const [questionsAndContext, setQuestionsAndContext] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass name, and the combined input as both context and inquiries to maintain API compatibility
    onSubmit(name, questionsAndContext, questionsAndContext);
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Questions & Context</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Optional: Add context or specific questions about your design
        </p>
      </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entry-name">Design Name (Optional)</Label>
            <Input
              id="entry-name"
              placeholder="Give your design a memorable name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="questions-context">Questions & Context (Optional)</Label>
            <Textarea
              id="questions-context"
              placeholder="Add any context about your design or specific questions you'd like feedback on. For example: target audience, design goals, specific areas to focus on, etc."
              value={questionsAndContext}
              onChange={(e) => setQuestionsAndContext(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !hasImage}
          >
            {isLoading 
              ? 'Getting Advice...' 
              : !hasImage 
                ? 'Upload an image to get advice'
                : 'Get Design Advice'
            }
          </Button>
        </form>
    </div>
  );
}