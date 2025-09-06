'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AnalyticsService } from '@/lib/analytics';

interface AdviceRatingProps {
  entryId?: string;
  versionId?: string;
  onRatingChange?: (rating: number | null) => void;
}

interface Rating {
  id: string;
  rating: number;
  feedback?: string;
  created_at: string;
}

export function AdviceRating({ entryId, versionId, onRatingChange }: AdviceRatingProps) {
  const { user } = useAuth();
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load existing rating on mount
  useEffect(() => {
    const loadExistingRating = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('user_id', user.id);
        if (entryId) params.set('entry_id', entryId);
        if (versionId) params.set('version_id', versionId);

        const response = await fetch(`/api/ratings?${params.toString()}`);
        if (response.ok) {
          const rating = await response.json();
          if (rating) {
            setExistingRating(rating);
            setCurrentRating(rating.rating);
            setFeedback(rating.feedback || '');
            if (rating.feedback) {
              setShowFeedback(true);
            }
          }
        }
      } catch (error) {
        // Error loading existing rating - will use default state
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingRating();
  }, [user, entryId, versionId]);

  const handleStarClick = (rating: number) => {
    if (!user) {
      alert('Please sign in to rate advice');
      return;
    }

    setCurrentRating(rating);
    
    // Show feedback input for ratings of 3 or below
    if (rating <= 3) {
      setShowFeedback(true);
    } else {
      setShowFeedback(false);
      setFeedback('');
      // Auto-submit for positive ratings
      handleSubmitRating(rating, '');
    }
  };

  const handleSubmitRating = async (rating?: number, feedbackText?: string) => {
    if (!user) return;

    const ratingToSubmit = rating ?? currentRating;
    const feedbackToSubmit = feedbackText ?? feedback;

    if (ratingToSubmit === 0) return;

    setIsSubmitting(true);
    
    try {
      const body = {
        rating: ratingToSubmit,
        feedback: feedbackToSubmit || null,
        user_id: user.id,
        ...(entryId && { entry_id: entryId }),
        ...(versionId && { version_id: versionId }),
      };

      const url = existingRating ? `/api/ratings/${existingRating.id}` : '/api/ratings';
      const method = existingRating ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      const result = await response.json();
      setExistingRating(result);
      
      // Track rating event
      AnalyticsService.trackAdviceRating(user.id, {
        rating: ratingToSubmit,
        hasFeedback: !!feedbackToSubmit,
        entryId,
        versionId,
        isUpdate: !!existingRating,
      });

      onRatingChange?.(ratingToSubmit);
      
      // Hide feedback form after submission
      setShowFeedback(false);
      
    } catch (error) {
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Sign in to rate this advice
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Rate this advice:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={isSubmitting}
            >
              <Star
                className={`h-5 w-5 ${
                  star <= (hoverRating || currentRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </Button>
          ))}
        </div>
        {existingRating && (
          <span className="text-sm text-muted-foreground">
            (Updated {new Date(existingRating.created_at).toLocaleDateString()})
          </span>
        )}
      </div>

      {showFeedback && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Help us improve - what could be better?</span>
          </div>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts on how we could improve this advice..."
            className="text-sm min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowFeedback(false);
                setFeedback('');
              }}
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitRating()}
              disabled={isSubmitting || currentRating === 0}
            >
              {isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}