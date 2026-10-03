<svelte:options namespace="svg" />
<script lang="ts">
  // A block of flats, cut away: your flat (the same room and spots as the house at home; in portrait a loft upstairs
  // for the router), the neighbours' floors above with their windows, and under the ground the basement, where the
  // cable from every flat meets the ISP's switch. Lit and cosy at night.
  import { Depth, view, type PlaceBackdropProps } from '$core/api';
  let { orient }: PlaceBackdropProps = $props();
  const night = $derived(view.mode === 'night');
  // the walls, the roof, the neighbours' floors (window bands), your flat's rooms, the ground and the basement
  const B = $derived(orient === 'portrait'
    ? { x0: 74, x1: 846, roof: 520, floors: [[580, 760]], rooms: [[800, 1000], [1040, 1536]], ground: 1570, base: 1590, lamp: 420, n: 3 }
    : { x0: 109, x1: 1124, roof: 40, floors: [[100, 250], [280, 430]], rooms: [[466, 758]], ground: 790, base: 812, lamp: 310, n: 6 });
  const windows = $derived(Array.from({ length: B.n }, (_, i) => B.x0 + ((B.x1 - B.x0) * (i + 0.5)) / B.n));
  const main = $derived(B.rooms[B.rooms.length - 1]);
</script>

<Depth d={1.03}>
  <!-- the ground the basement is dug into, and the basement, cut away -->
  <path d="M{B.x0 - 60} {B.ground} H{B.x1 + 60} V{B.ground + 140} H{B.x0 - 60} Z" fill="var(--clay)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
  <path d="M{B.x0 + 44} {B.base} H{B.x1 - 44} V{B.ground + 112} H{B.x0 + 44} Z" fill="var(--room)" stroke="var(--line)" stroke-width="5" opacity="0.6" />
  <path d="M{B.x0} {B.roof + 24} H{B.x1} V{B.ground} H{B.x0} Z" fill="var(--peach)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
  <rect x={B.x0 - 26} y={B.roof} width={B.x1 - B.x0 + 52} height="34" rx="8" fill="var(--roof)" stroke="var(--line)" stroke-width="8" />
  <!-- the neighbours' floors: just windows -->
  {#each B.floors as [t, b] (t)}
    {#each windows as x (x)}
      <rect x={x - 36} y={t + 16} width="72" height={b - t - 32} rx="8" fill="var(--window)" stroke="var(--window-frame)" stroke-width="6" />
      <path d="M{x} {t + 16} V{b - 16}" stroke="var(--window-frame)" stroke-width="4" />
    {/each}
  {/each}
  <!-- your flat, cut away -->
  {#each B.rooms as [t, b] (t)}
    <path d="M{B.x0 + 44} {t} H{B.x1 - 44} V{b} H{B.x0 + 44} Z" fill="var(--room)" stroke="var(--line)" stroke-width="5" opacity="0.74" />
    <path d="M{B.x0 + 44} {b - 30} H{B.x1 - 44} V{b} H{B.x0 + 44} Z" fill="var(--wood)" stroke="var(--line)" stroke-width="5" />
  {/each}
  {#if night}<ellipse cx={B.lamp} cy={main[0] + 120} rx="150" ry="120" fill="var(--lamp)" opacity="0.14" />{/if}
  <path d="M{B.lamp} {main[0]} V{main[0] + 34}" stroke="var(--line)" stroke-width="4" />
  <path d="M{B.lamp - 26} {main[0] + 60} Q{B.lamp - 24} {main[0] + 34} {B.lamp} {main[0] + 34} Q{B.lamp + 24} {main[0] + 34} {B.lamp + 26} {main[0] + 60} Z" fill="var(--lamp)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M{B.x0 - 60} {B.ground} H{B.x1 + 60}" stroke="var(--line)" stroke-width="7" stroke-linecap="round" />
</Depth>
