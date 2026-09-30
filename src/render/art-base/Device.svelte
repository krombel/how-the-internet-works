<svelte:options namespace="svg" />
<script lang="ts">
  // Places a node's own art (a 200×200 box) and styles its shared class vocabulary from CSS tokens:
  // body, screen, line, wave, accent, hi, button (+ colour hints peach/orange/teal/berry/cloud, ignored here).
  // A group's inside shows faintly through its outline (`hollow`).
  import type { DeviceProps } from '../theme-types';
  let { id, x, y, size, time, Art, focused, inside = null, hollow = null }: DeviceProps = $props();
  const uid = $props.id();
  const clip = `inside-${uid}`;
</script>

<g class="dev dev-{id}" class:focused transform="translate({x - size / 2} {y - size / 2}) scale({size / 200})">
  {#if Art}<Art {time} />{:else}<rect class="body" x="30" y="40" width="140" height="120" rx="20" />{/if}
  {#if inside}
    <clipPath id={clip}><path d={hollow ?? 'M30 40 H170 V160 H30 Z'} /></clipPath>
    <g class="inside" clip-path="url(#{clip})">{@render inside()}</g>
  {/if}
</g>

<style>
  .dev :global(.body) { fill: var(--dev-body, #2a3278); stroke: var(--dev-edge, #a9b8ff); stroke-width: 6; stroke-linejoin: round; }
  .dev :global(.screen) { fill: var(--dev-screen, #0c1640); }
  .dev :global(.accent), .dev :global(.button) { fill: var(--dev-accent, #3ef0ff); }
  .dev :global(.line), .dev :global(.roof) { fill: none; stroke: var(--dev-edge, #a9b8ff); stroke-width: 8; stroke-linecap: round; }
  .dev :global(.wave) { fill: none; stroke: var(--dev-accent, #3ef0ff); stroke-width: 6; stroke-linecap: round; }
  .dev :global(.hi) { fill: #fff; opacity: 0.2; }
  .inside { opacity: 0.35; --cut-ink: var(--dev-edge, #a9b8ff); }
</style>
