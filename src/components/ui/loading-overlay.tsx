'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Brain } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  title = "Analyzing your design...", 
  description = "Our AI is reviewing your design and preparing personalized feedback. This usually takes 10-20 seconds."
}: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Simulate progress with a more realistic curve
    const progressSteps = [
      { value: 15, delay: 500 },   // Quick initial progress
      { value: 30, delay: 1000 },  // Steady progress
      { value: 45, delay: 2000 },  // Slower middle section
      { value: 60, delay: 3000 },  // Analysis phase
      { value: 75, delay: 5000 },  // Deep analysis
      { value: 85, delay: 8000 },  // Almost done
      { value: 95, delay: 12000 }, // Final touches
    ];

    const timeouts: NodeJS.Timeout[] = [];

    progressSteps.forEach(({ value, delay }) => {
      const timeout = setTimeout(() => {
        setProgress(value);
      }, delay);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="mx-auto max-w-md w-full p-8 space-y-8">
        {/* Animated brain icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Brain className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <Brain className="h-16 w-16 text-primary/20" />
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processing...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Status messages */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {progress < 30 && "🔍 Analyzing visual elements..."}
            {progress >= 30 && progress < 60 && "🎨 Evaluating design principles..."}
            {progress >= 60 && progress < 85 && "🧠 Generating personalized advice..."}
            {progress >= 85 && "✨ Finalizing recommendations..."}
          </p>
        </div>
      </div>
    </div>
  );
}