<script lang="ts">
  // Bottom caption: title + kid/nerd text, the doors you can open from here (as chips, by verb: the keyboard and
  // screen-reader way in), a gesture hint, where you are (tap to change) and "Want to know more?" (#4).
  // `compact` (a short landscape screen): a one-line pill with the title that opens into the whole caption, over the
  // scene, so the scene keeps the height; it folds up again when the caption changes.
  // Hidden (during a flight, while a packet is caught), it is inert: nothing in it can be focused or read. Its title
  // takes focus when a navigation took it away (App.svelte); a body text that scrolls can be focused to scroll it.
  import { loc, tr } from '../state.svelte';
  import type { CaptionDoor, CaptionText } from './caption';
  import Icon from './Icon.svelte';
  let { text, place, onplace, ondoor, onhot, explore, catches, oncatch, hidden, compact, el = $bindable() }: {
    text: CaptionText; place: string; onplace: () => void;
    /** Packet kinds to catch here (issue #17), and catching one. */
    catches: { kind: string; name: string }[]; oncatch: (kind: string) => void;
    /** Open a door / point at it (its badge in the scene glows) or stop pointing (null). */
    ondoor: (d: CaptionDoor) => void; onhot: (id: string | null) => void;
    explore: boolean; hidden: boolean; compact: boolean; el?: HTMLElement;
  } = $props();
  let openFor = $state<string | null>(null);
  const open = $derived(compact && openFor === text.title);
  const icon = { dive: 'look', expand: 'open', down: 'wave', up: 'envelope' } as const;
  let body = $state<HTMLElement>(), scrolls = $state(false);
  $effect(() => {
    void text.body;
    const p = body;
    if (!p) return;
    const ro = new ResizeObserver(() => (scrolls = p.scrollHeight > p.clientHeight));
    ro.observe(p);
    return () => ro.disconnect();
  });
  const verbs = $derived((['dive', 'expand', 'down', 'up'] as const).map((kind) => ({ kind, doors: text.doors.filter((d) => d.kind === kind) })).filter((v) => v.doors.length));
</script>

<section class="caption card" class:hide={hidden} class:compact class:open data-ui bind:this={el} inert={hidden}>
  <div class="cap-in" class:card={open}>
    {#if compact}
      <h2 dir="auto" tabindex="-1">
        <button class="cap-toggle" aria-expanded={open} title={tr(open ? 'caption.close' : 'caption.open')} onclick={() => (openFor = open ? null : text.title)}>
          <span>{text.title}</span><Icon name="down" rotate={open ? 0 : 180} />
        </button>
      </h2>
    {:else}
      <h2 dir="auto" tabindex="-1">{text.title}</h2>
    {/if}
    {#if text.tag}<div class="tag" dir="auto">{text.tag}</div>{/if}
    <!-- a body that scrolls is a Tab stop, so it can be scrolled from the keyboard -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <p dir="auto" bind:this={body} tabindex={scrolls ? 0 : undefined} data-scroll={scrolls || undefined}>{text.body}</p>
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
      <button class="btn chip" onclick={onplace}>{place} · <u>{tr('ui.change')}</u></button>
      {#if text.hint}<span class="hint">{text.hint}</span>{/if}
      {#if text.links.length}
        <span class="more"><span>{tr('more.title')}</span>
          {#each text.links as l}<a href={l.url} target="_blank" rel="noopener" hreflang={l.lang} lang={l.lang}>{l.title}{l.lang !== loc.lang ? ` (${l.lang})` : ''}</a>{/each}
        </span>
      {/if}
    </div>
  </div>
</section>
