import { mount } from 'svelte';
import App from './App.svelte';
import './ui/ui.css';
import { loadPack } from './model/strings';
import { current } from './router';
import { loadDiveStrings, loadTheme, settings } from './state.svelte';

// In dev, check all content (schemas + cross-references) and fail loudly into Vite's overlay with helpful messages.
// The validator (and zod) never ships in the production bundle.
if (import.meta.env.DEV) {
  const { validateAll } = await import('./model/validate-all');
  await validateAll();
  // TEMPORARY (PR #37): live tuning of the sideways travel timings with `?tune`; remove before merge
  if (new URLSearchParams(location.search).has('tune')) await import('./dev/tune');
}
// The first theme is loaded before mounting so the first paint already has the right art and fonts.
// Switching later re-renders in place (see the style effect in App.svelte).
// The same for the language in the link, so a Danish link doesn't flash English first, and for the dive strings
// when the link goes below the overview (into a dive, "router~ip", or a group that holds some).
const start = current();
await Promise.all([loadTheme(settings.style), loadPack(start.lang), start.path.length > 0 && loadDiveStrings()]);
mount(App, { target: document.body });
