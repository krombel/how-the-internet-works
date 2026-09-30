// Art takes every colour from its theme's tokens (var(--name)), so a theme's night mode can repaint it all.
// A colour that really is fixed (a fibre wavelength, a wire's insulation) carries a `fixed-colour: <why>` comment:
// on its own line it covers the lines after it up to the next blank line, at the end of a line it covers that line.
import { describe, expect, it } from 'vitest';
import { themeTokens } from '../test/tokens';

const art = import.meta.glob<string>('/content/**/*.{svelte,ts}', { eager: true, query: '?raw', import: 'default' });
// Definition files hold data colours (a technology's colour), which the schema checks instead.
const definition = /^\/content\/[\w-]+\/[\w-]+\/(node|technology|layer|scene|segment|place|activity|theme)\.ts$/;

const KEYWORDS = new Set(['none', 'currentcolor', 'transparent', 'inherit', 'initial', 'unset', 'context-fill', 'context-stroke']);
const LITERALS = [
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi,
  // a named colour in an attribute (fill="white") or a style rule (fill: white;)
  /\b(?:fill|stroke|stop-color|flood-color|lighting-color|color|background(?:-color)?)\s*(?:=\s*["']|:\s*)([a-z]+)\s*["';}]/gi,
];

function literals(src: string): string[] {
  const lines = src.split('\n');
  const found: string[] = [];
  let block = false;
  lines.forEach((line, i) => {
    if (!line.trim()) block = false;
    if (line.includes('fixed-colour:')) {
      if (/^\s*(\/\/|<!--|\/\*)/.test(line)) block = true;
      return;
    }
    if (block) return;
    for (const rx of LITERALS)
      for (const m of line.matchAll(rx)) if (m[1] === undefined || !KEYWORDS.has(m[1].toLowerCase())) found.push(`${i + 1}: ${m[0].trim()}`);
  });
  return found;
}

const themes = themeTokens();

describe('art colours', () => {
  it('uses theme tokens, not colour literals (or says why a colour is fixed)', () => {
    const bad = Object.entries(art)
      .filter(([file]) => !definition.test(file))
      .flatMap(([file, src]) => literals(src).map((l) => `${file}:${l}`));
    expect(bad, 'use var(--token) from tokens.css, or mark it `fixed-colour: <why>` (docs/authoring.md)').toEqual([]);
  });

  it('only uses tokens every theme defines', () => {
    const used = new Set(Object.values(art).flatMap((src) => [...src.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1])));
    for (const t of themes) expect([...used].filter((name) => !(name in t.day)), `missing in ${t.id}/tokens.css`).toEqual([]);
  });

  it('night only overrides tokens the day defines', () => {
    for (const t of themes) expect(Object.keys(t.night ?? {}).filter((name) => !(name in t.day)), `typo in ${t.id} night?`).toEqual([]);
  });

  it('flags literals and honours fixed-colour', () => {
    expect(literals('<rect fill="#fff" />\n<path stroke="white" />\nx = rgba(0, 0, 0, 0.2)')).toHaveLength(3);
    expect(literals('<rect fill="var(--paper)" stroke="none" />\n<path fill="currentColor" />')).toEqual([]);
    expect(literals('// fixed-colour: wavelengths\nconst c = [\n  "#e85d75",\n];\n\nconst d = "#123456";')).toEqual(['6: #123456']);
    expect(literals('const c = "#e85d75"; // fixed-colour: physics\nconst d = "#123";')).toEqual(['2: #123']);
  });
});
