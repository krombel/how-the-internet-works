<svelte:options namespace="svg" />
<script lang="ts">
  import type { BackdropProps } from '../theme-types';
  let { w, h }: BackdropProps = $props();
</script>

<rect x={-w} y={-h} width={w * 3} height={h * 3} fill="var(--scene-bg, #10163e)" />
