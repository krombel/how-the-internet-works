<svelte:options namespace="svg" />
<script lang="ts">
  import type { RoadProps } from '../theme-types';
  let { d }: RoadProps = $props();
</script>

<path {d} class="road" fill="none" stroke="var(--road, #fff)" stroke-opacity="0.25" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" />
