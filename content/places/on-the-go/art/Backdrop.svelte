<svelte:options namespace="svg" />
<script lang="ts">
  // Out on the street: a row of little shops, a lamp post, the pavement and the road with a little car.
  import { Depth, view, type PlaceBackdropProps } from '$core/api';
  let { orient, w, time }: PlaceBackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
  // [x, width, height, colour, roof colour] of each shop, standing on the pavement
  const shops = $derived<[number, number, number, string, string][]>(portrait
    ? [[24, 150, 230, 'var(--peach)', 'var(--roof)'], [470, 170, 190, 'var(--paper-2)', 'var(--teal)']]
    : [[-25, 150, 250, 'var(--peach)', 'var(--roof)'], [135, 135, 200, 'var(--paper-2)', 'var(--teal)'], [280, 110, 150, 'var(--tan)', 'var(--berry)']]);
  const ground = $derived(portrait ? 1470 : 712);
  const lamp = $derived(portrait ? 700 : 410);
  const car = $derived(((time * 70) % (w + 400)) - 200);
  const night = $derived(view.mode === 'night');
</script>

<Depth d={1.03}>
  {#each shops as [x, sw, sh, c, r] (x)}
    <g transform="translate({x} {ground - sh})">
      <rect width={sw} height={sh} rx="8" fill={c} stroke="var(--line)" stroke-width="7" />
      <path d={`M-10 6 H${sw + 10} L${sw - 6} -24 H6 Z`} fill={r} stroke="var(--line)" stroke-width="7" stroke-linejoin="round" />
      <path d={`M0 ${sh * 0.35} ${Array.from({ length: Math.round(sw / 30) }, (_, i) => `h15 v14 h15 v-14`).join(' ')}`} fill="none" stroke="var(--line)" stroke-width="4" opacity="0.45" />
      <rect x={sw * 0.12} y={sh * 0.52} width={sw * 0.36} height={sh * 0.3} rx="6" fill="var(--window)" stroke="var(--line)" stroke-width="5" />
      <rect x={sw * 0.6} y={sh * 0.52} width={sw * 0.26} height={sh * 0.48} rx="6" fill="var(--cardboard)" stroke="var(--line)" stroke-width="5" />
    </g>
  {/each}
  <!-- lamp post -->
  <g transform="translate({lamp} {ground})">
    {#if night}
      <!-- lit at night: a pool of light under the lamp -->
      <path d="M32 -186 L110 0 H-46 Z" fill="var(--lamp)" opacity="0.16" />
      <ellipse cx="32" cy="0" rx="92" ry="14" fill="var(--lamp)" opacity="0.22" />
      <circle cx="40" cy="-192" r="30" fill="var(--lamp)" opacity="0.25" />
    {/if}
    <path d="M0 0 V-170 Q0 -202 34 -202" fill="none" stroke="var(--line)" stroke-width="9" stroke-linecap="round" />
    <path d="M22 -202 H58 L50 -184 H30 Z" fill="var(--lamp)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
    <ellipse cx="0" cy="0" rx="18" ry="7" fill="var(--shade)" opacity="0.3" />
  </g>
  <!-- pavement, kerb and road -->
  <rect x="-40" y={ground} width={w + 80} height="34" fill="var(--flap)" stroke="var(--line)" stroke-width="6" />
  <rect x="-40" y={ground + 34} width={w + 80} height="220" fill="var(--road)" stroke="var(--line)" stroke-width="6" />
  <path d={`M-40 ${ground + 104} H${w + 40}`} stroke="var(--paper)" stroke-width="8" stroke-dasharray="46 38" opacity="0.8" />
  <!-- a little car pootling along, bonnet first -->
  <g transform="translate({car} {ground + 132})">
    {#if night}<path d="M62 -22 L190 -46 V10 Z" fill="var(--lamp)" opacity="0.22" />{/if}
    <path d="M-60 0 V-26 Q-60 -34 -50 -34 H-44 L-28 -58 H16 L34 -34 H56 Q64 -34 64 -24 V0 Z" fill="var(--teal)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
    <path d="M-22 -50 H10 L22 -34 H-32 Z" fill="var(--paper)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
    <circle cx="-34" cy="2" r="13" fill="var(--line)" /><circle cx="38" cy="2" r="13" fill="var(--line)" />
  </g>
</Depth>
