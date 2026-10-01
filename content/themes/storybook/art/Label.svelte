<svelte:options namespace="svg" />
<script lang="ts">
  import type { LabelProps } from '$core/api';
  let { x, y, text, size, kind, colour, on, anchor = 'middle' }: LabelProps = $props();
</script>

<text class="storybook-label lbl lbl-{kind}" {x} {y} font-size={size} text-anchor={anchor} style:stroke={on} style:fill={colour ?? 'var(--ink)'}>{text}</text>
