<svelte:options namespace="svg" />
<script lang="ts">
  let {
    x,
    y,
    locked = 0,
    scramble = false,
    scale = 1,
    lockColour = '#8a6043',
  }: { x: number; y: number; locked?: number; scramble?: boolean; scale?: number; lockColour?: string } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <rect x="-72" y="-42" width="144" height="84" rx="18" fill="#ffd89c" stroke="#6b3f2a" stroke-width="6" />
  <path d="M-72 -10 H72 M0 -42 V42" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" opacity="0.55" />
  {#if scramble}
    <path d="M-48 -22 C-32 -35 -21 -8 -4 -22 S25 -31 46 -17 M-49 16 C-24 3 -13 31 7 15 S29 1 48 16" fill="none" stroke="#6b3f2a" stroke-width="5" stroke-linecap="round" opacity="0.72" />
  {:else}
    <ellipse cx="-22" cy="1" rx="5" ry="7" fill="#6b3f2a" />
    <ellipse cx="22" cy="1" rx="5" ry="7" fill="#6b3f2a" />
    <path d="M-18 17 Q0 28 18 17" fill="none" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" />
  {/if}
  <g opacity={locked} transform="translate(0 -36)">
    <path d="M-28 12 V-9 C-28 -33 28 -33 28 -9 V12" fill="none" stroke="#6b3f2a" stroke-width="8" stroke-linecap="round" />
    <rect x="-42" y="6" width="84" height="62" rx="14" fill={lockColour} stroke="#6b3f2a" stroke-width="6" />
    <circle cy="34" r="7" fill="#6b3f2a" />
  </g>
</g>
