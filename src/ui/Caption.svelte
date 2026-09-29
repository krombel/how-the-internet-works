<script lang="ts">
  // Bottom caption: title + kid/nerd text, a gesture hint, where you are (tap to change) and "Want to know more?" (#4).
  import { loc, tr } from '../state.svelte';
  import type { CaptionText } from './caption';
  let { text, place, onplace, hidden, el = $bindable() }: {
    text: CaptionText; place: string; onplace: () => void; hidden: boolean; el?: HTMLElement;
  } = $props();
</script>

<section class="caption card" class:hide={hidden} data-ui bind:this={el} aria-live="polite">
  <h2 dir="auto">{text.title}</h2>
  <p dir="auto">{text.body}</p>
  <div class="foot">
    <button class="btn chip" onclick={onplace}>{place} · <u>{tr('ui.change')}</u></button>
    {#if text.hint}<span class="hint">{text.hint}</span>{/if}
    {#if text.links.length}
      <span class="more"><span>{tr('more.title')}</span>
        {#each text.links as l}<a href={l.url} target="_blank" rel="noopener" hreflang={l.lang}>{l.title}{l.lang !== loc.lang ? ` (${l.lang})` : ''}</a>{/each}
      </span>
    {/if}
  </div>
</section>
