<svelte:options namespace="svg" />
<script lang="ts">
  import type { CaseProps } from '../types';
  let { box, lineCard, active, night, time }: CaseProps = $props();
  const { x, y, w, h } = $derived(box);
  const leds = $derived([0, 1, 2].map((i) => ({
    x: lineCard.x + 38 + i * 44,
    y: lineCard.y + 38,
    on: active || Math.sin(time * (2.1 + i * 0.4) + i) > -0.4,
    fill: ['var(--teal)', 'var(--sun)', 'var(--leaf)'][i],
  })));
</script>

{#if night}<rect x={x - 18} y={y - 18} width={w + 36} height={h + 36} rx="50" fill="var(--glow)" opacity="0.08" />{/if}
<rect x={x + 12} y={y + 16} width={w} height={h} rx="44" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="44" fill="var(--stone)" stroke="var(--line)" stroke-width="9" />
<rect x={x + 20} y={y + 20} width={w - 40} height={h - 40} rx="32" fill="var(--paper-2)" stroke="var(--line)" stroke-width="3" stroke-dasharray="17 13" opacity="0.86" />
<rect x={lineCard.x + 8} y={lineCard.y + 9} width={lineCard.w} height={lineCard.h} rx="23" fill="var(--shade)" opacity="0.12" />
<rect x={lineCard.x} y={lineCard.y} width={lineCard.w} height={lineCard.h} rx="23" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
<path d={`M${lineCard.x + 22} ${lineCard.y + lineCard.h * 0.58} H${lineCard.x + lineCard.w - 22}`} stroke="var(--line)" stroke-width="8" stroke-linecap="round" opacity="0.45" />
{#each leds as led (led.x)}
  {#if night && led.on}<circle cx={led.x} cy={led.y} r="22" fill={led.fill} opacity="0.24" />{/if}
  <circle cx={led.x} cy={led.y} r="9" fill={led.on ? led.fill : 'var(--paper-2)'} stroke="var(--line)" stroke-width="4" />
{/each}
