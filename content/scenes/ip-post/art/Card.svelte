<svelte:options namespace="svg" />
<script lang="ts">
  // A paper card pinned above the road: the address label close-up, or this hop's own tool (signposts' table,
  // notebook, door plate). A coloured strip along the top says which.
  import type { CardProps } from '../types';
  let { x, y, w, h, tint }: CardProps = $props();
</script>

<g>
  <rect x={x + 8} y={y + 10} width={w} height={h} rx="26" fill="var(--shade)" opacity="0.12" />
  <rect {x} {y} width={w} height={h} rx="26" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
  <path d={`M${x + 3} ${y + 30} Q${x + 3} ${y + 3} ${x + 30} ${y + 3} H${x + w - 30} Q${x + w - 3} ${y + 3} ${x + w - 3} ${y + 30} V${y + 20} H${x + 3} Z`} fill={tint} opacity="0.9" />
  <circle cx={x + w / 2} cy={y + 2} r="11" fill="var(--accent)" stroke="var(--line)" stroke-width="4" />
</g>
