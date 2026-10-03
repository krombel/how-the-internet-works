<svelte:options namespace="svg" />
<script lang="ts">
  // The server room of 1995 (#59): three shelves along the back wall, faint, each with a few beige tower computers on
  // it and a power light blinking here and there; a small room, not a hall.
  import { view, type PlaceBackdropProps } from '$core/api';
  let { orient, w, time }: PlaceBackdropProps = $props();
  // [x, y] of each shelf's left end (its board); landscape along the back, portrait up the right-hand wall
  const shelves = $derived(orient === 'portrait'
    ? [[520, 560], [520, 1040], [80, 1290]]
    : [[w / 2 - 640, 390], [w / 2 - 190, 360], [w / 2 + 300, 380]]);
  const SHELF = { w: 340, tower: 54, tall: 104, gap: 26 };
  const towers = [0, 1, 2, 3];
  // one light per tower, blinking out of step (lit when still)
  const lit = (i: number) => view.still || Math.sin(time * 1.9 + i * 2.3) > -0.4;
</script>

<g fill="none" stroke="var(--line)" stroke-width="4" stroke-opacity="0.22">
  {#each shelves as [x, y], s (s)}
    <path d={`M${x} ${y} H${x + SHELF.w} M${x + 16} ${y} V${y + 40} M${x + SHELF.w - 16} ${y} V${y + 40}`} />
    {#each towers as t (t)}
      {@const tx = x + 26 + t * (SHELF.tower + SHELF.gap)}
      {#if (s + t) % 4 !== 3}
        <rect x={tx} y={y - SHELF.tall} width={SHELF.tower} height={SHELF.tall} rx="6" />
        <path d={`M${tx + 10} ${y - SHELF.tall + 22} H${tx + SHELF.tower - 10}`} />
        {#if lit(s * 4 + t)}<circle cx={tx + SHELF.tower - 14} cy={y - 22} r="5" fill="var(--leaf)" fill-opacity="0.5" stroke="none" />{/if}
      {/if}
    {/each}
  {/each}
</g>
