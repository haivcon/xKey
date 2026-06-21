import { useState, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { Tag, X } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { useT } from '../contexts/LanguageContext';

type TagColor = {
  name: string;
  bg: string;
  text: string;
  border: string;
};

const TAG_COLORS: TagColor[] = [
  { name: 'blue', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  { name: 'green', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { name: 'amber', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  { name: 'red', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  { name: 'purple', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  { name: 'pink', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' },
  { name: 'cyan', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { name: 'orange', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
];

/** Get consistent color for a tag name */
const getTagColor = (tag: string): TagColor => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = ((hash << 5) - hash) + tag.charCodeAt(i);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export { TAG_COLORS, getTagColor };

/** Inline tag badge */
type TagBadgeProps = {
  tag: string;
  onRemove?: () => void;
  small?: boolean;
};

export function TagBadge({ tag, onRemove, small = false }: TagBadgeProps) {
  const color = getTagColor(tag);
  return (
    <span className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} rounded-full font-medium ${color.bg} ${color.text} border ${color.border}`}>
      {tag}
      {onRemove && (
        <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onRemove(); }} className="hover:opacity-70">
          <X size={small ? 8 : 10} />
        </button>
      )}
    </span>
  );
}

/** Tag editor for wallet edit mode */
type TagEditorProps = {
  tags?: string[];
  onChange: (tags: string[]) => void;
  allTags?: string[];
};

export function TagEditor({ tags = [], onChange, allTags = [] }: TagEditorProps) {
  const t = useT();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = allTags.filter(t => 
    !tags.includes(t) && t.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInputValue('');
    setShowSuggestions(false);
    hapticTap();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
    hapticTap();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <label className="block text-xs text-surface-400 uppercase tracking-wider mb-1">
        <Tag size={10} className="inline mr-1" />
        {t('createWallet.tags') || 'Tags'}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} />
        ))}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={t('createWallet.tagPlaceholder') || 'Add tag...'}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-20 max-h-32 overflow-y-auto">
            {suggestions.slice(0, 8).map(tag => (
              <button
                key={tag}
                onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                className="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
              >
                <TagBadge tag={tag} small />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
