<svelte:options namespace="svg" />
<script lang="ts">
  // A hard disk with its lid off: the platter spinning (a mark goes round), and the arm swinging in to read.
  import type { Pt } from '../types';
  let { p, r, time, reading, still }: { p: Pt; r: number; time: number; reading: number; still: boolean } = $props();
  const spin = $derived(still ? 0.6 : time * 5.4);
  // the arm turns on a pivot in the lower right corner: parked off the platter's edge, over a middle track to read
  const pivot = $derived({ x: p.x + r * 1.15, y: p.y + r * 0.95 });
  const angle = $derived(Math.atan2(-0.95, -1.15) + 0.42 - reading * 0.3);
  const head = $derived({ x: pivot.x + Math.cos(angle) * r * 1.2, y: pivot.y + Math.sin(angle) * r * 1.2 });
</script>

<rect x={p.x - r * 1.35} y={p.y - r * 1.2} width={r * 2.75} height={r * 2.4} rx={r * 0.18} fill="var(--stone)" stroke="var(--line)" stroke-width="6" />
<circle cx={p.x} cy={p.y} r={r} fill="var(--paper-white)" stroke="var(--line)" stroke-width="5" />
<circle cx={p.x} cy={p.y} r={r * 0.62} fill="none" stroke="var(--line)" stroke-width="2" opacity="0.4" />
<path d={`M${p.x} ${p.y} L${p.x + Math.cos(spin) * r * 0.9} ${p.y + Math.sin(spin) * r * 0.9}`} stroke="var(--berry)" stroke-width="7" stroke-linecap="round" />
<circle cx={p.x} cy={p.y} r={r * 0.16} fill="var(--stone)" stroke="var(--line)" stroke-width="4" />
<path d={`M${pivot.x} ${pivot.y} L${head.x} ${head.y}`} stroke="var(--line)" stroke-width="10" stroke-linecap="round" />
<circle cx={head.x} cy={head.y} r="7" fill={reading > 0.05 ? 'var(--sun)' : 'var(--stone)'} stroke="var(--line)" stroke-width="3" />
<circle cx={pivot.x} cy={pivot.y} r="12" fill="var(--stone)" stroke="var(--line)" stroke-width="4" />
