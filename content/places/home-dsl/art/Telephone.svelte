<svelte:options namespace="svg" />
<script lang="ts">
  // An old telephone on a little table (x: the table's left edge, top: its top, floor: the floor under it).
  import { Depth } from '$core/api';
  let { x, top, floor }: { x: number; top: number; floor: number } = $props();
</script>

<Depth d={1.03}>
  <g stroke="var(--line)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M{x + 16} {top + 12} V{floor} M{x + 104} {top + 12} V{floor}" fill="none" />
    <rect {x} y={top} width="120" height="16" rx="5" fill="var(--cardboard)" />
    <!-- the telephone: its body, the dial, and the handset resting on top -->
    <path d="M{x + 26} {top} L{x + 36} {top - 38} H{x + 84} L{x + 94} {top} Z" fill="var(--berry)" />
    <circle cx={x + 60} cy={top - 19} r="11" fill="var(--paper)" stroke-width="4" />
    <path d="M{x + 22} {top - 46} Q{x + 60} {top - 62} {x + 98} {top - 46} L{x + 94} {top - 38} H{x + 26} Z" fill="var(--berry)" />
  </g>
</Depth>
