<script lang="ts">
  // Big ◀ ▶ buttons for walking sideways along the path (portrait: ▼ ▲, since the path runs upwards). In a layer dive
  // they go down and up the layers of the hop: ▼ ▲ everywhere. A step that crosses into a group or back out of one
  // (#169) says where it goes, beside the button.
  // They draw a solid arrow, never a chevron: on a portrait screen they sit by the caption, whose chevrons open and
  // close it (#182). The one that goes on is filled, as in the peek; on a portrait screen it is a pill that says what
  // it does ("Next stop", or where it crosses into) in its own words, so it isn't taken for the caption's ⌃.
  import { tr } from '../state.svelte';
  import Icon from './Icon.svelte';
  let { portrait, layer, canPrev, canNext, crossing, onstep, nudge }: {
    portrait: boolean; layer: boolean; canPrev: boolean; canNext: boolean;
    /** ◀'s and ▶'s crossing ("Into: The internet"), or null. */
    crossing: (string | null)[];
    onstep: (d: -1 | 1) => void; nudge: { dir: number; n: number };
  } = $props();
  const vertical = $derived(portrait || layer);
  // Diagrams are not mirrored in RTL, so the arrows point where the camera goes: "next" is always to the right/up.
  const rot = (d: -1 | 1) => (vertical ? (d > 0 ? -90 : 90) : d > 0 ? 0 : 180);
  const label = (d: -1 | 1) => tr(layer ? (d < 0 ? 'nav.below' : 'nav.above') : d < 0 ? 'nav.prev' : 'nav.next');
</script>

{#each [-1, 1] as const as d}
  {@const to = crossing[d < 0 ? 0 : 1]}
  {@const pill = portrait && d > 0}
  {#key nudge.dir === d ? nudge.n : 0}
    <button class="step card btn {d < 0 ? 'prev' : 'next'}" class:pill class:nudge={nudge.dir === d && nudge.n > 0} data-ui
      style:--nx="{vertical ? 0 : d * 6}px" style:--ny="{vertical ? -d * 6 : 0}px"
      aria-label={to ?? label(d)} onclick={() => onstep(d)} aria-disabled={d < 0 ? !canPrev : !canNext}>
      <Icon name="arrow" solid rotate={rot(d)} />
      {#if to || pill}<span class="step-to">{to ?? label(d)}</span>{/if}
    </button>
  {/key}
{/each}
