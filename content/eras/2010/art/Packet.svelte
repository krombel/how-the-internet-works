<svelte:options namespace="svg" />
<script lang="ts">
  // 2010's parcel touch: a glossy shine across the top, the way buttons and icons looked then.
  import type { EraParcelProps } from '$core/api';
  let { size }: EraParcelProps = $props();
  const r = $derived(size * 0.34);
</script>

<g fill="none" stroke="var(--shine)" stroke-linecap="round" opacity="0.9">
  <path d="M{-r * 0.94} {-r * 0.34} A{r} {r} 0 0 1 {r * 0.34} {-r * 0.94}" stroke-width={size * 0.1} />
  <circle cx={r * 0.72} cy={-r * 0.7} r={size * 0.01} stroke-width={size * 0.1} />
</g>
