<script lang="ts">
  // Top bar: breadcrumb, "What can I explore?", pause, style switcher (only when more than one theme is installed),
  // language, kid/nerd, sound. On a short landscape screen it is one slim row, and the breadcrumb keeps its last two
  // steps (the rest are in a menu behind "…").
  import { languages } from '../model/strings';
  import { go } from '../router';
  import { loc, setLevel, setSound, settings, syncUrl, THEME_IDS, themeSwatches, tr } from '../state.svelte';
  import Icon from './Icon.svelte';

  let { crumbs, small, short, wide, explore, canExplore, ontoggle, paused, onpause, quiet }: {
    crumbs: { title: string; path: string[] }[]; small: boolean;
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
  let open = $state<'style' | 'crumbs' | null>(null);
  const toggle = (p: 'style' | 'crumbs') => (open = open === p ? null : p);
  /** How many leading crumbs are folded into the "…" menu. */
  const cut = $derived(short && crumbs.length > 2 ? crumbs.length - 2 : 0);
  const label = (i: number) => (i === 0 && crumbs.length > 1 ? tr('nav.home') : crumbs[i].title);
  function pick(id: string) { settings.style = id; syncUrl(); open = null; }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && open && ((open = null), e.stopPropagation())} />
<nav class="chrome" data-ui>
  <div class="crumbs card" class:hide={quiet} aria-hidden={quiet}>
    {#if cut}
      <button class="btn" aria-haspopup="true" aria-expanded={open === 'crumbs'} title={tr('nav.more')} onclick={() => toggle('crumbs')}>…</button>
    {/if}
    {#each crumbs.slice(cut) as c, j}
      {@const i = j + cut}
      {#if i}<span class="sep" aria-hidden="true">›</span>{/if}
      {#if i < crumbs.length - 1}
        <button class="btn" onclick={() => go({ path: c.path })}>{label(i)}</button>
      {:else}<span class="here">{c.title}</span>{/if}
    {/each}
  </div>
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
      <button class="card btn" aria-haspopup="true" aria-expanded={open === 'style'} onclick={() => toggle('style')} title={tr('ui.style')}>
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
    <div class="card">
      <button class="btn icon-btn" aria-pressed={settings.sound} title={tr(settings.sound ? 'ui.soundOn' : 'ui.soundOff')} onclick={() => setSound(!settings.sound)}><Icon name={settings.sound ? 'soundOn' : 'soundOff'} /></button>
    </div>
  </div>
  {#if open === 'crumbs' && cut}
    <div class="pop card crumb-menu" role="menu">
      <h3>{tr('nav.more')}</h3>
      {#each crumbs.slice(0, cut) as c, i}
        <button class="btn" role="menuitem" onclick={() => { open = null; go({ path: c.path }); }}>{label(i)}</button>
      {/each}
    </div>
  {/if}
  {#if open === 'style'}
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
