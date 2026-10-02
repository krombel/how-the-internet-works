<svelte:options namespace="svg" />
<script lang="ts">
  // Draw any node's art by id through the theme's Device slot (for dive scenes: "the router, big, here").
  import { themeState, view } from '../state.svelte';
  import { deviceArt } from './lazy.svelte';
  let { id, x, y, size, focused = false }: { id: string; x: number; y: number; size: number; focused?: boolean } = $props();
  const art = $derived(deviceArt(id));
  const Device = $derived(themeState.current.art.Device);
</script>

<Device {id} Art={art.Art} face={art.face} pending={art.pending} {x} {y} {size} time={view.time} context="dive" {focused} />
