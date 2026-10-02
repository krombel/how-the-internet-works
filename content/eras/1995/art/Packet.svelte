<svelte:options namespace="svg" />
<script lang="ts">
  // 1995's parcel touch: the parcel going out carries a little postage stamp (the answer coming back is left plain).
  import type { EraParcelProps } from '$core/api';
  let { dir, size }: EraParcelProps = $props();
  const s = $derived(size * 0.44);
</script>

{#if dir === 'up'}
  <g transform="translate({size * 0.1} {-size * 0.08})" stroke="var(--line)">
    <rect x={-s / 2} y={-s / 2} width={s} height={s} fill="var(--paper-white)" stroke-width={s * 0.12} stroke-dasharray="{s * 0.14} {s * 0.1}" />
    <rect x={-s * 0.28} y={-s * 0.28} width={s * 0.56} height={s * 0.56} fill="var(--roof)" stroke="none" />
  </g>
{/if}
