import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSecureDisplay } from '../contexts/SecureDisplayContext';

const BASE_FONT_REM = 0.875;
const BASE_PADDING_REM = 0.5;
const BASE_LINE_HEIGHT_REM = 1.375;

export default function SecureGlyphText({ value, className = '', multiline = false }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(multiline ? 52 : 38);
  const { remapToSessionGlyphs } = useSecureDisplay();

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapRef.current;
    if (!canvas || !wrapper) return;

    const text = String(value || '');
    const glyphText = remapToSessionGlyphs(text);
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(160, Math.floor(wrapper.clientWidth || 160));
    const ctx = canvas.getContext('2d');
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fontSize = BASE_FONT_REM * rootFontSize;
    const padding = BASE_PADDING_REM * rootFontSize;
    const lineHeight = BASE_LINE_HEIGHT_REM * rootFontSize;
    const font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    ctx.font = font;
    const maxLineWidth = Math.max(40, width - padding * 2);
    const lines = multiline ? wrapSensitiveText(ctx, text, maxLineWidth) : [text];
    const height = Math.max(multiline ? 3.25 * rootFontSize : 2.375 * rootFontSize, padding * 2 + lines.length * lineHeight);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    setCanvasHeight(height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e5e7eb';

    let glyphIndex = 0;
    lines.forEach((line, lineIndex) => {
      let x = padding;
      const y = padding + lineIndex * lineHeight;
      Array.from(line).forEach((char) => {
        const mapped = glyphText[glyphIndex] || char;
        const charWidth = ctx.measureText(char).width;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((mapped.charCodeAt(0) % 5) - 2) * 0.002);
        ctx.fillText(char, 0, 0);
        ctx.restore();
        x += charWidth;
        glyphIndex += 1;
      });
      glyphIndex += 1;
    });
  }, [value, multiline, remapToSessionGlyphs]);

  useLayoutEffect(() => {
    const wrapper = wrapRef.current;
    if (!wrapper) return undefined;

    const observer = new ResizeObserver(() => {
      drawCanvas();
    });
    observer.observe(wrapper);
    drawCanvas();

    return () => observer.disconnect();
  }, [drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <span
      ref={wrapRef}
      className={`secure-glyph-text block select-none rounded bg-surface-800 ${className}`}
      data-secure-glyph="true"
      aria-label="Sensitive value rendered as secure display pixels"
      role="img"
      style={{ minHeight: canvasHeight }}
    >
      <canvas ref={canvasRef} className="block max-w-full" />
    </span>
  );
}

const wrapSensitiveText = (ctx, text, maxWidth) => {
  const words = String(text || '').split(/(\s+)/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const next = `${line}${word}`;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      line = word.trimStart();
      return;
    }

    if (!line && ctx.measureText(word).width > maxWidth) {
      let chunk = '';
      Array.from(word).forEach((char) => {
        if (chunk && ctx.measureText(`${chunk}${char}`).width > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      });
      line = chunk;
      return;
    }

    line = next;
  });

  if (line) lines.push(line.trimEnd());
  return lines.length ? lines : [''];
};
