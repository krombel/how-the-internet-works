<svelte:options namespace="svg" />
<script lang="ts">
  // The exchange's shared switch: one long box, a lit stripe down its length, and a port wherever a member plugs in.
  import type { FabricProps } from '../types';
  let { box, vertical, ports, night }: FabricProps = $props();
  const { x, y, w, h } = $derived(box);
  const stripe = $derived(vertical ? `M${x + 26} ${y + 30} V${y + h - 30}` : `M${x + 30} ${y + 26} H${x + w - 30}`);
</script>

{#if night}<rect x={x - 20} y={y - 20} width={w + 40} height={h + 40} rx="36" fill="var(--teal)" opacity="0.13" />{/if}
<rect x={x + 10} y={y + 12} width={w} height={h} rx="26" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="26" fill="var(--paper)" stroke="var(--line)" stroke-width="7" />
<path d={stripe} stroke="var(--teal)" stroke-width="16" stroke-linecap="round" opacity="0.72" />
{#each ports as p (`${p.x},${p.y}`)}
  <rect x={p.x - 15} y={p.y - 15} width="30" height="30" rx="7" fill="var(--leaf-pale)" stroke="var(--line)" stroke-width="5" />
{/each}
