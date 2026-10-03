<svelte:options namespace="svg" />
<script lang="ts">
  // A scene label, size clamped so it never gets smaller than the theme's labelMinPx on screen (this is what makes
  // the portrait phone layout readable). `text` is already translated (use tr() from $core/api). A data colour (a
  // technology's) is mixed into the ink so it reads (labelInk). With `fit` it keeps inside its panel's frame (#136): a
  // name at the edge of a dive, which grows on a phone and is longer in some languages, slides in rather than off. Only
  // for text drawn in the scene's own coordinates (not inside a transformed group).
  import type { LabelProps } from './theme-types';
  import { WORLD_SIZE } from '../engine/geometry';
  import { perPx } from '../engine/svg';
  import { keepIn, labelReach } from '../model/labels';
  import { themeState, view } from '../state.svelte';
  import { legibleSize } from './ctx';
  import { labelInk } from './colour';
  let { x, y, text, size, kind = 'node', colour, on, anchor = 'middle', fit = false }: Omit<LabelProps, 'kind'> & { kind?: LabelProps['kind']; fit?: boolean } = $props();
  const legible = legibleSize();
  const px = $derived(legible(size));
  const at = $derived(fit ? keepIn({ x, y }, labelReach(perPx(text, kind === 'big' ? '--heading-font' : '--label-font') * px, px, anchor), WORLD_SIZE[view.orient]) : { x, y });
  const Label = $derived(themeState.current.art.Label);
</script>

<Label x={at.x} y={at.y} {text} size={px} {kind} colour={colour && labelInk(colour)} {on} {anchor} />
