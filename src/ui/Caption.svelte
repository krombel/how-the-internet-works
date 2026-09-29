<script lang="ts">
  // Bottom caption: title + kid/nerd text, the doors you can open from here (as chips, by verb: the keyboard and
  // screen-reader way in), a gesture hint, where you are (tap to change) and "Want to know more?" (#4).
  import { loc, tr } from '../state.svelte';
  import type { CaptionText } from './caption';
  import Icon from './Icon.svelte';
  let { text, place, onplace, ondoor, onhot, explore, hidden, el = $bindable() }: {
    text: CaptionText; place: string; onplace: () => void;
    /** Open a door / point at it (its badge in the scene glows) or stop pointing (null). */
    ondoor: (id: string) => void; onhot: (id: string | null) => void;
    explore: boolean; hidden: boolean; el?: HTMLElement;
  } = $props();
  const verbs = $derived((['dive', 'expand'] as const).map((kind) => ({ kind, doors: text.doors.filter((d) => d.kind === kind) })).filter((v) => v.doors.length));
</script>

<section class="caption card" class:hide={hidden} data-ui bind:this={el} aria-live="polite">
  <h2 dir="auto">{text.title}</h2>
  <p dir="auto">{text.body}</p>
  <div class="foot">
    {#if verbs.length}
      <div class="doors" class:lit={explore}>
        {#each verbs as v (v.kind)}
          <span class="verb door-{v.kind}" role="group" aria-label={tr(`door.${v.kind}`)}>
            <span class="verb-name" aria-hidden="true"><Icon name={v.kind === 'dive' ? 'look' : 'open'} /><span dir="auto">{tr(`door.${v.kind}`)}:</span></span>
            {#each v.doors as d (d.id)}
              <button class="btn chip door" onclick={() => ondoor(d.id)} onpointerenter={() => onhot(d.id)} onpointerleave={() => onhot(null)}
                onfocus={() => onhot(d.id)} onblur={() => onhot(null)}>{d.name}</button>
            {/each}
          </span>
        {/each}
      </div>
    {/if}
    <button class="btn chip" onclick={onplace}>{place} · <u>{tr('ui.change')}</u></button>
    {#if text.hint}<span class="hint">{text.hint}</span>{/if}
    {#if text.links.length}
      <span class="more"><span>{tr('more.title')}</span>
        {#each text.links as l}<a href={l.url} target="_blank" rel="noopener" hreflang={l.lang}>{l.title}{l.lang !== loc.lang ? ` (${l.lang})` : ''}</a>{/each}
      </span>
    {/if}
  </div>
</section>
