<svelte:options namespace="svg" />
<script lang="ts">
  import type { PacketProps } from '../theme-types';
  let { pose, colour, dir, followed, mark: Mark }: PacketProps = $props();
  const deg = $derived((pose.angle * 180) / Math.PI);
</script>

<g transform="translate({pose.x} {pose.y})">
  {#if followed}<circle r="34" fill="none" stroke="var(--accent, #fff)" stroke-width="4" stroke-dasharray="6 6" />{/if}
  <!-- a box going up, a disc coming back -->
  {#if dir === 'up'}<g transform="rotate({deg})"><rect x="-15" y="-11" width="30" height="22" rx="5" fill={colour} />{#if Mark}<Mark {dir} size={20} />{/if}</g>
  {:else}<circle r="14" fill={colour} />{#if Mark}<Mark {dir} size={26} />{/if}{/if}
</g>
