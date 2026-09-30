<svelte:options namespace="svg" />
<script lang="ts">
  import { COPPER } from '../copper';
  import type { CableProps } from '../types';
  import Spark from './Spark.svelte';
  let { paths, sparks, nerd }: CableProps = $props();
</script>

<g>
  <path d={`M${COPPER.fromX + 112} ${COPPER.nodeY} H${COPPER.cableX0 + 36}`} stroke="var(--line)" stroke-width="52" stroke-linecap="round" opacity="0.2" />
  <path d={`M${COPPER.cableX1 - 36} ${COPPER.nodeY} H${COPPER.toX - 112}`} stroke="var(--line)" stroke-width="52" stroke-linecap="round" opacity="0.2" />
  <rect x={COPPER.cableX0 - 20} y={COPPER.jacketY - COPPER.jacketH / 2} width={COPPER.cableX1 - COPPER.cableX0 + 40} height={COPPER.jacketH} rx="70" fill="var(--tan-pale)" stroke="var(--line)" stroke-width="8" opacity="0.96" />
  <path d={`M${COPPER.cableX0 + 28} ${COPPER.jacketY - 74} C${COPPER.cableX0 + 255} ${COPPER.jacketY - 132} ${COPPER.cableX1 - 255} ${COPPER.jacketY - 132} ${COPPER.cableX1 - 28} ${COPPER.jacketY - 74} V${COPPER.jacketY + 74} C${COPPER.cableX1 - 255} ${COPPER.jacketY + 132} ${COPPER.cableX0 + 255} ${COPPER.jacketY + 132} ${COPPER.cableX0 + 28} ${COPPER.jacketY + 74} Z`} fill="var(--paper)" stroke="var(--line)" stroke-width="5" />
  <path d={`M${COPPER.cableX0 + 52} ${COPPER.jacketY - 67} C${COPPER.cableX0 + 280} ${COPPER.jacketY - 110} ${COPPER.cableX1 - 280} ${COPPER.jacketY - 110} ${COPPER.cableX1 - 52} ${COPPER.jacketY - 67}`} fill="none" stroke="var(--white)" stroke-width="8" opacity="0.55" />
  {#each paths as p, i}
    {@const dim = !nerd && p.pair > 0}
    {#if p.stripe}
      <path d={p.d} fill="none" stroke="var(--paper)" stroke-width={dim ? 13 : 16} stroke-linecap="round" stroke-linejoin="round" opacity={dim ? 0.58 : 1} />
      <path d={p.d} fill="none" stroke={p.colour} stroke-width={dim ? 6 : 8} stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="26 44" stroke-dashoffset={i * 6} opacity={dim ? 0.5 : 0.95} />
    {:else}
      <path d={p.d} fill="none" stroke="var(--line)" stroke-width={dim ? 16 : 20} stroke-linecap="round" stroke-linejoin="round" opacity={dim ? 0.12 : 0.22} />
      <path d={p.d} fill="none" stroke={p.colour} stroke-width={dim ? 10 : 15} stroke-linecap="round" stroke-linejoin="round" opacity={dim ? 0.48 : 1} />
      <path d={p.d} fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity={dim ? 0.22 : 0.55} />
    {/if}
  {/each}
  {#each sparks as s (s.key)}<Spark spark={s} />{/each}
</g>
