<script lang="ts">
  // Bottom caption: title + kid/nerd text, its notes (rush hour, #44; a nerd's extra, #31), the doors you can open from
  // here (as chips, by verb: the keyboard and screen-reader way in), "Read again" while read aloud is on (#53), a
  // gesture hint, where you are (tap to change) and "Want to know more?" (#4).
  // It may fold (`fold`, from `captionFold`) so the scene keeps the screen; its title is then a button that opens the
  // whole caption over the scene (Esc or the title folds it again), and it folds up again when the caption changes:
  // - `pill` (a short landscape screen): a one-line pill with the title;
  // - `card` (a portrait phone): the title, the text cut to two lines and the doors; where you are, the hint and
  //   learn-more links show once it's open. The text is all there for screen readers either way.
  // Hidden (during a flight, while a packet is caught), it is inert: nothing in it can be focused or read. Its title
  // takes focus when a navigation took it away (App.svelte); open over the scene and taller than the screen, it can be
  // focused to scroll it.
  import { loc, tr } from '../state.svelte';
  import type { CaptionDoor, CaptionFold, CaptionText } from './caption';
  import Icon from './Icon.svelte';
  let { text, place, onplace, ondoor, onhot, explore, catches, oncatch, onread, hidden, fold, el = $bindable() }: {
    text: CaptionText; place: string; onplace: () => void;
    /** Read the caption aloud again; no button without it (read aloud off, or no voice). */
    onread?: () => void;
    /** Packet kinds to catch here (issue #17), and catching one. */
    catches: { kind: string; name: string }[]; oncatch: (kind: string) => void;
    /** Open a door / point at it (its badge in the scene glows) or stop pointing (null). */
    ondoor: (d: CaptionDoor) => void; onhot: (id: string | null) => void;
    explore: boolean; hidden: boolean; fold: CaptionFold; el?: HTMLElement;
  } = $props();
  let openFor = $state<string | null>(null);
  /** The folded caption's height while it is open over the scene, so the scene doesn't move. */
  let foldH = $state(0);
  let toggleEl = $state<HTMLButtonElement>();
  const open = $derived(!!fold && openFor === text.title);
  $effect.pre(() => { void fold; openFor = null; });
  function toggle() {
    if (!open) foldH = el?.offsetHeight ?? 0;
    openFor = open ? null : text.title;
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !open || e.defaultPrevented) return;
    e.preventDefault();
    if (el?.contains(document.activeElement)) toggleEl?.focus();
    openFor = null;
  }
  const icon = { dive: 'look', expand: 'open', down: 'wave', up: 'envelope' } as const;
  let inner = $state<HTMLElement>(), scrolls = $state(false);
  $effect(() => {
    const p = inner;
    if (!p || !open) return void (scrolls = false);
    const ro = new ResizeObserver(() => (scrolls = p.scrollHeight > p.clientHeight));
    ro.observe(p);
    return () => ro.disconnect();
  });
  const verbs = $derived((['dive', 'expand', 'down', 'up'] as const).map((kind) => ({ kind, doors: text.doors.filter((d) => d.kind === kind) })).filter((v) => v.doors.length));
</script>

<svelte:window {onkeydown} />
<section class="caption card" class:hide={hidden} class:compact={fold === 'pill'} class:folded={fold === 'card'} class:open data-ui bind:this={el}
  style:height={fold === 'card' && open ? `${foldH}px` : undefined} inert={hidden}>
  <!-- open and taller than the screen, it is a Tab stop, so it can be scrolled from the keyboard -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="cap-in" class:card={open} bind:this={inner} tabindex={scrolls ? 0 : undefined} data-scroll={scrolls || undefined}>
    {#if fold}
      <h2 dir="auto" tabindex="-1">
        <button class="cap-toggle" bind:this={toggleEl} aria-expanded={open} title={tr(open ? 'caption.close' : 'caption.open')} onclick={toggle}>
          <span>{text.title}</span><Icon name="down" rotate={open ? 0 : 180} />
        </button>
      </h2>
    {:else}
      <h2 dir="auto" tabindex="-1">{text.title}</h2>
    {/if}
    {#if text.tag}<div class="tag" dir="auto">{text.tag}</div>{/if}
    <p dir="auto">{text.body}</p>
    {#each text.notes as n (n.kind)}
      <p class="note" dir="auto"><span class="note-name"><Icon name={n.kind} />{tr(`note.${n.kind}`)}:</span> {n.text}</p>
    {/each}
    <div class="foot">
      {#if verbs.length || catches.length}
        <div class="doors" class:lit={explore}>
          {#each verbs as v (v.kind)}
            <span class="verb door-{v.kind}" role="group" aria-label={tr(`door.${v.kind}`)}>
              <span class="verb-name" aria-hidden="true"><Icon name={icon[v.kind]} /><span dir="auto">{tr(`door.${v.kind}`)}:</span></span>
              {#each v.doors as d (d.id)}
                <button class="btn chip door" onclick={() => ondoor(d)} onpointerenter={() => onhot(d.id)} onpointerleave={() => onhot(null)}
                  onfocus={() => onhot(d.id)} onblur={() => onhot(null)}>{d.name}</button>
              {/each}
            </span>
          {/each}
          {#if catches.length}
            <span class="verb door-catch" role="group" aria-label={tr('door.catch')}>
              <span class="verb-name" aria-hidden="true"><Icon name="catch" /><span dir="auto">{tr('door.catch')}:</span></span>
              {#each catches as c (c.kind)}<button class="btn chip door" onclick={() => oncatch(c.kind)}>{c.name}</button>{/each}
            </span>
          {/if}
        </div>
      {/if}
      {#if onread}<button class="btn chip read" onclick={onread}><Icon name="speak" />{tr('caption.read')}</button>{/if}
      <button class="btn chip place" onclick={onplace}>{place} · <u>{tr('ui.change')}</u></button>
      {#if text.hint}<span class="hint">{text.hint}</span>{/if}
      {#if text.links.length}
        <span class="more"><span>{tr('more.title')}</span>
          {#each text.links as l}<a href={l.url} target="_blank" rel="noopener" hreflang={l.lang} lang={l.lang}>{l.title}{l.lang !== loc.lang ? ` (${l.lang})` : ''}</a>{/each}
        </span>
      {/if}
    </div>
  </div>
</section>
