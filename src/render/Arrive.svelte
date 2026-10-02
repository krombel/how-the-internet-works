<svelte:options namespace="svg" />
<script lang="ts" generics="T">
  // Draws lazy art (`of`, null while it loads) once it's here. Art that wasn't here when this was first drawn fades
  // in as it lands (#91); art that was there from the start just shows.
  import type { Snippet } from 'svelte';
  let { of, children }: { of: T | null; children: Snippet<[T]> } = $props();
  let late = $state(false);
  $effect.pre(() => { if (!of) late = true; });
</script>

{#if of}<g class:late>{@render children(of)}</g>{/if}

<style>
  .late { animation: arrive 0.25s ease-out; }
  @keyframes arrive { from { opacity: 0; } }
</style>
