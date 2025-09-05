'use client';

import { TextUpdate } from '@/types';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface TextUpdateCardProps {
  textUpdate: TextUpdate;
  onClick?: () => void;
}

export function TextUpdateCard({ textUpdate, onClick }: TextUpdateCardProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div 
      className="bg-[#f9fcfd] relative rounded-[8px] border border-[#e9eff1] cursor-pointer hover:bg-[#f4f9fb] transition-colors"
      onClick={onClick}
    >
      <div className="flex gap-4 items-start justify-start p-3 relative w-full">
        {/* Text Icon */}
        <div className="flex gap-2.5 items-center justify-center relative shrink-0 w-[49px]">
          <div className="overflow-hidden relative rounded-[5px] shrink-0 size-7">
            <svg width="29" height="28" viewBox="0 0 29 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.8335 14H11.0002M19.1668 14H14.5002" stroke="#8F9699" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M19.1668 9.33301H18.0002M14.5002 9.33301H9.8335" stroke="#8F9699" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9.8335 18.667H15.6668" stroke="#8F9699" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 16.333V11.6663C4 7.26657 4 5.06668 5.36684 3.69984C6.73367 2.33301 8.93356 2.33301 13.3333 2.33301H15.6667C20.0664 2.33301 22.2663 2.33301 23.6332 3.69984C24.3952 4.46189 24.7324 5.48288 24.8816 6.99967M25 11.6663V16.333C25 20.7328 25 22.9327 23.6332 24.2995C22.2663 25.6663 20.0664 25.6663 15.6667 25.6663H13.3333C8.93356 25.6663 6.73367 25.6663 5.36684 24.2995C4.60479 23.5375 4.2676 22.5165 4.11841 20.9997" stroke="#8F9699" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="flex-1 flex items-start justify-between min-w-0">
          <div className="flex flex-col gap-2 items-start justify-start flex-1 min-w-0">
            {/* Title and Date */}
            <div className="flex flex-col gap-0.5 items-start justify-start w-full">
              <div className="font-medium text-[#23282a] text-[16px] leading-normal">
                Text Update
              </div>
              <div className="font-normal text-[#8f9699] text-[11px] leading-normal">
                {formatDate(textUpdate.created_at)}
              </div>
            </div>
            
            {/* Content */}
            <div className="font-normal text-[#6f7476] text-[12px] leading-normal w-full">
              <MarkdownRenderer 
                content={textUpdate.content} 
                className="prose prose-sm max-w-none [&>p]:m-0 [&>*]:text-[#6f7476]"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 items-center justify-start ml-4">
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add delete functionality for text updates
              }}
              title="Delete text update"
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
  );
}