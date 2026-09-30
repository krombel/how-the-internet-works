<svelte:options namespace="svg" />
<script lang="ts">
  import type { CaseProps } from '../types';
  let { mast, cabinet }: CaseProps = $props();
  // the lattice: legs splaying out towards the cabinet, braced in three bays
  const bays = $derived([0, 1, 2].map((k) => {
    const y0 = mast.y0 + ((mast.y1 - mast.y0) * k) / 3, y1 = mast.y0 + ((mast.y1 - mast.y0) * (k + 1)) / 3;
    const w0 = 22 + (14 * k) / 3, w1 = 22 + (14 * (k + 1)) / 3;
    return `M${mast.x - w0} ${y0} L${mast.x + w1} ${y1} M${mast.x + w0} ${y0} L${mast.x - w1} ${y1} M${mast.x - w1} ${y1} H${mast.x + w1}`;
  }).join(' '));
</script>

<path d={`M${mast.x - 22} ${mast.y0} L${mast.x - 36} ${mast.y1} M${mast.x + 22} ${mast.y0} L${mast.x + 36} ${mast.y1}`} stroke="var(--line)" stroke-width="11" stroke-linecap="round" />
<path d={bays} stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.7" />
<rect x={cabinet.x + 14} y={cabinet.y + 18} width={cabinet.w} height={cabinet.h} rx="38" fill="var(--shade)" opacity="0.14" />
<rect x={cabinet.x} y={cabinet.y} width={cabinet.w} height={cabinet.h} rx="38" fill="var(--stone)" stroke="var(--line)" stroke-width="9" />
