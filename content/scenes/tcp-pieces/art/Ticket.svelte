<svelte:options namespace="svg" />
<script lang="ts">
  import { Text } from '$core/api';
  import { ticketW } from '../tcp';
  let { x, y, text, size, green = false }: { x: number; y: number; text: string; size: number; green?: boolean } = $props();
  const w = $derived(ticketW(text, size));
  const h = $derived(size * 1.6);
  const r = $derived(size * 0.45);
</script>

<g transform="translate({x} {y})">
  <path d={`M${-w / 2 + r} ${-h / 2} H${w / 2 - r} Q${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + r} V${h / 2 - r} Q${w / 2} ${h / 2} ${w / 2 - r} ${h / 2} H-${size * 0.3} L-${size * 0.9} ${h / 2 + size * 0.6} L-${size * 0.75} ${h / 2} H${-w / 2 + r} Q${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - r} V${-h / 2 + r} Q${-w / 2} ${-h / 2} ${-w / 2 + r} ${-h / 2} Z`} fill={green ? 'var(--leaf-pale)' : 'var(--paper)'} stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <Text x={0} y={size * 0.35} {text} {size} kind="node" />
</g>
