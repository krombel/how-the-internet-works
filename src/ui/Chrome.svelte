<script lang="ts">
  // Top bar: the depth ladder (breadcrumb, Ladder.svelte), "What can I explore?", pause, style switcher (only when
  // more than one theme is installed), language, kid/nerd, day/night (when the theme has a night), sound. On a short
  // landscape screen it is one slim row.
  import type { Below } from '../model/ladder';
  import { languages } from '../model/strings';
  import { go } from '../router';
  import { hasNight, loc, setLevel, setMode, setSound, settings, syncUrl, THEME_IDS, themeSwatches, tr, view } from '../state.svelte';
  import Icon from './Icon.svelte';
  import Ladder from './Ladder.svelte';

  let { crumbs, below, roomy, onhot, small, short, wide, explore, canExplore, ontoggle, paused, onpause, quiet }: {
    crumbs: { title: string; path: string[] }[]; small: boolean;
    /** What lies below the scene you're in (the ladder's last rung), room to keep a stack open, pointing at a door. */
    below: Below | null; roomy: boolean; onhot: (id: string | null) => void;
    /** A short landscape screen (a phone on its side). */
    short: boolean;
    /** Room for the long "What can I explore?" label. */
    wide: boolean;
    /** "What can I explore?" is on / there's anything to explore in this scene. */
    explore: boolean; canExplore: boolean; ontoggle: () => void;
    /** Traffic is frozen; pausing is offered (path scenes only). */
    paused: boolean; onpause?: () => void;
    /** Hide the breadcrumb (a caught packet's panel names what you're looking at). */
    quiet: boolean;
  } = $props();
  let open = $state(false);
  function pick(id: string) { settings.style = id; syncUrl(); open = false; }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && open && ((open = false), e.preventDefault())} />
<nav class="chrome" data-ui>
  <Ladder {crumbs} {below} {short} {roomy} {quiet} {onhot} />
  <div class="controls">
    <div class="card">
      <button class="btn explore-btn" aria-pressed={explore} disabled={!canExplore} title={tr('explore.title')} onclick={ontoggle}>
        <Icon name="explore" /><span dir="auto">{tr(wide ? 'explore.title' : 'explore.short')}</span>
      </button>
    </div>
    {#if onpause}
      <div class="card">
        <button class="btn icon-btn" aria-pressed={paused} title={tr(paused ? 'ui.play' : 'ui.pause')} onclick={onpause}><Icon name={paused ? 'play' : 'pause'} /></button>
      </div>
    {/if}
    {#if THEME_IDS.length > 1}
      <button class="card btn" aria-haspopup="true" aria-expanded={open} onclick={() => (open = !open)} title={tr('ui.style')}>
        <span class="swatch" style:background={themeSwatches[settings.style]}></span>
        {#if !small}<span>{tr(`theme.${settings.style}.name`)}</span>{/if}
        <Icon name="down" />
      </button>
    {/if}
    <div class="card seg" role="group" aria-label={tr('ui.language')}>
      {#each languages as l}
        <button class="btn" class:on={loc.lang === l.code} lang={l.code} title={l.name} onclick={() => go({ lang: l.code }, true)}>{small ? l.code.toUpperCase() : l.name}</button>
      {/each}
    </div>
    <div class="card seg" role="group" aria-label={tr('ui.level')}>
      {#each ['kid', 'nerd'] as const as lv}
        <button class="btn" class:on={loc.level === lv} onclick={() => setLevel(lv)}>{tr(small ? `mode.${lv}.short` : `mode.${lv}`)}</button>
      {/each}
    </div>
    {#if hasNight()}
      <div class="card">
        <button class="btn icon-btn" aria-pressed={view.mode === 'night'} title={tr(`ui.${view.mode}`)} onclick={() => setMode(view.mode === 'night' ? 'day' : 'night')}><Icon name={view.mode} /></button>
      </div>
    {/if}
    <div class="card">
      <button class="btn icon-btn" aria-pressed={settings.sound} title={tr(settings.sound ? 'ui.soundOn' : 'ui.soundOff')} onclick={() => setSound(!settings.sound)}><Icon name={settings.sound ? 'soundOn' : 'soundOff'} /></button>
    </div>
  </div>
  {#if open}
    <div class="pop card styles" role="menu">
      <h3>{tr('ui.style')}</h3>
      {#each THEME_IDS as id}
        <button class="btn" role="menuitemradio" aria-checked={settings.style === id} class:on={settings.style === id} onclick={() => pick(id)}>
          <span class="swatch" style:background={themeSwatches[id]}></span>{tr(`theme.${id}.name`)}
        </button>
      {/each}
    </div>
  {/if}
</nav>
