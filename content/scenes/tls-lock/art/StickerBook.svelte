<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, w, h, ok = 0 }: { x: number; y: number; w: number; h: number; ok?: number } = $props();
</script>

<g transform="translate({x} {y})">
  <path d="M18 0 H{w - 16} Q{w} 0 {w} 16 V{h - 18} Q{w} {h} {w - 18} {h} H16 Q0 {h} 0 {h - 16} V18 Q0 0 18 0 Z" fill="#fff2d7" stroke="#6b3f2a" stroke-width="6" />
  <path d="M{w / 2} 10 V{h - 10}" stroke="#e8be80" stroke-width="5" stroke-dasharray="10 10" />
  {#each [[54, 54], [122, 98], [w - 76, 58], [w - 132, 132]] as s, i}
    <g transform="translate({s[0]} {s[1]}) rotate({i % 2 ? -8 : 8})">
      <circle r="26" fill={i === 2 ? '#ffcf5d' : '#f5d9a3'} stroke="#6b3f2a" stroke-width="4" />
      <path d="M-12 1 L-2 12 L15 -12" fill="none" stroke="#6b3f2a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity={i === 2 ? Math.max(0.28, ok) : 0.28} />
    </g>
  {/each}
</g>
