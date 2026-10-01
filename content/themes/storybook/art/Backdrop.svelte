<svelte:options namespace="svg" />
<script lang="ts">
  import type { BackdropProps } from '$core/api';
  import { Depth, view } from '$core/api';
  let { kind, orient, w, h }: BackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
  const night = $derived(view.mode === 'night');
  // night sky: [x, y, size] of each star, in a band above the hills (the second number is a share of the height)
  const STARS: [number, number, number][] = [[60, .05, 7], [230, .2, 5], [390, .07, 9], [520, .26, 5], [610, .12, 6], [700, .03, 5],
    [880, .18, 8], [960, .06, 5], [1100, .24, 6], [1180, .1, 9], [1420, .28, 5], [1500, .05, 7], [1600, .16, 6], [300, .32, 4],
    [820, .3, 4], [1030, .34, 5], [140, .27, 6], [1650, .3, 4]];
  // other networks on the horizon of a group's scene: [x, y, radius]
  const others = $derived<[number, number, number][]>(portrait
    ? [[90, 250, 40], [330, 190, 34], [520, 150, 30]]
    : [[150, 175, 44], [400, 130, 36], [640, 160, 40], [1270, 170, 36], [1530, 140, 34]]);
  const stars = $derived(STARS.map(([x, y, r]) => (portrait ? [x * 0.6, y * 0.55 * h, r] : [x, y * h, r])));
  // a few stars twinkle (still when the reader prefers less motion)
  const twinkle = (i: number) => (view.still || i % 4 ? 1 : 0.55 + 0.45 * Math.sin(view.time * 1.7 + i * 2.1));
  const star = (x: number, y: number, r: number) => `M${x} ${y - r * 1.7} Q${x} ${y} ${x + r * 1.7} ${y} Q${x} ${y} ${x} ${y + r * 1.7} Q${x} ${y} ${x - r * 1.7} ${y} Q${x} ${y} ${x} ${y - r * 1.7} Z`;
  /** A crescent moon of radius r at (cx, cy), lit on the left. */
  const moon = (cx: number, cy: number, r: number) => `M${cx + r * 0.3} ${cy - r} A${r} ${r} 0 0 0 ${cx + r * 0.3} ${cy + r} A${r * 1.25} ${r * 1.25} 0 0 1 ${cx + r * 0.3} ${cy - r} Z`;
</script>

<!-- THESIS: teach networks as a warm picture-book journey, not a glowing tech diagram. OWN-WORLD: peach sky, rolling green paper hills, chunky brown outlines, smiling devices, luggage tags. STORY: packets run from where you are (a place's own backdrop: the cut-away home, the street) through roads, radio, fibre and a smiling-cloud internet. FIRST VIEWPORT: the place sits low/left, the internet cloud beyond the hills, labels float like painted signs. FORM: brief-pinned flat storybook world, springy motion, no SVG filters. -->

{#if kind === 'root'}
  <rect x={-w} y={-h} width={w * 3} height={h * 3} fill="var(--sky)" />
  <Depth d={0.35}>
    {#if night}
      {#each stars as [x, y, r], i (i)}<path d={star(x, y, r)} fill="var(--glow)" opacity={twinkle(i)} />{/each}
      <path d={moon(portrait ? 170 : 1320, portrait ? 170 : 150, portrait ? 62 : 70)} fill="var(--glow)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
    {:else}
      <circle cx={portrait ? 170 : 1320} cy={portrait ? 170 : 150} r={portrait ? 62 : 70} fill="var(--sun)" stroke="var(--line)" stroke-width="6" />
    {/if}
    <!-- portrait keeps one sky cloud: a second one would sit right behind the internet cloud -->
    {#if !portrait}<path d="M160 130 C194 86 268 96 282 145 C340 142 368 178 342 214 H146 C112 193 123 145 160 130 Z" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />{/if}
    <path d={portrait ? 'M100 420 C132 384 192 392 205 436 C252 435 279 464 260 498 H86 C60 478 69 438 100 420 Z' : 'M760 96 C792 62 850 70 862 112 C912 112 940 142 918 174 H744 C714 157 724 113 760 96 Z'} fill="var(--paper-white)" stroke="var(--line)" stroke-width="5" opacity="0.95" />
  </Depth>
  <Depth d={0.62}>
    <path d={portrait ? `M-80 ${h * 0.38} C180 ${h * 0.26} 400 ${h * 0.50} 700 ${h * 0.33} C900 ${h * 0.22} 1100 ${h * 0.34} 1050 ${h * 0.48} L1050 ${h * 1.4} H-80 Z` : `M-100 500 C170 350 360 520 580 410 C820 290 1050 470 1280 330 C1450 230 1700 340 1740 490 L1740 1100 H-100 Z`} fill="var(--hill-far)" stroke="var(--line)" stroke-width="7" />
  </Depth>
  <Depth d={0.82}>
    <path d={portrait ? `M-100 ${h * 0.56} C160 ${h * 0.44} 310 ${h * 0.63} 520 ${h * 0.52} C700 ${h * 0.43} 860 ${h * 0.50} 1020 ${h * 0.44} L1020 ${h * 1.4} H-100 Z` : `M-120 650 C130 520 330 670 550 560 C780 450 1020 660 1270 505 C1450 395 1650 460 1740 560 L1740 1100 H-120 Z`} fill="var(--leaf)" stroke="var(--line)" stroke-width="8" />
  </Depth>
{:else}
  <rect x={-w} y={-h} width={w * 3} height={h * 3} fill="var(--sky)" />
  <Depth d={0.42}>
    {#if night}
      {#each stars as [x, y, r], i (i)}<path d={star(x, y * 0.6, r)} fill="var(--glow)" opacity={twinkle(i)} />{/each}
    {/if}
    <path d={portrait ? 'M-80 300 C170 200 340 330 560 240 C720 180 920 250 1020 210 L1020 1760 H-80 Z' : 'M-100 250 C210 170 430 250 680 200 C950 150 1180 230 1500 170 C1640 150 1760 180 1780 220 L1780 1050 H-100 Z'} fill="var(--grass-far)" stroke="var(--line)" stroke-width="7" />
  </Depth>
  <!-- the rest of the internet: other networks far off, faint, that this trip doesn't use -->
  <Depth d={0.5}>
    <!-- faint through stroke-opacity, not a group opacity: that would repaint off-screen at every step of a zoom -->
    <g fill="none" stroke="var(--line)" stroke-width="4" stroke-opacity="0.35">
      {#each others as [x, y, r], i (i)}
        <circle cx={x} cy={y} {r} stroke-dasharray="3 10" stroke-linecap="round" />
        <path d={`M${x - r * 0.45} ${y + r * 0.2} L${x} ${y - r * 0.35} L${x + r * 0.45} ${y + r * 0.2} Z`} />
        {#each [[-0.45, 0.2], [0, -0.35], [0.45, 0.2]] as [dx, dy], k (k)}<circle cx={x + dx * r} cy={y + dy * r} r="6" fill="var(--paper)" />{/each}
        {#if i}<path d={`M${others[i - 1][0] + others[i - 1][2]} ${others[i - 1][1]} Q${(x + others[i - 1][0]) / 2} ${Math.min(y, others[i - 1][1]) - 40} ${x - r} ${y}`} stroke-dasharray="10 12" />{/if}
      {/each}
    </g>
  </Depth>
  <!-- the sun (or moon) in front of the faint networks' lines -->
  <Depth d={0.42}>
    {#if night}
      <path d={moon(portrait ? 730 : 1360, portrait ? 120 : 115, 56)} fill="var(--glow)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
    {:else}
      <circle cx={portrait ? 730 : 1360} cy={portrait ? 120 : 115} r="56" fill="var(--sun)" stroke="var(--line)" stroke-width="6" />
    {/if}
  </Depth>
  <Depth d={0.75}>
    <path d={portrait ? 'M-100 420 C150 340 310 440 530 380 C715 330 900 380 1030 340 L1030 1760 H-100 Z' : 'M-120 300 C150 240 360 310 580 265 C820 220 1040 300 1290 250 C1450 220 1660 240 1760 280 L1760 1050 H-120 Z'} fill="var(--grass-near)" stroke="var(--line)" stroke-width="8" />
  </Depth>
{/if}
