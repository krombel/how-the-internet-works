import { mount } from 'svelte';
import App from './App.svelte';
import './ui/ui.css';
import { loadPack } from './model/strings';
import { current } from './router';
import { loadTheme, settings } from './state.svelte';

// In dev, check all content (schemas + cross-references) and fail loudly into Vite's overlay with helpful messages.
// The validator (and zod) never ships in the production bundle.
if (import.meta.env.DEV) {
  const { validateAll } = await import('./model/validate-all');
  await validateAll();
}
// The first theme is loaded before mounting so the first paint already has the right art and fonts.
// Switching later re-renders in place (see the style effect in App.svelte).
// The same for the language in the link, so a Danish link doesn't flash English first.
await Promise.all([loadTheme(settings.style), loadPack(current().lang)]);
mount(App, { target: document.body });
