'use client';

import { DesignEntry, TextUpdate, TimelineItem, isDesignEntry, isTextUpdate } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Eye, Plus, Trash2 } from 'lucide-react';
import { TextUpdateCard } from '@/components/ui/text-update-card';

interface TimelineProps {
  timelineItems: TimelineItem[];
  onEntrySelect: (entry: DesignEntry) => void;
  onNewVersion: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
}

export function Timeline({ timelineItems, onEntrySelect, onNewVersion, onDeleteEntry }: TimelineProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (timelineItems.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No timeline items yet</p>
          <p className="text-sm text-muted-foreground">
            Upload your first design or add a text update to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          View all your design entries and text updates in chronological order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineItems.map((item, index) => {
            if (isDesignEntry(item)) {
              // Render design entry
              return (
                <div
                  key={item.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onEntrySelect(item)}
                >
                  <div className="relative">
                    <img
                      src={item.image_url || ''}
                      alt="Design thumbnail"
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    {(item.design_versions && item.design_versions.length > 0) && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {item.design_versions.length + 1}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {item.name || `Design Entry #${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewVersion(item.id);
                          }}
                          title="New version"
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEntry(item.id);
                          }}
                          title="Delete design"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {item.context && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {item.context}
                      </p>
                    )}
                    
                    {item.inquiries && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {item.inquiries}
                      </p>
                    )}
                  </div>
                </div>
              );
            } else if (isTextUpdate(item)) {
              // Render text update
              return (
                <TextUpdateCard
                  key={item.id}
                  textUpdate={item}
                />
              );
            }
            
            return null;
          })}
        </div>
      </CardContent>
    </Card>
  );
}