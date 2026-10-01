<svelte:options namespace="svg" />
<script lang="ts">
  // The hall of the data centre: rows of tall racks along the back, faint, with a light blinking here and there.
  import { view, type PlaceBackdropProps } from '$core/api';
  let { orient, w, h, time }: PlaceBackdropProps = $props();
  // [x, y] of each rack's top left corner: a row along the back of the hall
  const racks = $derived(orient === 'portrait'
    ? Array.from({ length: 4 }, (_, i) => [400 + i * 120, h - 170])
    : Array.from({ length: 11 }, (_, i) => [w / 2 - 5.5 * 128 + 24 + i * 128, 260]));
  const RACK = $derived(orient === 'portrait' ? { w: 66, h: 120 } : { w: 74, h: 136 });
  // one light per rack, blinking out of step (lit when still)
  const lit = (i: number) => view.still || Math.sin(time * 2.3 + i * 1.7) > -0.3;
</script>

<g fill="none" stroke="var(--line)" stroke-width="4" stroke-opacity="0.22">
  {#each racks as [x, y], i (i)}
    <rect {x} {y} width={RACK.w} height={RACK.h} rx="8" />
    <path d={`M${x + 10} ${y + RACK.h * 0.3} H${x + RACK.w - 10} M${x + 10} ${y + RACK.h * 0.55} H${x + RACK.w - 10} M${x + 10} ${y + RACK.h * 0.8} H${x + RACK.w - 10}`} />
    {#if lit(i)}<circle cx={x + 16} cy={y + RACK.h * 0.15} r="5" fill="var(--teal)" fill-opacity="0.5" stroke="none" />{/if}
  {/each}
</g>
