declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<Record<string, unknown>>;
  export default component;
}

declare module 'virtual:string-packs' {
  type Json = { [k: string]: string | Json };
  const loaders: Record<string, () => Promise<{ ui: Record<string, Json>; folders: Record<string, Json> }>>;
  export default loaders;
}

declare module 'virtual:dive-strings' {
  type Json = { [k: string]: string | Json };
  export const folders: Record<string, Json>;
}

declare module 'virtual:past-strings' {
  type Json = { [k: string]: string | Json };
  export const folders: Record<string, Json>;
}

/** The app's credit and source (vite.config.ts, from package.json). */
declare const __ABOUT__: { name: string; author: string; year: number; license: string; source: string };
