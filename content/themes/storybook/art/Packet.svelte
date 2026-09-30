<svelte:options namespace="svg" />
<script lang="ts">
  import type { PacketProps } from '$core/api';
  let { kind, pose, colour, time, followed }: PacketProps = $props();
  const facing = $derived(Math.cos(pose.angle) < 0 ? -1 : 1);
  const blink = $derived(Math.sin(time * 4.2 + pose.seg) > 0.94);
</script>

<g class="courier" transform="translate({pose.x} {pose.y})">
  {#if followed}<ellipse cx="0" cy="28" rx="40" ry="15" fill="var(--glow-pale)" stroke="var(--line)" stroke-width="4" opacity="0.85" />{/if}
  <g transform="scale({facing} 1)">
    <g class="legs" stroke="var(--line)" stroke-width="6" stroke-linecap="round">
      <path d="M-11 20 L-22 34" />
      <path d="M10 20 L21 34" />
    </g>
    <circle class="body" cy="0" r="22" fill={colour} />
    <path class="highlight" d="M-12 -12 C-2 -22 13 -15 15 -4 C7 -9 -2 -10 -12 -4 Z" />
    <ellipse class="eye" cx="-8" cy="-4" rx="3.4" ry={blink ? 0.8 : 4.2} />
    <ellipse class="eye" cx="8" cy="-4" rx="3.4" ry={blink ? 0.8 : 4.2} />
    <path class="smile" d="M-7 8 Q0 14 8 8" />
    {#if kind === 'video'}
      <g transform="translate(28 -1) rotate(-8)">
        <rect class="film" x="-3" y="-14" width="31" height="26" rx="5" />
        <circle cx="6" cy="-2" r="5" fill="var(--paper)" stroke="var(--line)" stroke-width="3" />
        <path d="M18 -10 V8" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" />
      </g>
    {:else}
      <g transform="translate(26 -2) rotate(-8)">
        <rect class="parcel" x="-2" y="-14" width="28" height="25" rx="4" />
        <path class="parcel-line" d="M12 -14 V11 M-2 -2 H26" />
      </g>
    {/if}
  </g>
</g>

<style>
  .body, .parcel, .film { stroke: var(--line); stroke-width: 5; }
  .highlight { fill: var(--paper); opacity: .48; }
  .eye { fill: var(--line); }
  .smile { fill: none; stroke: var(--line); stroke-width: 3.4; stroke-linecap: round; }
  .parcel { fill: var(--cardboard); }
  .parcel-line { fill: none; stroke: var(--line); stroke-width: 3; stroke-linecap: round; opacity: .8; }
  .film { fill: var(--teal); }
</style>
