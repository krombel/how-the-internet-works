<svelte:options namespace="svg" />
<script lang="ts">
  // A scene label, size clamped so it never gets smaller than the theme's labelMinPx on screen (this is what makes
  // the portrait phone layout readable). `text` is already translated (use tr() from $core/api).
  import type { LabelProps } from './theme-types';
  import { themeState } from '../state.svelte';
  import { getScene, getWorld } from './ctx';
  let { x, y, text, size, kind = 'node', colour, anchor = 'middle' }: Omit<LabelProps, 'kind'> & { kind?: LabelProps['kind'] } = $props();
  const world = getWorld(), scene = getScene();
  const px = $derived(Math.max(size, themeState.current.labelMinPx / (world.cam.k * scene.frame.s)));
  const Label = $derived(themeState.current.art.Label);
</script>

<Label {x} {y} {text} size={px} {kind} {colour} {anchor} />
