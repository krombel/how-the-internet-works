<svelte:options namespace="svg" />
<script lang="ts">
  // One signpost board, pointing back (left), on (right) or off to the side (right and up). `lit` 0..1 when the
  // parcel's address matches it.
  import type { SignProps } from '../types';
  let { x, y, w, h, to, lit }: SignProps = $props();
  const tip = $derived(h * 0.45);
  const d = $derived(to === 'back'
    ? `M${x - w / 2} ${y} L${x - w / 2 + tip} ${y - h / 2} H${x + w / 2} V${y + h / 2} H${x - w / 2 + tip} Z`
    : `M${x + w / 2} ${y} L${x + w / 2 - tip} ${y - h / 2} H${x - w / 2} V${y + h / 2} H${x + w / 2 - tip} Z`);
</script>

<g transform={to === 'side' ? `rotate(-4 ${x} ${y})` : undefined}>
  <path d={d} fill={lit > 0 ? 'var(--sun)' : 'var(--kraft)'} stroke="var(--line)" stroke-width="6" stroke-linejoin="round" transform={lit > 0 ? `translate(${x} ${y}) scale(${1 + 0.06 * Math.sin(lit * Math.PI)}) translate(${-x} ${-y})` : undefined} />
  <circle cx={to === 'back' ? x + w / 2 - 18 : x - w / 2 + 18} cy={y} r="6" fill="var(--muted)" />
</g>
