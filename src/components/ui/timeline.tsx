'use client';

import { DesignEntry, TextUpdate, TimelineItem, isDesignEntry, isTextUpdate } from '@/types';
import { Clock } from 'lucide-react';
import { TextUpdateCard } from '@/components/ui/text-update-card';

interface TimelineProps {
  timelineItems: TimelineItem[];
  onEntrySelect: (entry: DesignEntry) => void;
  onNewVersion: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onTextUpdateSelect?: (textUpdate: TextUpdate) => void;
}

export function Timeline({ timelineItems, onEntrySelect, onNewVersion, onDeleteEntry, onTextUpdateSelect }: TimelineProps) {
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
      <div className="w-full p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No timeline items yet</p>
        <p className="text-sm text-muted-foreground">
          Upload your first design or add a text update to get started
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-3">
          {timelineItems.map((item, index) => {
            if (isDesignEntry(item)) {
              // Render design entry
              return (
                <div
                  key={item.id}
                  className="relative rounded-[8px] border border-[#e9eff1] cursor-pointer"
                  style={{
                    backgroundImage: 'url(/NOISE.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                  onClick={() => onEntrySelect(item)}
                >
                  <div className="flex gap-4 items-start justify-start p-3 relative w-full">
                    {/* Design Image */}
                    <div 
                      className="bg-center bg-cover bg-no-repeat h-[42px] shrink-0 w-[100px] rounded-md"
                      style={{ 
                        backgroundImage: `url('${item.image_url || ''}')`,
                        backgroundColor: '#e2e8f0'
                      }}
                    />
                    
                    {/* Card Content */}
                    <div className="flex-1 flex flex-col gap-1 items-start justify-start min-w-0">
                      <div className="flex items-start justify-between w-full">
                        {/* Title and Date */}
                        <div className="flex flex-col gap-0.5 items-start justify-start">
                          <div className="font-medium text-[#23282a] text-[16px] leading-normal">
                            {item.name || `Design Entry #${index + 1}`}
                          </div>
                          <div className="font-normal text-[#8f9699] text-[11px] leading-normal">
                            {formatDate(item.created_at)}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 items-center justify-start" onClick={(e) => e.stopPropagation()}>
                          {/* Version Count */}
                          {(item.design_versions && item.design_versions.length > 0) && (
                            <div className="font-medium text-[#6f7476] text-[10px] leading-normal whitespace-nowrap">
                              {item.design_versions.length + 1} Versions
                            </div>
                          )}
                          
                          {/* Add Version Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNewVersion(item.id);
                            }}
                            title="New version"
                            className="flex gap-2.5 items-center justify-center rounded-[6px] size-5 hover:bg-black/5 transition-colors"
                          >
                            <div className="overflow-hidden relative shrink-0 size-[18px]">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-90">
                                <g clipPath="url(#clip0_70_1434)">
                                  <path d="M12.25 10L10 10M10 10L7.75 10M10 10L10 7.75M10 10L10 12.25" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M17.5 10C17.5 13.5355 17.5 15.3033 16.4017 16.4017C15.3033 17.5 13.5355 17.5 10 17.5C6.46447 17.5 4.6967 17.5 3.59835 16.4017C2.5 15.3033 2.5 13.5355 2.5 10C2.5 6.46447 2.5 4.6967 3.59835 3.59835C4.6967 2.5 6.46447 2.5 10 2.5C13.5355 2.5 15.3033 2.5 16.4017 3.59835C17.132 4.32865 17.3767 5.35491 17.4587 7" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
                                </g>
                                <defs>
                                  <clipPath id="clip0_70_1434">
                                    <rect width="18" height="18" fill="white" transform="translate(1 1)"/>
                                  </clipPath>
                                </defs>
                              </svg>
                            </div>
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEntry(item.id);
                            }}
                            title="Delete design"
                            className="flex gap-2.5 items-center justify-center rounded-[6px] size-5 hover:bg-red-50 transition-colors"
                          >
                            <div className="overflow-hidden relative shrink-0 size-[18px]">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-90">
                                <path d="M7.87793 4C8.18681 3.12611 9.02024 2.5 9.9999 2.5C10.9796 2.5 11.813 3.12611 12.1219 4" stroke="#D4213C" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M16.3751 5.5H3.625" stroke="#D4213C" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M14.78 12.5493C14.6473 14.5405 14.5809 15.5361 13.9322 16.1431C13.2834 16.75 12.2856 16.75 10.29 16.75H9.70999C7.71439 16.75 6.71659 16.75 6.06783 16.1431C5.41907 15.5361 5.3527 14.5405 5.21996 12.5493L4.875 7.375M15.125 7.375L14.975 9.625" stroke="#D4213C" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M8.125 9.25L8.5 13" stroke="#D4213C" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M11.875 9.25L11.5 13" stroke="#D4213C" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                          </button>
                          
                          {/* Arrow Icon */}
                          <div className="overflow-hidden relative shrink-0 size-5">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3.3335 10H5.41683M16.6668 10L11.6668 5M16.6668 10L11.6668 15M16.6668 10H7.91683" stroke="#23282A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (isTextUpdate(item)) {
              // Render text update
              return (
                <TextUpdateCard
                  key={item.id}
                  textUpdate={item}
                  onClick={() => onTextUpdateSelect?.(item)}
                />
              );
            }
            
            return null;
          })}
      </div>
    </div>
  );
}