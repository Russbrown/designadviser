'use client';

import { TextUpdate } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Calendar } from 'lucide-react';

interface TextUpdateCardProps {
  textUpdate: TextUpdate;
  onClick?: () => void;
}

export function TextUpdateCard({ textUpdate, onClick }: TextUpdateCardProps) {
  const formattedDate = formatDistanceToNow(new Date(textUpdate.created_at), {
    addSuffix: true,
  });

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:bg-muted/50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Text Update</span>
            <div className="flex items-center gap-1 ml-auto">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">{formattedDate}</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer 
              content={textUpdate.content} 
              className="text-sm leading-relaxed"
            />
          </div>

          {/* Footer with timestamp */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {new Date(textUpdate.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}