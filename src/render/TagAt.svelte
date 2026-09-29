<svelte:options namespace="svg" />
<script lang="ts">
  // Nerd-mode callout, drawn by the theme's Tag slot with a clamped size. Only shown at the nerd level.
  import { loc, themeState, view } from '../state.svelte';
  import { getScene, getWorld } from './ctx';
  let { x, y, text, size = 20, anchor = 'middle' }: { x: number; y: number; text: string; size?: number; anchor?: 'start' | 'middle' | 'end' } = $props();
  const world = getWorld(), scene = getScene();
  const px = $derived(Math.max(size, (themeState.current.labelMinPx * 0.85) / (world.cam.k * scene.frame.s)));
  const Tag = $derived(themeState.current.art.Tag);
</script>

{#if loc.level === 'nerd' && text}
  <!-- callouts are technical (Latin, numbers): keep them LTR so "5 GHz" doesn't get reordered in RTL -->
  <g direction="ltr"><Tag {x} {y} {text} size={px} {anchor} time={view.time} /></g>
{/if}
