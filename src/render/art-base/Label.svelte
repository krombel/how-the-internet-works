<svelte:options namespace="svg" />
<script lang="ts">
  import type { LabelProps } from '../theme-types';
  let { x, y, text, size, kind, colour, on, anchor = 'middle' }: LabelProps = $props();
</script>

<text class="lbl lbl-{kind}" {x} {y} font-size={size} text-anchor={anchor} style:stroke={on} style:fill={colour}>{text}</text>
