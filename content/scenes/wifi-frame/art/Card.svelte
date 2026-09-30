<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, w, h, tint = 'var(--sun)' }: { x: number; y: number; w: number; h: number; tint?: string } = $props();
</script>

<g>
  <rect x={x + 8} y={y + 10} width={w} height={h} rx="26" fill="var(--line)" opacity="0.12" />
  <rect {x} {y} width={w} height={h} rx="26" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
  <path d={`M${x + 3} ${y + 30} Q${x + 3} ${y + 3} ${x + 30} ${y + 3} H${x + w - 30} Q${x + w - 3} ${y + 3} ${x + w - 3} ${y + 30} V${y + 20} H${x + 3} Z`} fill={tint} opacity="0.92" />
  <circle cx={x + w / 2} cy={y + 2} r="11" fill="var(--accent)" stroke="var(--line)" stroke-width="4" />
</g>
