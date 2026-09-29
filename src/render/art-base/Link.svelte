<svelte:options namespace="svg" />
<script lang="ts">
  import type { LinkProps } from '../theme-types';
  let { look, d, colour, dashed, focused }: LinkProps = $props();
</script>

<g class="link link-{look}" class:focused>
  <path {d} fill="none" stroke={colour} stroke-width={look === 'radio' ? 8 : look === 'trunk' ? 14 : 10} stroke-linecap="round"
    stroke-dasharray={look === 'radio' ? '2 18' : dashed ? '14 14' : undefined} />
</g>
