<svelte:options namespace="svg" />
<script lang="ts">
  // A scene label, size clamped so it never gets smaller than the theme's labelMinPx on screen (this is what makes
  // the portrait phone layout readable). `text` is already translated (use tr() from $core/api). A data colour (a
  // technology's) is mixed into the ink so it reads (labelInk).
  import type { LabelProps } from './theme-types';
  import { themeState } from '../state.svelte';
  import { legibleSize } from './ctx';
  import { labelInk } from './colour';
  let { x, y, text, size, kind = 'node', colour, on, anchor = 'middle' }: Omit<LabelProps, 'kind'> & { kind?: LabelProps['kind'] } = $props();
  const legible = legibleSize();
  const px = $derived(legible(size));
  const Label = $derived(themeState.current.art.Label);
</script>

<Label {x} {y} {text} size={px} {kind} colour={colour && labelInk(colour)} {on} {anchor} />
