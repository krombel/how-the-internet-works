<svelte:options namespace="svg" />
<script lang="ts">
  import type { WaveProps } from '../types';
  let { d, time }: WaveProps = $props();
</script>

<g class="storybook-wave">
  <path {d} fill="none" stroke="var(--line)" stroke-width="23" stroke-linecap="round" stroke-linejoin="round" />
  <path {d} fill="none" stroke="var(--orange)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" />
  <path {d} fill="none" stroke="var(--teal)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="36 22" stroke-dashoffset={-time * 42} />
  <path {d} fill="none" stroke="var(--paper)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
</g>
