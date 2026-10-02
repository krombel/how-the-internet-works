import { mount } from 'svelte';
import App from './App.svelte';
import './ui/ui.css';
import { eraOf, nowEra } from './model/registry';
import { loadPack } from './model/strings';
import { current } from './router';
import { loadDiveStrings, loadPastStrings, loadTheme, settings } from './state.svelte';

// In dev, check all content (schemas + cross-references) and fail loudly into Vite's overlay with helpful messages.
// The validator (and zod) never ships in the production bundle.
if (import.meta.env.DEV) {
  const { validateAll } = await import('./model/validate-all');
  await validateAll();
}
// The first theme is loaded before mounting so the first paint already has the right art and fonts.
// Switching later re-renders in place (see the style effect in App.svelte).
// The same for the language in the link, so a Danish link doesn't flash English first, and for the dive strings
// when the link goes below the overview (into a dive, "router~ip", or a group that holds some), and for the words
// of the past when it goes to a place of another era (#59).
const start = current();
const past = start.places.some((p) => eraOf(p) !== nowEra());
await Promise.all([loadTheme(settings.style), loadPack(start.lang), start.path.length > 0 && loadDiveStrings(), past && loadPastStrings()]);
mount(App, { target: document.body });
