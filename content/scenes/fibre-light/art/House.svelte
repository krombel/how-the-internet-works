<svelte:options namespace="svg" />
<script lang="ts">
  import type { HouseProps } from '../types';
  let { x, y, size, you }: HouseProps = $props();
  const s = $derived(size / 120);
</script>

<g class="house" class:you transform="translate({x} {y}) scale({s})">
  {#if you}<circle r="74" fill="var(--sun)" opacity="0.35" stroke="var(--mustard)" stroke-width="5" />{/if}
  <path d="M-48 -4 L0 -50 L48 -4" fill={you ? 'var(--orange-bright)' : 'var(--roof-plain)'} stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
  <rect x="-38" y="-8" width="76" height="56" rx="8" fill={you ? 'var(--peach)' : 'var(--wall-plain)'} stroke="var(--line)" stroke-width="6" />
  <rect x="-10" y="16" width="20" height="32" rx="4" fill="var(--line)" opacity="0.8" />
  <rect x="-28" y="4" width="14" height="14" rx="3" fill="var(--paper)" stroke="var(--line)" stroke-width="3" />
  <rect x="14" y="4" width="14" height="14" rx="3" fill="var(--paper)" stroke="var(--line)" stroke-width="3" />
</g>
