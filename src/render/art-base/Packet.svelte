<svelte:options namespace="svg" />
<script lang="ts">
  import type { PacketProps } from '../theme-types';
  let { pose, colour, followed }: PacketProps = $props();
  const deg = $derived((pose.angle * 180) / Math.PI);
</script>

<g transform="translate({pose.x} {pose.y})">
  {#if followed}<circle r="34" fill="none" stroke="var(--accent, #fff)" stroke-width="4" stroke-dasharray="6 6" />{/if}
  <g transform="rotate({deg})"><rect x="-15" y="-11" width="30" height="22" rx="5" fill={colour} /></g>
</g>
