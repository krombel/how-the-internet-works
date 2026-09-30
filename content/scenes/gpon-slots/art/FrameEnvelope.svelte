<svelte:options namespace="svg" />
<script lang="ts">
  let {
    x,
    y,
    scale = 1,
    label,
    kept = false,
    muted = false,
    locked = false,
    checked = false,
    walking = false,
    time = 0,
  }: {
    x: number;
    y: number;
    scale?: number;
    label: string;
    kept?: boolean;
    muted?: boolean;
    locked?: boolean;
    checked?: boolean;
    walking?: boolean;
    time?: number;
  } = $props();
  const step = $derived(walking ? Math.sin(time * 12) * 5 : 0);
</script>

<g transform="translate({x} {y}) scale({scale})" opacity={muted ? 0.55 : 1}>
  <ellipse cx="0" cy="18" rx="62" ry="12" fill="#6b3f2a" opacity="0.14" />
  {#if walking}
    <g stroke="#6b3f2a" stroke-width="6" stroke-linecap="round">
      <path d="M-22 2 L{-26 + step} 16" />
      <path d="M22 2 L{26 - step} 16" />
    </g>
  {/if}
  <rect x="-64" y="-74" width="128" height="86" rx="13" fill={kept ? '#ffcf5d' : '#fff2d7'} stroke="#6b3f2a" stroke-width={kept ? 7 : 5} />
  <path d="M-59 -68 L0 -26 L59 -68" fill="none" stroke="#6b3f2a" stroke-width="4" opacity="0.65" />
  <rect x="-43" y="-33" width="86" height="32" rx="8" fill="#fff7df" stroke="#6b3f2a" stroke-width="3.5" />
  <text x="0" y="-10" text-anchor="middle" font-size="23" font-family="ui-rounded, system-ui, sans-serif" font-weight="800" fill="#6b3f2a">{label}</text>
  {#if locked}
    <g transform="translate(46 -60)">
      <rect x="-13" y="-1" width="26" height="22" rx="5" fill="#72b8a5" stroke="#6b3f2a" stroke-width="4" />
      <path d="M-8 -1 V-12 A8 8 0 0 1 8 -12 V-1" fill="none" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" />
    </g>
  {/if}
  {#if checked}
    <g transform="translate(45 -55)">
      <circle r="16" fill="#8fc97a" stroke="#6b3f2a" stroke-width="4" />
      <path d="M-8 -1 L-2 6 L10 -8" fill="none" stroke="#fff7df" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  {/if}
</g>
