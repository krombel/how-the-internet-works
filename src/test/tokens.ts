// Reads a theme's tokens.css for tests: the day tokens (`:root[data-style='<id>']`) and the night overrides
// (`…[data-mode='night']`), as plain name → value maps. Read from disk: Vitest empties CSS imports, even ?raw.
import { readdirSync, readFileSync } from 'node:fs';

export interface ThemeTokens { day: Record<string, string>; night: Record<string, string> | null }

const decls = (body: string) =>
  Object.fromEntries([...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

export function parseTokens(css: string, theme: string): ThemeTokens {
  const block = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? null : decls(css.slice(at, css.indexOf('\n}', at)));
  };
  const root = `:root[data-style='${theme}']`;
  return { day: block(root) ?? {}, night: block(`${root}[data-mode='night']`) };
}

/** Follows var(--x) (and var(--x, fallback)) until a plain value is left. */
export function resolve(tokens: Record<string, string>, value: string, depth = 0): string {
  if (depth > 20) throw new Error(`var() loop at ${value}`);
  return value.replace(/var\(--([\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) => {
    const v = tokens[name] ?? fallback;
    if (v === undefined) throw new Error(`--${name} is not defined`);
    return resolve(tokens, v, depth + 1);
  });
}

export const themeTokens = () =>
  readdirSync('content/themes').map((id) => ({ id, ...parseTokens(readFileSync(`content/themes/${id}/tokens.css`, 'utf8'), id) }));
