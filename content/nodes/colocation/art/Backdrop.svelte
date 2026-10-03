<svelte:options namespace="svg" />
<script lang="ts">
  // The colocation hall of 2010 (#59): a raised floor of tiles, a row of grey racks behind a cage's mesh fence, and a
  // cooling unit (CRAC) at each end of the row; faint, with a light blinking here and there. Not today's hall of open
  // racks: the video company rents one caged row of a shared building.
  import { view, type PlaceBackdropProps } from '$core/api';
  let { orient, w, h, time }: PlaceBackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
  // the row: the left end of the first rack, the racks' tops, how many and how far apart
  const ROW = $derived(portrait ? { x: 430, y: h - 190, n: 3, step: 112, w: 62, h: 118 } : { x: w / 2 - 560, y: 250, n: 9, step: 116, w: 70, h: 132 });
  const racks = $derived(Array.from({ length: ROW.n }, (_, i) => ROW.x + i * ROW.step));
  const end = $derived(ROW.x + (ROW.n - 1) * ROW.step + ROW.w);
  // the cage's fence: a frame round the row with mesh bars, a little in front of it
  const cage = $derived({ x: ROW.x - 20, y: ROW.y - 24, w: end - ROW.x + 40, h: ROW.h + 44 });
  const bars = $derived(Array.from({ length: Math.floor(cage.w / 28) - 1 }, (_, i) => cage.x + 28 * (i + 1)));
  // a cooling unit at each end of the row (portrait: only the far end has room)
  const crac = $derived(portrait ? [end + 40] : [ROW.x - 150, end + 50]);
  // the raised floor: a line under the row and the cooling units, with a tile's edge every 120
  const floor = $derived({ y: cage.y + cage.h + 26, x0: Math.min(cage.x, ...crac) - 40, x1: Math.max(cage.x + cage.w, ...crac.map((x) => x + 96)) + 40 });
  const tiles = $derived(Array.from({ length: Math.floor((floor.x1 - floor.x0) / 120) + 1 }, (_, i) => floor.x0 + i * 120));
  // one light per rack, blinking out of step (lit when still)
  const lit = (i: number) => view.still || Math.sin(time * 2.1 + i * 1.9) > -0.3;
</script>

<g fill="none" stroke="var(--line)" stroke-width="4" stroke-opacity="0.22">
  {#each racks as x, i (i)}
    <rect {x} y={ROW.y} width={ROW.w} height={ROW.h} rx="6" fill="var(--stone)" fill-opacity="0.18" />
    <path d={`M${x + 10} ${ROW.y + ROW.h * 0.35} H${x + ROW.w - 10} M${x + 10} ${ROW.y + ROW.h * 0.6} H${x + ROW.w - 10} M${x + 10} ${ROW.y + ROW.h * 0.85} H${x + ROW.w - 10}`} />
    {#if lit(i)}<circle cx={x + 16} cy={ROW.y + ROW.h * 0.16} r="5" fill="var(--leaf)" fill-opacity="0.5" stroke="none" />{/if}
  {/each}
  <rect x={cage.x} y={cage.y} width={cage.w} height={cage.h} rx="4" />
  <path d={bars.map((x) => `M${x} ${cage.y} V${cage.y + cage.h}`).join(' ')} stroke-width="2" />
  {#each crac as x (x)}
    <rect {x} y={ROW.y + 10} width="96" height={ROW.h - 10} rx="8" />
    <path d={`M${x + 16} ${ROW.y + 32} H${x + 80} M${x + 16} ${ROW.y + 46} H${x + 80} M${x + 16} ${ROW.y + 60} H${x + 80}`} />
  {/each}
  <path d={`M${floor.x0} ${floor.y} H${floor.x1}`} />
  <path d={tiles.map((x) => `M${x} ${floor.y} v26`).join(' ')} stroke-width="2" />
</g>
