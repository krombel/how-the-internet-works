<svelte:options namespace="svg" />
<script lang="ts">
  let {
    x,
    y,
    scale = 1,
    tint = '#ffcf5d',
    sticker = '',
    moving = false,
    time = 0,
    smudge = false,
  }: {
    x: number; y: number; scale?: number; tint?: string; sticker?: string; moving?: boolean; time?: number; smudge?: boolean;
  } = $props();
  const step = $derived(moving ? Math.sin(time * 14) * 7 : 0);
  const blink = $derived(Math.sin(time * 3.1 + x * 0.01) > 0.94);
  const labelSize = $derived(sticker.length <= 3 ? 56 : sticker.length <= 4 ? 40 : 32);
</script>

<g transform="translate({x} {y}) scale({scale})">
  <ellipse cx="0" cy="8" rx="66" ry="14" fill="#6b3f2a" opacity="0.14" />
  <g stroke="#6b3f2a" stroke-width="7" stroke-linecap="round">
    <path d="M-24 -12 L{-30 + step} 6" />
    <path d="M24 -12 L{30 - step} 6" />
  </g>
  <rect x="-76" y="-116" width="152" height="108" rx="16" fill={tint} stroke="#6b3f2a" stroke-width="6" />
  <path d="M-70 -110 L0 -60 L70 -110" fill="none" stroke="#6b3f2a" stroke-width="5" opacity="0.65" />
  <rect x="-54" y="-68" width="108" height="42" rx="8" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
  {#if smudge}
    <path d="M-45 -52 C-20 -68 5 -35 34 -56" fill="none" stroke="#bd6b87" stroke-width="10" stroke-linecap="round" opacity="0.65" />
  {:else}
    {#if sticker}<text x="0" y={labelSize > 40 ? -29 : -36} text-anchor="middle" font-size={labelSize} font-family="system-ui, sans-serif" font-weight="900" fill="#6b3f2a">{sticker}</text>{/if}
  {/if}
  <g fill="#6b3f2a">
    <ellipse cx="31" cy="-86" rx="4.5" ry={blink ? 1 : 5.5} />
    <ellipse cx="49" cy="-86" rx="4.5" ry={blink ? 1 : 5.5} />
  </g>
  <path d="M32 -74 Q40 -68 48 -74" fill="none" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" />
</g>
