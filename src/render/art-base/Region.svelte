<svelte:options namespace="svg" />
<script lang="ts">
  import type { RegionProps } from '../theme-types';
  let { part, d, tone, aside, x, y, label, size }: RegionProps = $props();
</script>

{#if part === 'area'}
  <path {d} class="region tone-{tone % 4}" fill={aside ? 'none' : 'var(--region, #fff)'} fill-opacity="0.12" stroke="var(--region, #fff)" stroke-opacity="0.5"
    stroke-width="4" stroke-dasharray={aside ? '10 10' : undefined} />
{:else}
  <text class="region-sign" {x} {y} font-size={size} text-anchor="middle" dominant-baseline="central" fill="var(--region, #fff)">{label}</text>
{/if}
