'use client';

import { DesignEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Eye, Plus } from 'lucide-react';

interface TimelineProps {
  entries: DesignEntry[];
  onEntrySelect: (entry: DesignEntry) => void;
  onNewVersion: (entryId: string) => void;
}

export function Timeline({ entries, onEntrySelect, onNewVersion }: TimelineProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (entries.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No design entries yet</p>
          <p className="text-sm text-muted-foreground">
            Upload your first design to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Design Timeline</CardTitle>
        <CardDescription>
          View all your design entries and their evolution over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <img
                    src={entry.image_url || ''}
                    alt="Design thumbnail"
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  {(entry.design_versions && entry.design_versions.length > 0) && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {entry.design_versions.length + 1}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {entry.name || `Design Entry #${entries.length - index}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEntrySelect(entry)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNewVersion(entry.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Version
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {entry.context || 'No context provided'}
                  </p>
                  
                  {entry.inquiries && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      Questions: {entry.inquiries}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}