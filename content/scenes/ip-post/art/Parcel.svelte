<svelte:options namespace="svg" />
<script lang="ts">
  // A parcel with its address label on the front, walking on little legs. It may travel inside a link envelope
  // (with a window showing the label), which a bridge takes off and swaps for a new one.
  import type { ParcelProps } from '../types';
  let { x, y, colour, wrap, next, walking, time }: ParcelProps = $props();
  const step = $derived(walking ? Math.sin(time * 14) * 7 : 0);
  const blink = $derived(Math.sin(time * 3.3 + x * 0.01) > 0.94);
</script>

{#snippet envelope(fill: string)}
  <rect x="-78" y="-122" width="156" height="112" rx="16" fill={fill} stroke="#6b3f2a" stroke-width="6" />
  <path d="M-72 -116 L0 -66 L72 -116" fill="none" stroke="#6b3f2a" stroke-width="5" stroke-linejoin="round" opacity="0.7" />
  <rect x="-46" y="-62" width="72" height="36" rx="6" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
  <path d="M-38 -50 H16 M-38 -38 H4" stroke="#8a6043" stroke-width="4" stroke-linecap="round" />
{/snippet}

<g transform="translate({x} {y})">
  <ellipse cx="0" cy="2" rx="62" ry="12" fill="#6b3f2a" opacity="0.14" />
  <g stroke="#6b3f2a" stroke-width="7" stroke-linecap="round">
    <path d="M-22 -12 L{-26 + step} 0" />
    <path d="M22 -12 L{26 - step} 0" />
  </g>
  <rect x="-60" y="-104" width="120" height="92" rx="12" fill={colour} stroke="#6b3f2a" stroke-width="6" />
  <path d="M-60 -80 H60" stroke="#6b3f2a" stroke-width="4" opacity="0.35" />
  <rect x="-48" y="-68" width="64" height="44" rx="6" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
  <path d="M-40 -55 H8 M-40 -42 H-2" stroke="#8a6043" stroke-width="4" stroke-linecap="round" />
  <g fill="#6b3f2a">
    <ellipse cx="30" cy="-58" rx="4.5" ry={blink ? 1 : 5.5} />
    <ellipse cx="48" cy="-58" rx="4.5" ry={blink ? 1 : 5.5} />
  </g>
  <path d="M31 -42 Q39 -35 47 -42" fill="none" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" />
  {#if wrap && wrap.lift < 1}
    <g transform="translate(0 {-wrap.lift * 90})" opacity={1 - wrap.lift}>{@render envelope(wrap.colour)}</g>
  {/if}
  {#if next && next.drop > 0}
    <g transform="translate(0 {-(1 - next.drop) * 90})" opacity={next.drop}>{@render envelope(next.colour)}</g>
  {/if}
</g>
