'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface AdviceFormProps {
  onSubmit: (designProblem: string) => void;
  isLoading?: boolean;
  hasImage?: boolean;
}

export function AdviceForm({ onSubmit, isLoading = false, hasImage = false }: AdviceFormProps) {
  const [designProblem, setDesignProblem] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(designProblem);
  };

  return (
    <div className="w-full space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="design-problem">What&apos;s the design problem? (Optional)</Label>
            <Textarea
              id="design-problem"
              placeholder="What specific design challenge are you trying to solve? What&apos;s not working or what are you unsure about?"
              value={designProblem}
              onChange={(e) => setDesignProblem(e.target.value)}
              className="min-h-[100px]"
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