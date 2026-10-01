<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, w, h, ok = 0 }: { x: number; y: number; w: number; h: number; ok?: number } = $props();
</script>

<g transform="translate({x} {y})">
  <rect width={w} height={h} rx="22" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
  <path d="M24 46 H{w - 88} M24 86 H{w - 106} M24 126 H{w - 132}" stroke="var(--muted)" stroke-width="7" stroke-linecap="round" opacity="0.55" />
  <circle cx={w - 54} cy="55" r="34" fill="var(--sun)" stroke="var(--line)" stroke-width="5" />
  <path d="M{w - 69} 56 L{w - 58} 68 L{w - 36} 41" fill="none" stroke="var(--face)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity={ok} />
  <path d="M{w - 78} 90 L{w - 55} 80 L{w - 32} 90 L{w - 32} 140 L{w - 55} 128 L{w - 78} 140 Z" fill="var(--accent)" stroke="var(--line)" stroke-width="4" opacity="0.82" />
</g>
