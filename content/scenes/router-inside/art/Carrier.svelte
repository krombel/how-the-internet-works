<svelte:options namespace="svg" />
<script lang="ts">
  // A parcel on its way through the router, in the form it has there: electric pushes (a spark), a radio wave, light,
  // or, inside the box, plain bits (a little parcel with its address sticker).
  import type { CarrierProps } from '../types';
  let { p, form, colour, alpha, time, night }: CarrierProps = $props();
  const wob = $derived(Math.sin(time * 9) * 3);
</script>

{#if alpha > 0.02}
  {#if form === 'spark'}
    {#if night}<circle cx={p.x} cy={p.y} r="42" fill={colour} opacity={0.25 * alpha} />{/if}
    <circle cx={p.x} cy={p.y} r="24" fill="var(--paper)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <path d={`M${p.x - 11} ${p.y + 7} L${p.x + 5} ${p.y - 19} L${p.x + 2} ${p.y - 2} L${p.x + 17} ${p.y - 7} L${p.x - 2} ${p.y + 21} L${p.x} ${p.y + 3} Z`} fill={colour} stroke="var(--line)" stroke-width="2.5" opacity={alpha} />
  {:else if form === 'light'}
    {#if night}<ellipse cx={p.x} cy={p.y} rx="64" ry="34" fill={colour} opacity={0.3 * alpha} />{/if}
    <ellipse cx={p.x} cy={p.y} rx="40" ry="20" fill={colour} opacity={0.35 * alpha} />
    <ellipse cx={p.x} cy={p.y} rx="24" ry="11" fill="var(--paper-white)" stroke={colour} stroke-width="6" opacity={alpha} />
  {:else if form === 'wave'}
    {#each [0, 1, 2] as i (i)}
      <path d={`M${p.x - 14 + i * 14} ${p.y - 22 - wob} q14 22 0 44`} fill="none" stroke={colour} stroke-width="7" stroke-linecap="round" opacity={alpha * (1 - i * 0.25)} />
    {/each}
  {:else}
    <rect x={p.x - 24} y={p.y - 19} width="48" height="38" rx="7" fill="var(--kraft)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <rect x={p.x - 13} y={p.y - 8} width="26" height="15" rx="4" fill="var(--berry)" opacity={alpha} />
  {/if}
{/if}
