import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { ClipboardCopy, ClipboardPaste, Delete, EyeOff, Keyboard, RotateCcw, Shuffle, X } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { useT } from './LanguageContext';

export const SCRAMBLED_KEYBOARD_KEY = 'xkey_scrambled_keyboard_enabled';
export const SCRAMBLED_KEYBOARD_MODE_KEY = 'xkey_scrambled_keyboard_mode';

const ScrambledKeyboardContext = createContext(null);

const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DIGITS = '0123456789'.split('');
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/'.split('');
const BLOCKED_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'radio', 'range', 'reset', 'submit']);
const SENSITIVE_HINTS = ['password', 'private', 'seed', 'mnemonic', 'phrase', 'key', 'pin', 'backup', 'secret'];

const shuffle = (items) => {
  const next = [...items];
  const cryptoObj = globalThis.crypto;
  for (let i = next.length - 1; i > 0; i -= 1) {
    let r = Math.random();
    if (cryptoObj?.getRandomValues) {
      r = cryptoObj.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
    }
    const j = Math.floor(r * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const setNativeValue = (element, value) => {
  const proto = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(element, value);
  const InputEventCtor = typeof InputEvent === 'function' ? InputEvent : Event;
  element.dispatchEvent(new InputEventCtor('input', { bubbles: true, inputType: 'insertText', data: null }));
};

const isEditableElement = (target) => {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return false;
  if (target.readOnly && target.dataset.scrambledManaged !== 'true') return false;
  if (target.disabled) return false;
  if (target instanceof HTMLInputElement && BLOCKED_INPUT_TYPES.has(target.type)) return false;
  return true;
};

const isSensitiveElement = (element) => {
  if (element.dataset.secureInput === 'true' || element.dataset.scrambledManaged === 'true') return true;
  if (element instanceof HTMLInputElement && element.type === 'password') return true;
  const haystack = [
    element.name,
    element.id,
    element.placeholder,
    element.getAttribute('aria-label'),
    element.getAttribute('autocomplete'),
  ].join(' ').toLowerCase();
  return SENSITIVE_HINTS.some(hint => haystack.includes(hint));
};

export function useScrambledKeyboard() {
  const ctx = useContext(ScrambledKeyboardContext);
  if (!ctx) throw new Error('useScrambledKeyboard must be used within ScrambledKeyboardProvider');
  return ctx;
}

export function ScrambledKeyboardProvider({ children }) {
  const [enabled, setEnabledState] = useState(false);
  const [mode, setModeState] = useState('sensitive');
  const [active, setActive] = useState(null);
  const [shift, setShift] = useState(false);
  const [keys, setKeys] = useState(() => shuffle([...LOWER, ...DIGITS, ...SYMBOLS]));
  const activeRef = useRef(null);
  const t = useT();

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    Preferences.get({ key: SCRAMBLED_KEYBOARD_KEY })
      .then(({ value }) => setEnabledState(value === 'true'))
      .catch(() => {});
    Preferences.get({ key: SCRAMBLED_KEYBOARD_MODE_KEY })
      .then(({ value }) => setModeState(value === 'all' ? 'all' : 'sensitive'))
      .catch(() => {});
  }, []);

  const setEnabled = useCallback((next) => {
    const normalized = !!next;
    setEnabledState(normalized);
    Preferences.set({ key: SCRAMBLED_KEYBOARD_KEY, value: normalized ? 'true' : 'false' }).catch(() => {});
    if (!normalized) setActive(null);
  }, []);

  const setMode = useCallback((next) => {
    const normalized = next === 'all' ? 'all' : 'sensitive';
    setModeState(normalized);
    Preferences.set({ key: SCRAMBLED_KEYBOARD_MODE_KEY, value: normalized }).catch(() => {});
  }, []);

  const reshuffle = useCallback(() => {
    setKeys(shuffle([...LOWER, ...DIGITS, ...SYMBOLS]));
  }, []);

  const openKeyboard = useCallback((config) => {
    if (!enabled) return;
    const rawValue = String(config.value || config.element?.value || '');
    const cursor = Number.isInteger(config.cursor) ? config.cursor : rawValue.length;
    setShift(false);
    setKeys(shuffle([...LOWER, ...DIGITS, ...SYMBOLS]));
    setActive({
      value: rawValue,
      cursor: Math.max(0, Math.min(rawValue.length, cursor)),
      label: config.label || config.element?.placeholder || config.element?.name || config.element?.id || '',
      onChange: config.onChange,
      element: config.element || null,
      masked: config.masked ?? config.element?.type === 'password',
      history: [],
    });
  }, [enabled]);

  const openKeyboardForElement = useCallback((element) => {
    if (!enabled || !isEditableElement(element)) return;
    const cursor = Number.isInteger(element.selectionStart) ? element.selectionStart : element.value.length;
    openKeyboard({
      element,
      value: element.value,
      cursor,
      label: element.getAttribute('aria-label') || element.placeholder || element.name || element.id,
      masked: element.type === 'password',
    });
  }, [enabled, openKeyboard]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (event) => {
      if (event.target?.closest?.('[data-scrambled-keyboard="true"]')) return;
      const target = event.target;
      if (!isEditableElement(target)) return;
      if (mode !== 'all' && !isSensitiveElement(target)) return;
      event.preventDefault();
      event.stopPropagation();
      target.blur();
      openKeyboardForElement(target);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [enabled, mode, openKeyboardForElement]);

  const closeKeyboard = useCallback(() => setActive(null), []);

  const applyValue = useCallback((nextValue, nextCursor, pushHistory = true) => {
    const current = activeRef.current;
    if (!current) return;
    const safeCursor = Math.max(0, Math.min(nextValue.length, nextCursor));
    if (current.element) {
      setNativeValue(current.element, nextValue);
      try {
        current.element.setSelectionRange(safeCursor, safeCursor);
      } catch {
        // Some input types do not support selection ranges.
      }
    }
    current.onChange?.({ target: { value: nextValue } });
    setActive(prev => prev ? {
      ...prev,
      value: nextValue,
      cursor: safeCursor,
      history: pushHistory ? [...prev.history, { value: prev.value, cursor: prev.cursor }] : prev.history,
    } : prev);
  }, []);

  const insertText = useCallback((text) => {
    const current = activeRef.current;
    if (!current) return;
    hapticTap();
    const before = current.value.slice(0, current.cursor);
    const after = current.value.slice(current.cursor);
    applyValue(`${before}${text}${after}`, current.cursor + text.length);
  }, [applyValue]);

  const pressKey = useCallback((key) => {
    const char = shift && /^[a-z]$/.test(key) ? key.toUpperCase() : key;
    insertText(char);
  }, [insertText, shift]);

  const backspace = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.cursor <= 0) return;
    hapticTap();
    applyValue(`${current.value.slice(0, current.cursor - 1)}${current.value.slice(current.cursor)}`, current.cursor - 1);
  }, [applyValue]);

  const clear = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    hapticTap();
    applyValue('', 0);
  }, [applyValue]);

  const moveCursor = useCallback((delta) => {
    const current = activeRef.current;
    if (!current) return;
    hapticTap();
    setActive(prev => prev ? { ...prev, cursor: Math.max(0, Math.min(prev.value.length, prev.cursor + delta)) } : prev);
  }, []);

  const setCursorFromPreview = useCallback((event) => {
    const current = activeRef.current;
    if (!current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 1;
    const nextCursor = Math.max(0, Math.min(current.value.length, Math.round(current.value.length * ratio)));
    hapticTap();
    setActive(prev => prev ? { ...prev, cursor: nextCursor } : prev);
  }, []);

  const undo = useCallback(() => {
    const current = activeRef.current;
    const previous = current?.history?.[current.history.length - 1];
    if (!current || !previous) return;
    hapticTap();
    if (current.element) {
      setNativeValue(current.element, previous.value);
      try {
        current.element.setSelectionRange(previous.cursor, previous.cursor);
      } catch {
        // Ignore unsupported selection ranges.
      }
    }
    current.onChange?.({ target: { value: previous.value } });
    setActive(prev => prev ? {
      ...prev,
      value: previous.value,
      cursor: previous.cursor,
      history: prev.history.slice(0, -1),
    } : prev);
  }, []);

  const copyValue = useCallback(async () => {
    const current = activeRef.current;
    if (!current) return;
    await navigator.clipboard.writeText(current.value);
    hapticTap();
  }, []);

  const pasteValue = useCallback(async () => {
    const text = await navigator.clipboard.readText();
    if (text) insertText(text);
  }, [insertText]);

  const preview = useMemo(() => {
    if (!active) return null;
    const display = active.masked ? '•'.repeat(active.value.length) : active.value;
    return {
      before: display.slice(0, active.cursor),
      after: display.slice(active.cursor),
    };
  }, [active]);

  const value = useMemo(() => ({
    enabled,
    setEnabled,
    mode,
    setMode,
    openKeyboard,
    openKeyboardForElement,
    closeKeyboard,
  }), [enabled, setEnabled, mode, setMode, openKeyboard, openKeyboardForElement, closeKeyboard]);

  return (
    <ScrambledKeyboardContext.Provider value={value}>
      {children}
      {enabled && active && (
        <div data-scrambled-keyboard="true" className="app-scaled-icons fixed inset-x-0 bottom-0 z-[300] border-t border-surface-700 bg-surface-950/98 p-3 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-surface-300">
                <Keyboard size={16} className="text-cyan-300" />
                <span className="truncate">{active.label || t('settings.scrambledKeyboardTitle')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={reshuffle} className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs font-semibold text-cyan-200" title={t('settings.scrambledKeyboardShuffle')}>
                  <Shuffle size={14} />
                </button>
                <button type="button" onClick={closeKeyboard} className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs font-semibold text-surface-200">
                  <X size={14} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={setCursorFromPreview}
              className="mb-2 block w-full rounded-lg border border-cyan-500/30 bg-surface-900 px-3 py-2 text-left font-mono text-sm text-surface-200"
            >
              {active.value ? (
                <span className="break-all">
                  {preview.before}<span className="mx-0.5 animate-pulse text-cyan-300">|</span>{preview.after}
                </span>
              ) : (
                <span><span className="animate-pulse text-cyan-300">|</span><span className="ml-1 text-surface-600">{t('settings.scrambledKeyboardInputHint')}</span></span>
              )}
            </button>

            <div className="mb-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              <button type="button" onClick={copyValue} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-[0.65rem] font-bold text-surface-200"><ClipboardCopy size={14} /> <span className="truncate">{t('settings.scrambledKeyboardCopy')}</span></button>
              <button type="button" onClick={pasteValue} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-[0.65rem] font-bold text-surface-200"><ClipboardPaste size={14} /> <span className="truncate">{t('settings.scrambledKeyboardPaste')}</span></button>
              <button type="button" onClick={undo} disabled={!active.history.length} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-[0.65rem] font-bold text-surface-200 disabled:opacity-40"><RotateCcw size={14} /> <span className="truncate">{t('settings.scrambledKeyboardUndo')}</span></button>
              <button type="button" onClick={() => moveCursor(-1)} className="flex min-h-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs font-bold text-surface-200" title={t('settings.scrambledKeyboardLeft')}>←</button>
              <button type="button" onClick={() => moveCursor(1)} className="flex min-h-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs font-bold text-surface-200" title={t('settings.scrambledKeyboardRight')}>→</button>
              <button type="button" onClick={() => moveCursor(-Math.max(1, Math.min(8, active.cursor)))} className="flex min-h-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs font-bold text-surface-200" title={t('settings.scrambledKeyboardUp')}>↑</button>
              <button type="button" onClick={() => moveCursor(Math.max(1, Math.min(8, active.value.length - active.cursor)))} className="flex min-h-10 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 px-2 py-2 text-xs font-bold text-surface-200" title={t('settings.scrambledKeyboardDown')}>↓</button>
              <button type="button" onClick={clear} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-[0.65rem] font-bold text-red-300"><EyeOff size={14} /> <span className="truncate">{t('settings.scrambledKeyboardClear')}</span></button>
            </div>

            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
              {keys.map((key, index) => (
                <button
                  type="button"
                  key={`${key}-${index}`}
                  onClick={() => pressKey(key)}
                  className="rounded-lg border border-surface-700 bg-surface-800 py-2 text-sm font-bold text-white active:bg-cyan-500/20"
                >
                  {shift && /^[a-z]$/.test(key) ? key.toUpperCase() : key}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              <button type="button" onClick={() => setShift(prev => !prev)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${shift ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-surface-700 bg-surface-800 text-surface-200'}`}>{t('settings.scrambledKeyboardShift')}</button>
              <button type="button" onClick={() => pressKey(' ')} className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs font-bold text-surface-200">{t('settings.scrambledKeyboardSpace')}</button>
              <button type="button" onClick={backspace} className="flex items-center justify-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs font-bold text-surface-200"><Delete size={15} /> <span className="truncate">{t('settings.scrambledKeyboardBackspace')}</span></button>
              <button type="button" onClick={closeKeyboard} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </ScrambledKeyboardContext.Provider>
  );
}
