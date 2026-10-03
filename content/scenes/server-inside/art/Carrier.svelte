<svelte:options namespace="svg" />
<script lang="ts">
  import type { CarrierProps } from '../types';
  let { p, form, colour, alpha, time, night }: CarrierProps = $props();
  const bob = $derived(Math.sin(time * 8) * 3);
</script>

{#if alpha > 0.02}
  {#if form === 'light'}
    {#if night}<ellipse cx={p.x} cy={p.y} rx="64" ry="34" fill={colour} opacity={0.3 * alpha} />{/if}
    <ellipse cx={p.x} cy={p.y} rx="40" ry="20" fill={colour} opacity={0.35 * alpha} />
    <ellipse cx={p.x} cy={p.y} rx="24" ry="11" fill="var(--paper-white)" stroke={colour} stroke-width="6" opacity={alpha} />
  {:else if form === 'video'}
    {#if night}<rect x={p.x - 45} y={p.y - 31} width="90" height="62" rx="10" fill={colour} opacity={0.18 * alpha} />{/if}
    <rect x={p.x - 34} y={p.y - 23 + bob * 0.2} width="68" height="46" rx="8" fill="var(--berry)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <rect x={p.x - 20} y={p.y - 13 + bob * 0.2} width="40" height="26" rx="5" fill="var(--paper-white)" opacity={alpha} />
    {#each [-23, 23] as dx (dx)}
      <path d={`M${p.x + dx} ${p.y - 15} v30`} stroke="var(--paper)" stroke-width="5" stroke-linecap="round" opacity={alpha} />
    {/each}
  {:else if form === 'page' || form === 'picture'}
    {@const y = p.y + bob * 0.2}
    {#if night}<rect x={p.x - 38} y={y - 44} width="76" height="88" rx="12" fill={colour} opacity={0.18 * alpha} />{/if}
    <g opacity={alpha}>
      <path d={`M${p.x - 27} ${y - 34} H${p.x + 13} L${p.x + 27} ${y - 20} V${y + 34} H${p.x - 27} Z`} fill="var(--paper-white)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
      {#if form === 'page'}
        <rect x={p.x - 17} y={y - 24} width="24" height="9" rx="3" fill={colour} />
        <path d={`M${p.x - 17} ${y - 3} H${p.x + 17} M${p.x - 17} ${y + 9} H${p.x + 17} M${p.x - 17} ${y + 21} H${p.x + 5}`} stroke="var(--line)" stroke-width="4" stroke-linecap="round" />
      {:else}
        <rect x={p.x - 18} y={y - 18} width="36" height="40" rx="4" fill="var(--sky)" stroke="var(--line)" stroke-width="3" />
        <circle cx={p.x + 7} cy={y - 7} r="6" fill="var(--sun)" />
        <path d={`M${p.x - 18} ${y + 22} L${p.x - 5} ${y + 2} L${p.x + 4} ${y + 13} L${p.x + 10} ${y + 6} L${p.x + 18} ${y + 22} Z`} fill="var(--leaf)" stroke="var(--line)" stroke-width="3" stroke-linejoin="round" />
      {/if}
    </g>
  {:else}
    <rect x={p.x - 25} y={p.y - 20 + bob * 0.2} width="50" height="40" rx="8" fill="var(--kraft)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <path d={`M${p.x - 20} ${p.y - 15 + bob * 0.2} L${p.x} ${p.y} L${p.x + 20} ${p.y - 15 + bob * 0.2}`} fill="none" stroke="var(--kraft-edge)" stroke-width="4" stroke-linejoin="round" opacity={alpha} />
    <rect x={p.x - 13} y={p.y + 5 + bob * 0.2} width="26" height="13" rx="4" fill={colour} opacity={0.85 * alpha} />
  {/if}
{/if}
