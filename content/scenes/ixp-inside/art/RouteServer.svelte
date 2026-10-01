<svelte:options namespace="svg" />
<script lang="ts">
  import type { RouteServerProps } from '../types';
  let { box, active, night }: RouteServerProps = $props();
  const { x, y, w, h } = $derived(box);
</script>

{#if night}<rect x={x - 18} y={y - 18} width={w + 36} height={h + 36} rx="30" fill="var(--sun)" opacity={active ? 0.18 : 0.10} />{/if}
<rect x={x + 8} y={y + 10} width={w} height={h} rx="24" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="24" fill="var(--kraft)" stroke="var(--line)" stroke-width={active ? 7 : 5} />
<path d={`M${x + 26} ${y + 34} H${x + w - 26}`} stroke="var(--line)" stroke-width="7" stroke-linecap="round" opacity="0.78" />
<path d={`M${x + 36} ${y + h * 0.58} H${x + w - 36}`} stroke="var(--orange)" stroke-width="10" stroke-linecap="round" opacity="0.82" />
{#each [0, 1, 2] as i (i)}
  <rect x={x + 44 + i * ((w - 108) / 2)} y={y + h - 40} width="20" height="18" rx="5" fill="var(--leaf-pale)" stroke="var(--line)" stroke-width="3" />
{/each}
