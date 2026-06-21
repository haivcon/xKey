import type { ReactNode } from 'react';

/**
 * Lightweight markdown renderer — converts basic markdown to React elements.
 * Supports: **bold**, *italic*, `code`, [links](url), - lists, and line breaks.
 * No external dependencies.
 */
type MarkdownRendererProps = {
  text?: string;
  className?: string;
};

export default function MarkdownRenderer({ text, className = '' }: MarkdownRendererProps) {
  if (!text) return null;

  const renderInline = (line: string, key: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let idx = 0;

    while (remaining.length > 0) {
      // Bold **text**
      let match = remaining.match(/\*\*(.+?)\*\*/);
      if (match && match.index === 0) {
        parts.push(<strong key={`${key}-${idx++}`} className="font-semibold text-white">{match[1]}</strong>);
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Inline code `text`
      match = remaining.match(/`(.+?)`/);
      if (match && match.index === 0) {
        parts.push(
          <code key={`${key}-${idx++}`} className="px-1 py-0.5 bg-surface-700 rounded text-brand-300 text-[11px] font-mono">
            {match[1]}
          </code>
        );
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Italic *text*
      match = remaining.match(/\*(.+?)\*/);
      if (match && match.index === 0) {
        parts.push(<em key={`${key}-${idx++}`} className="italic text-surface-300">{match[1]}</em>);
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Link [text](url)
      match = remaining.match(/\[(.+?)\]\((.+?)\)/);
      if (match && match.index === 0) {
        parts.push(
          <span key={`${key}-${idx++}`} className="text-cyan-400 underline underline-offset-2">
            {match[1]}
          </span>
        );
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Find next special char
      const nextSpecial = remaining.search(/[*`[]/);
      if (nextSpecial > 0) {
        parts.push(<span key={`${key}-${idx++}`}>{remaining.slice(0, nextSpecial)}</span>);
        remaining = remaining.slice(nextSpecial);
      } else {
        parts.push(<span key={`${key}-tail`}>{remaining}</span>);
        break;
      }
    }

    return parts;
  };

  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-0.5 ml-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-brand-400 mt-0.5 text-[8px]">●</span>
              <span className="flex-1">{renderInline(item, `li-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`br-${i}`} className="h-1" />);
      return;
    }

    // Heading ##
    if (trimmed.startsWith('## ')) {
      elements.push(
        <p key={`h-${i}`} className="text-xs font-bold text-white uppercase tracking-wider mt-1">
          {renderInline(trimmed.slice(3), `h-${i}`)}
        </p>
      );
      return;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`}>{renderInline(trimmed, `p-${i}`)}</p>
    );
  });

  flushList();

  return (
    <div className={`text-[11px] text-surface-400 leading-relaxed space-y-1 ${className}`}>
      {elements}
    </div>
  );
}
