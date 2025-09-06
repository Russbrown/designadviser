'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mb-4 mt-6 first:mt-0 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14px] font-bold text-black mb-1 mt-6 first:mt-0" style={{ fontFamily: 'var(--font-instrument-sans), ui-sans-serif, system-ui' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-bold text-black mb-1 mt-5 first:mt-0" style={{ fontFamily: 'var(--font-instrument-sans), ui-sans-serif, system-ui' }}>
              {children}
            </h3>
          ),
          
          // Custom paragraph styles
          p: ({ children }) => (
            <p className="text-[14px] text-black mb-2 leading-relaxed">
              {children}
            </p>
          ),
          
          // Custom list styles
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 space-y-0 mb-4 text-[14px] text-black [&_ul]:mt-2 [&_ul]:mb-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 space-y-0 mb-4 text-[14px] text-black [&_ol]:mt-2 [&_ol]:mb-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-2 leading-relaxed text-wrap text-[14px] text-black">{children}</li>
          ),
          
          // Custom code styles
          code: ({ children, ...props }) => {
            const inline = !props.className;
            return inline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          
          // Custom blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          
          // Custom strong/bold styles
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          
          // Custom emphasis/italic styles
          em: ({ children }) => (
            <em className="italic text-foreground">
              {children}
            </em>
          ),
          
          // Custom link styles
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-primary hover:text-primary/80 underline" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Custom horizontal rule
          hr: () => (
            <hr className="border-t border-border my-6" />
          ),
          
          // Custom table styles
          table: ({ children }) => (
            <table className="w-full border-collapse border border-border mb-4">
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted font-semibold text-left text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-sm">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}