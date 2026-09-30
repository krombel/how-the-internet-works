<svelte:options namespace="svg" />
<script lang="ts">
  import { view } from '$core/api';
  import type { BeamProps } from '../types';
  let { d, from, to, colour, strength, time }: BeamProps = $props();
  // little sparks of data riding the beam towards the phone
  const sparks = $derived([0, 1, 2].map((i) => {
    const f = ((time * 0.8 + i / 3) % 1 + 1) % 1;
    return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, a: Math.sin(f * Math.PI) };
  }));
</script>

<g class="beam">
  <path {d} fill={colour} opacity={0.14 + 0.2 * strength} />
  <path {d} fill="none" stroke={colour} stroke-width="4" stroke-dasharray="12 10" stroke-dashoffset={-time * 40} opacity={0.4 + 0.5 * strength} />
  {#if view.mode === 'night'}{#each sparks as s}<circle cx={s.x} cy={s.y} r={20 + 6 * strength} fill={colour} opacity={0.3 * s.a * (0.5 + 0.5 * strength)} />{/each}{/if}
  {#each sparks as s}<circle cx={s.x} cy={s.y} r={7 + 3 * strength} fill={colour} stroke="var(--line)" stroke-width="3" opacity={s.a * (0.5 + 0.5 * strength)} />{/each}
</g>
