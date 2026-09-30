<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, w, h, splash = 0 }: { x: number; y: number; w: number; h: number; splash?: number } = $props();
</script>

<g transform="translate({x} {y})">
  <ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} fill="var(--bark)" opacity="0.88" />
  <ellipse cx="0" cy="-3" rx={w * 0.32} ry={h * 0.2} fill="var(--ink)" opacity="0.72" />
  {#if splash > 0.02}
    <g opacity={splash} fill="none" stroke="var(--teal)" stroke-width="6" stroke-linecap="round">
      <path d={`M${-w * 0.36} ${-h * 0.25} q${-24 * splash} ${-34 * splash} ${-48 * splash} ${-18 * splash}`} />
      <path d={`M0 ${-h * 0.34} q${10 * splash} ${-44 * splash} ${30 * splash} ${-18 * splash}`} />
      <path d={`M${w * 0.33} ${-h * 0.2} q${34 * splash} ${-24 * splash} ${48 * splash} 4`} />
    </g>
  {/if}
</g>
