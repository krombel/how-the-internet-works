<svelte:options namespace="svg" />
<script lang="ts">
  import type { RoadProps } from '$core/api';
  let { d }: RoadProps = $props();
</script>

<!-- the packets' own road through the scene: a sandy lane with a dashed middle line -->
<g class="storybook-road" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path {d} stroke="var(--line)" stroke-width="58" stroke-opacity="0.22" />
  <path {d} stroke="var(--road-top)" stroke-width="42" />
  <path {d} stroke="var(--paper)" stroke-width="5" stroke-dasharray="22 28" />
</g>
