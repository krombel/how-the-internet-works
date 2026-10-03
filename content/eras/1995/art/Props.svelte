<svelte:options namespace="svg" />
<script lang="ts">
  // 1995 (the era flavour): a soft glow round the PC's CRT, a wall calendar, a mouse on its pad, an external modem
  // whose lights blink while parcels are on the line, the phone socket on the wall, and an hourglass on the screen while
  // the page loads. The modem and the socket sit on the phone line (issue 137): drawn over it, at the depth of the line.
  import { Depth, Text, type EraPropsProps } from '$core/api';
  let { layer, spots, devices, traffic, age, time, still }: EraPropsProps = $props();
  const pc = $derived(devices.pc);
  /** A point of the PC's 200×200 art box, in the scene. */
  const onPc = (bx: number, by: number) => ({ x: pc.x + ((bx - 100) * pc.size) / 200, y: pc.y + ((by - 100) * pc.size) / 200 });
  /** A spot's centre, its bottom edge and the unit `s` that fits a prop `wide`·s by `tall`·s into it. */
  const fit = ([x, y, w, h]: [number, number, number, number], wide: number, tall: number) => ({ x, y, bottom: y + h / 2, s: Math.min(w / wide, h / tall) });
  // the modem's send and receive lights flicker with the data (lit, still, with reduced motion)
  const flicker = $derived(still || time % 0.25 < 0.16);
  const sd = $derived(still || (traffic.up && flicker)), rd = $derived(still || (traffic.down && flicker));
  // the page takes about 15 s; the hourglass turns over every 2 s
  const loading = $derived(age < 15);
  const turn = $derived((Math.floor(time / 2) + Math.min(1, (time % 2) / 0.4)) * 180);
</script>

{#if layer === 'front'}
  {#if spots.modem}
    {@const { x, bottom, s } = fit(spots.modem, 1, 0.52)}
    {@const shelf = bottom - s * 0.2}
    <!-- an external modem on a little wall shelf, with its lights: power, send, receive -->
    <g stroke="var(--line)" stroke-linejoin="round" stroke-width={s * 0.04}>
      <path d="M{x - s * 0.38} {shelf + s * 0.08} l{s * 0.1} {s * 0.12} M{x + s * 0.38} {shelf + s * 0.08} l{-s * 0.1} {s * 0.12}" fill="none" />
      <rect x={x - s * 0.5} y={shelf} width={s} height={s * 0.08} rx={s * 0.03} fill="var(--cardboard)" />
      <path d="M{x - s * 0.42} {shelf} L{x - s * 0.36} {shelf - s * 0.3} H{x + s * 0.36} L{x + s * 0.42} {shelf} Z" fill="var(--tan-pale)" />
      {#each [true, sd, rd] as lit, i (i)}
        <circle cx={x - s * 0.18 + i * s * 0.18} cy={shelf - s * 0.13} r={s * 0.055} fill={lit ? 'var(--sun)' : 'var(--stone)'} stroke-width={s * 0.025} />
      {/each}
    </g>
  {/if}
  {#if spots.socket}
    {@const [x, y, w, h] = spots.socket}
    <!-- the phone socket on the wall: a plate with its two holes, the line going in -->
    <g stroke="var(--line)" stroke-linejoin="round" stroke-width={w * 0.14}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={w * 0.2} fill="var(--paper-white)" />
      <path d="M{x - w * 0.18} {y - h * 0.12} v{h * 0.24} M{x + w * 0.18} {y - h * 0.12} v{h * 0.24}" stroke-linecap="round" />
    </g>
  {/if}
  {#if pc && loading}
    <!-- the hourglass, on the screen beside the PC's face, turning over -->
    {@const c = onPc(132, 78)}
    {@const r = (13 * pc.size) / 200}
    <g transform="translate({c.x} {c.y}) rotate({turn})" stroke="var(--line)" stroke-width={r * 0.2} stroke-linejoin="round" stroke-linecap="round">
      <path d="M{-r * 0.6} {-r} H{r * 0.6} M{-r * 0.6} {r} H{r * 0.6}" fill="none" />
      <path d="M{-r * 0.45} {-r} C{-r * 0.45} {-r * 0.3} {-r * 0.1} {-r * 0.15} 0 0 C{r * 0.1} {-r * 0.15} {r * 0.45} {-r * 0.3} {r * 0.45} {-r} Z" fill="var(--paper)" />
      <path d="M{-r * 0.45} {r} C{-r * 0.45} {r * 0.3} {-r * 0.1} {r * 0.15} 0 0 C{r * 0.1} {r * 0.15} {r * 0.45} {r * 0.3} {r * 0.45} {r} Z" fill="var(--sand)" />
    </g>
  {/if}
{:else}
  {#if pc}
    <!-- the CRT's glow: a few soft layers round the monitor, behind it -->
    {@const k = pc.size / 200}
    {@const c = onPc(100, 61)}
    {#each [26, 16, 8] as grow, i (grow)}
      <rect x={c.x - (60 + grow) * k} y={c.y - (49 + grow) * k} width={(120 + 2 * grow) * k} height={(98 + 2 * grow) * k} rx={(16 + grow) * k}
        fill="var(--glow)" opacity={0.18 + i * 0.1} />
    {/each}
  {/if}
  <Depth d={1.03}>
    {#if spots.wall}
      {@const { x, y, s } = fit(spots.wall, 0.84, 1)}
      {@const top = y - s * 0.4}
      <!-- a wall calendar on a nail: a red top with the year, a grid of days -->
      <g stroke="var(--line)" stroke-linejoin="round" stroke-width={s * 0.04}>
        <path d="M{x} {y - s * 0.5} L{x - s * 0.2} {top} M{x} {y - s * 0.5} L{x + s * 0.2} {top}" stroke-width={s * 0.025} fill="none" />
        <rect x={x - s * 0.4} y={top} width={s * 0.8} height={s * 0.88} rx={s * 0.05} fill="var(--paper-white)" />
        <rect x={x - s * 0.4} y={top} width={s * 0.8} height={s * 0.4} rx={s * 0.05} fill="var(--roof)" />
      </g>
      {#each [0, 1, 2, 3] as row (row)}
        {#each [0, 1, 2, 3, 4, 5] as col (col)}
          <rect x={x - s * 0.31 + col * s * 0.106} y={y + s * 0.09 + row * s * 0.08} width={s * 0.07} height={s * 0.045} fill="var(--stone)" />
        {/each}
      {/each}
      <Text {x} y={y - s * 0.09} text="1995" size={s * 0.27} kind="small" />
    {/if}
    {#if spots.desk}
      {@const { x, bottom, s } = fit(spots.desk, 1, 0.46)}
      <!-- a mouse on its pad, its cable running back to the computer -->
      <g stroke="var(--line)" stroke-linejoin="round" stroke-linecap="round" stroke-width={s * 0.04}>
        <path d="M{x - s * 0.05} {bottom - s * 0.36} q{-s * 0.1} {-s * 0.12} {-s * 0.45} {-s * 0.08}" fill="none" />
        <rect x={x - s * 0.48} y={bottom - s * 0.1} width={s * 0.96} height={s * 0.1} rx={s * 0.04} fill="var(--teal)" />
        <path d="M{x - s * 0.18} {bottom - s * 0.1} q0 {-s * 0.26} {s * 0.18} {-s * 0.26} q{s * 0.18} 0 {s * 0.18} {s * 0.26} Z" fill="var(--paper-white)" />
        <path d="M{x} {bottom - s * 0.36} v{s * 0.12}" stroke-width={s * 0.03} />
      </g>
    {/if}
  </Depth>
{/if}
