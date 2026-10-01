<svelte:options namespace="svg" />
<script lang="ts">
  import type { LinkProps } from '../theme-types';
  let { look, d, colour, dashed, focused, kbd }: LinkProps = $props();
  const w = $derived(look === 'radio' ? 8 : look === 'trunk' ? 14 : 10);
</script>

<g class="link link-{look}" class:focused>
  {#if kbd}
    <g class="kbd" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path {d} stroke="var(--focus-gap, var(--bg))" stroke-width={w + 30} />
      <path {d} stroke="var(--focus-ink, var(--ink))" stroke-width={w + 20} />
      <path {d} stroke="var(--focus-gap, var(--bg))" stroke-width={w + 8} />
    </g>
  {/if}
  <path {d} fill="none" stroke={colour} stroke-width={w} stroke-linecap="round"
    stroke-dasharray={look === 'radio' ? '2 18' : dashed ? '14 14' : undefined} />
</g>
