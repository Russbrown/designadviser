'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { AnalyticsService } from '@/lib/analytics';

interface AdviceVotingProps {
  entryId?: string;
  versionId?: string;
  onVoteChange?: (vote: number | null) => void;
}

interface Vote {
  id: string;
  preferred_advice_type: number; // 1, 2, or 3
  created_at: string;
}

export function AdviceVoting({ entryId, versionId, onVoteChange }: AdviceVotingProps) {
  const { user } = useAuth();
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [existingVote, setExistingVote] = useState<Vote | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load existing vote on mount
  useEffect(() => {
    const loadExistingVote = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('user_id', user.id);
        if (entryId) params.set('entry_id', entryId);
        if (versionId) params.set('version_id', versionId);

        const response = await fetch(`/api/advice-votes?${params.toString()}`);
        if (response.ok) {
          const vote = await response.json();
          if (vote) {
            setExistingVote(vote);
            setCurrentVote(vote.preferred_advice_type);
          }
        }
      } catch (error) {
        console.error('Failed to load existing vote:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingVote();
  }, [user, entryId, versionId]);

  const handleVoteClick = async (adviceType: number) => {
    if (!user) {
      alert('Please sign in to vote on advice');
      return;
    }

    // If clicking the same button that's already selected, delete the vote
    if (currentVote === adviceType && existingVote) {
      setIsSubmitting(true);
      
      try {
        const response = await fetch(`/api/advice-votes/${existingVote.id}?user_id=${user.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete vote');
        }

        // Reset state to unvoted
        setExistingVote(null);
        setCurrentVote(null);
        
        // Track vote deletion
        AnalyticsService.trackAdviceVote(user.id, {
          preferredAdviceType: adviceType,
          hasFeedback: false,
          entryId,
          versionId,
          isUpdate: false, // This is a deletion
        });

        onVoteChange?.(null);
        
      } catch (error) {
        console.error('Failed to delete vote:', error);
        alert('Failed to delete vote. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Otherwise, submit a new vote or update existing vote
    setCurrentVote(adviceType);
    setIsSubmitting(true);
    
    try {
      const body = {
        preferred_advice_type: adviceType,
        feedback: null,
        user_id: user.id,
        ...(entryId && { entry_id: entryId }),
        ...(versionId && { version_id: versionId }),
      };

      const url = existingVote ? `/api/advice-votes/${existingVote.id}` : '/api/advice-votes';
      const method = existingVote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      const result = await response.json();
      setExistingVote(result);
      
      // Track voting event
      AnalyticsService.trackAdviceVote(user.id, {
        preferredAdviceType: adviceType,
        hasFeedback: false,
        entryId,
        versionId,
        isUpdate: !!existingVote,
      });

      onVoteChange?.(adviceType);
      
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
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
        Sign in to vote on which advice is most helpful
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">Which advice is better?</span>
      
      <div className="flex gap-2">
        {[1, 2].map((type) => (
          <Button
            key={type}
            variant={currentVote === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleVoteClick(type)}
            disabled={isSubmitting}
            className={`w-8 h-8 p-0 ${
              currentVote === type 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
          >
            {isSubmitting && currentVote === type ? '...' : type}
          </Button>
        ))}
      </div>
    </div>
  );
}