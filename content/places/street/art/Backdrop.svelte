<svelte:options namespace="svg" />
<script lang="ts">
  // Out on the street: a row of little shops, a lamp post, the pavement and the road with a little car.
  import { Depth, type PlaceBackdropProps } from '$core/api';
  let { orient, w, time }: PlaceBackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
  // [x, width, height, colour, roof colour] of each shop, standing on the pavement
  const shops = $derived<[number, number, number, string, string][]>(portrait
    ? [[24, 150, 230, '#ffd89c', '#f28057'], [470, 170, 190, '#fff2d7', '#72b8a5']]
    : [[30, 170, 250, '#ffd89c', '#f28057'], [440, 150, 200, '#fff2d7', '#72b8a5'], [600, 120, 150, '#f6b56b', '#bd6b87']]);
  const ground = $derived(portrait ? 1470 : 712);
  const lamp = $derived(portrait ? 410 : 1030);
  const car = $derived(((time * 70) % (w + 400)) - 200);
</script>

<Depth d={1.03}>
  {#each shops as [x, sw, sh, c, r] (x)}
    <g transform="translate({x} {ground - sh})">
      <rect width={sw} height={sh} rx="8" fill={c} stroke="#6b3f2a" stroke-width="7" />
      <path d={`M-10 6 H${sw + 10} L${sw - 6} -24 H6 Z`} fill={r} stroke="#6b3f2a" stroke-width="7" stroke-linejoin="round" />
      <path d={`M0 ${sh * 0.35} ${Array.from({ length: Math.round(sw / 30) }, (_, i) => `h15 v14 h15 v-14`).join(' ')}`} fill="none" stroke="#6b3f2a" stroke-width="4" opacity="0.45" />
      <rect x={sw * 0.12} y={sh * 0.52} width={sw * 0.36} height={sh * 0.3} rx="6" fill="#fff7df" stroke="#6b3f2a" stroke-width="5" />
      <rect x={sw * 0.6} y={sh * 0.52} width={sw * 0.26} height={sh * 0.48} rx="6" fill="#c58a54" stroke="#6b3f2a" stroke-width="5" />
    </g>
  {/each}
  <!-- lamp post -->
  <g transform="translate({lamp} {ground})">
    <path d="M0 0 V-170 Q0 -202 34 -202" fill="none" stroke="#6b3f2a" stroke-width="9" stroke-linecap="round" />
    <path d="M22 -202 H58 L50 -184 H30 Z" fill="#ffcf5d" stroke="#6b3f2a" stroke-width="6" stroke-linejoin="round" />
    <ellipse cx="0" cy="0" rx="18" ry="7" fill="#6b3f2a" opacity="0.3" />
  </g>
  <!-- pavement, kerb and road -->
  <rect x="-40" y={ground} width={w + 80} height="34" fill="#f3dcb2" stroke="#6b3f2a" stroke-width="6" />
  <rect x="-40" y={ground + 34} width={w + 80} height="220" fill="#cbb29a" stroke="#6b3f2a" stroke-width="6" />
  <path d={`M-40 ${ground + 104} H${w + 40}`} stroke="#fff7df" stroke-width="8" stroke-dasharray="46 38" opacity="0.8" />
  <!-- a little car pootling along -->
  <g transform="translate({car} {ground + 132})">
    <path d="M-60 0 V-26 Q-60 -34 -50 -34 H-30 L-14 -58 H30 L48 -34 H56 Q64 -34 64 -24 V0 Z" fill="#72b8a5" stroke="#6b3f2a" stroke-width="6" stroke-linejoin="round" />
    <path d="M-8 -50 H24 L36 -34 H-18 Z" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" stroke-linejoin="round" />
    <circle cx="-34" cy="2" r="13" fill="#6b3f2a" /><circle cx="38" cy="2" r="13" fill="#6b3f2a" />
  </g>
</Depth>
