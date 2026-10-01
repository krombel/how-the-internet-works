<script lang="ts">
  // The depth ladder (issues #22, #14, #32): the breadcrumb of the scene tree (each rung tappable to go back up),
  // where the rung you're on says what lies below it and opens into it:
  // - a path scene: how many doors lead further down (a small ladder and the count), and the list of them by verb;
  // - a layer dive, or a signal: the stack of envelopes at the hop (the current one lit, sealed ones with a lock),
  //   the signal that carries them at the bottom; a small pip stack shows where you are in it while it's folded.
  // It is folded by default, except a stack on a screen with room for it beside the scene (`roomy`). On a short
  // landscape screen the breadcrumb keeps its last two steps (the rest are in a list behind "…").
  // Both lists are disclosures (a button that shows a list of buttons, Tab between them); Escape folds one and puts
  // focus back on its button.
  import type { Below } from '../model/ladder';
  import { go } from '../router';
  import { fill, loadDiveStrings, loc, nameOf, nav, tr, trFirst, trl, view } from '../state.svelte';
  import { sceneTitle } from './caption';
  import Icon from './Icon.svelte';

  let { crumbs, below, short, roomy, quiet, onhot }: {
    crumbs: { title: string; path: string[] }[];
    /** What lies below the rung you're on. */
    below: Below | null;
    short: boolean;
    /** Room to keep a stack open beside the scene. */
    roomy: boolean;
    /** Hide it (a caught packet's panel names what you're looking at). */
    quiet: boolean;
    /** Point at a door in the scene (its badge glows), or stop (null). */
    onhot: (id: string | null) => void;
  } = $props();
  let open = $state<'crumbs' | 'below' | null>(null);
  let moreBtn = $state<HTMLButtonElement>(), hereBtn = $state<HTMLButtonElement>();
  function fold(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !open) return;
    const list = document.getElementById(open === 'crumbs' ? 'crumb-list' : 'below-list');
    if (list?.contains(document.activeElement)) (open === 'crumbs' ? moreBtn : hereBtn)?.focus();
    open = null;
    e.preventDefault();
  }
  /** A stack stays open on a roomy screen until it is folded. */
  let pinned = $state(true);
  const toggle = (p: 'crumbs' | 'below') => (open = open === p ? null : p);
  /** How many leading crumbs are folded into the "…" menu. */
  const cut = $derived(short && crumbs.length > 2 ? crumbs.length - 2 : 0);
  const label = (i: number) => (i === 0 && crumbs.length > 1 ? tr('nav.home') : crumbs[i].title);
  const here = $derived(crumbs[crumbs.length - 1].path);
  const stackPinned = $derived(roomy && pinned && below?.kind === 'stack');
  const shown = $derived(!!below && !quiet && (open === 'below' || stackPinned));
  // the list folds when it would list something else: another scene's doors, or another hop's stack (its envelopes'
  // paths name the hop)
  const key = $derived(below?.kind === 'stack' ? below.rungs.filter((g) => g.layer).map((g) => g.path.join('/')).join(' ') : here.join('/'));
  $effect.pre(() => { void key; open = null; });
  // a door pointed at in the list stops glowing when the list goes (Escape, a scene change)
  $effect(() => { if (!shown) onhot(null); });
  // doors down into dives are named by their scenes, whose strings come with the dives
  $effect(() => { if (shown) void loadDiveStrings(); });
  function toggleBelow() {
    if (below?.kind === 'stack' && roomy) { pinned = !shown; open = null; }
    else toggle('below');
  }
  const heading = $derived.by(() => {
    if (!below) return '';
    if (below.kind === 'doors') {
      const n = below.doors.length;
      return fill(trFirst([`ladder.doors.${new Intl.PluralRules(loc.lang).select(n)}`, 'ladder.doors.other']), { n });
    }
    return below.hop ? fill(trl('ladder.stack'), { hop: nameOf(below.hop) }) : tr('door.up');
  });
  const icon: Record<string, 'look' | 'open'> = { dive: 'look', expand: 'open' };
  const title = (path: string[]) => sceneTitle(nav.route, path, view.orient);
  function pick(path: string[]) {
    onhot(null);
    if (!stackPinned) open = null;
    go({ path });
  }
</script>

<svelte:window onkeydown={fold} />
<nav class="crumbs card" class:hide={quiet} aria-label={tr('nav.where')}>
  {#if cut}
    <button class="btn" bind:this={moreBtn} aria-expanded={open === 'crumbs'} aria-controls="crumb-list" aria-label={tr('nav.more')} title={tr('nav.more')} onclick={() => toggle('crumbs')}>…</button>
  {/if}
  {#each crumbs.slice(cut) as c, j}
    {@const i = j + cut}
    {#if i}<span class="sep" aria-hidden="true">›</span>{/if}
    {#if i < crumbs.length - 1}
      <button class="btn" onclick={() => go({ path: c.path })}>{label(i)}</button>
    {:else if below}
      <button class="btn here" bind:this={hereBtn} aria-current="location" aria-expanded={shown} aria-controls="below-list" title={heading} onclick={toggleBelow}>
        <span class="here-name">{c.title}</span>
        {#if below.kind === 'doors'}
          <span class="below-count" aria-hidden="true"><Icon name="ladder" />{below.doors.length}</span>
        {:else}
          <svg class="pips" viewBox="0 0 12 {below.rungs.length * 5 - 2}" preserveAspectRatio="none" aria-hidden="true">
            {#each below.rungs as r, k}
              <rect y={k * 5} width="12" height="3" rx="1.5" class:on={k === below.here} class:signal={!r.layer} />
            {/each}
          </svg>
        {/if}
      </button>
    {:else}<span class="here" aria-current="location">{c.title}</span>{/if}
  {/each}
</nav>
{#if open === 'crumbs' && cut}
  <div class="pop card crumb-menu" id="crumb-list">
    <h3>{tr('nav.more')}</h3>
    {#each crumbs.slice(0, cut) as c, i}
      <button class="btn" onclick={() => { open = null; go({ path: c.path }); }}>{label(i)}</button>
    {/each}
  </div>
{/if}
{#if shown && below}
  <div class="pop card ladder" class:pinned={stackPinned} id="below-list">
    <h3 dir="auto">{heading}</h3>
    {#if below.kind === 'doors'}
      {#each below.doors as d (d.path.join('/'))}
        {@const id = d.path[d.path.length - 1]}
        <button class="btn rung door-{d.kind}" onclick={() => pick(d.path)}
          onpointerenter={() => onhot(id)} onpointerleave={() => onhot(null)} onfocus={() => onhot(id)} onblur={() => onhot(null)}>
          <Icon name={icon[d.kind] ?? 'look'} /><span dir="auto">{title(d.path)}</span>
        </button>
      {/each}
    {:else}
      {#each below.rungs as r, k (r.path.join('/'))}
        <button class="btn rung" class:signal={!r.layer} class:door-down={!r.layer} class:on={k === below.here}
          aria-current={k === below.here ? 'location' : undefined} onclick={() => pick(r.path)}>
          {#if !r.layer}<Icon name="wave" />{/if}
          <span dir="auto">{r.layer ? trl(`layer.${r.layer}.name`) : title(r.path)}</span>
          {#if r.sealed}<span class="lock" role="img" aria-label={trl('peek.sealed')} title={trl('peek.sealed')}><Icon name="lock" /></span>{/if}
        </button>
      {/each}
    {/if}
  </div>
{/if}
