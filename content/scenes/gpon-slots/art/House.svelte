<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, size = 80, highlight = false }: { x: number; y: number; size?: number; highlight?: boolean } = $props();
  const s = $derived(size / 100);
</script>

<g transform="translate({x} {y}) scale({s})">
  <ellipse cx="0" cy="44" rx="50" ry="9" fill="#6b3f2a" opacity="0.14" />
  <path d="M-48 -5 L0 -45 L48 -5" fill={highlight ? '#ffcf5d' : '#f28f5b'} stroke="#6b3f2a" stroke-width="6" stroke-linejoin="round" />
  <rect x="-38" y="-5" width="76" height="54" rx="8" fill="#fff2d7" stroke="#6b3f2a" stroke-width="6" />
  <rect x="-10" y="15" width="20" height="34" rx="4" fill="#72b8a5" stroke="#6b3f2a" stroke-width="4" />
  <rect x="18" y="9" width="15" height="14" rx="3" fill="#bd6b87" stroke="#6b3f2a" stroke-width="3" />
</g>
