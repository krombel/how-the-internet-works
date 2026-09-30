<svelte:options namespace="svg" />
<script lang="ts">
  import type { CarrierProps } from '../types';
  let { p, form, colour, alpha, time, night }: CarrierProps = $props();
  const wob = $derived(Math.sin(time * 9) * 3);
</script>

{#if alpha > 0.02}
  {#if form === 'wave'}
    {#if night}<circle cx={p.x} cy={p.y} r="54" fill={colour} opacity={0.2 * alpha} />{/if}
    {#each [0, 1, 2] as i (i)}
      <path d={`M${p.x - 16 + i * 16} ${p.y - 27 - wob} q16 27 0 54`} fill="none" stroke={colour} stroke-width="8" stroke-linecap="round" opacity={alpha * (1 - i * 0.22)} />
    {/each}
  {:else if form === 'light'}
    {#if night}<ellipse cx={p.x} cy={p.y} rx="66" ry="34" fill={colour} opacity={0.3 * alpha} />{/if}
    <ellipse cx={p.x} cy={p.y} rx="42" ry="20" fill={colour} opacity={0.35 * alpha} />
    <ellipse cx={p.x} cy={p.y} rx="25" ry="11" fill="var(--paper-white)" stroke={colour} stroke-width="6" opacity={alpha} />
  {:else if form === 'envelope'}
    <rect x={p.x - 43} y={p.y - 28} width="86" height="56" rx="10" fill="var(--paper-2)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <path d={`M${p.x - 38} ${p.y - 23} L${p.x} ${p.y + 4} L${p.x + 38} ${p.y - 23}`} fill="var(--kraft)" stroke="var(--line)" stroke-width="3.5" stroke-linejoin="round" opacity={alpha} />
    <rect x={p.x - 26} y={p.y + 6} width="52" height="14" rx="4" fill="var(--teal)" opacity={0.8 * alpha} />
  {:else}
    <rect x={p.x - 24} y={p.y - 19} width="48" height="38" rx="7" fill="var(--kraft)" stroke="var(--line)" stroke-width="5" opacity={alpha} />
    <rect x={p.x - 13} y={p.y - 8} width="26" height="15" rx="4" fill="var(--berry)" opacity={alpha} />
  {/if}
{/if}
