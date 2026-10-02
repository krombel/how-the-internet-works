<svelte:options namespace="svg" />
<script lang="ts">
  // 2010 (the era flavour): a second antenna on the DSL router, a slider phone on the sofa, a star sticker on the
  // laptop, and a buffering wheel on its screen while the video starts.
  import { Depth, type EraPropsProps } from '$core/api';
  let { layer, spots, devices, age, time, still }: EraPropsProps = $props();
  /** A point of a device's 200×200 art box, in the scene. */
  const on = (d: { x: number; y: number; size: number }, bx: number, by: number) => ({ x: d.x + ((bx - 100) * d.size) / 200, y: d.y + ((by - 100) * d.size) / 200 });
  // the video starts in a few seconds; the wheel's dots go round, one step at a time
  const loading = $derived(age < 5);
  const step = $derived(Math.floor(time * 10) % 8);
</script>

{#if layer === 'back'}
  {#if devices.router}
    <!-- the router's second antenna, behind its body (the first is the router's own) -->
    {@const d = devices.router}
    {@const a = on(d, 148, 91)}
    {@const b = on(d, 164, 38)}
    <path d="M{a.x} {a.y} L{b.x} {b.y}" stroke="var(--line)" stroke-width={(7 * d.size) / 200} stroke-linecap="round" />
  {/if}
  {#if spots.sofa}
    {@const [x, y, w, h] = spots.sofa}
    {@const s = Math.min(w, h / 0.52)}
    {@const floor = y + h / 2}
    <Depth d={1.03}>
      <!-- a little sofa, and a slider phone left on its seat, slid open -->
      <g stroke="var(--line)" stroke-width={s * 0.04} stroke-linejoin="round" stroke-linecap="round">
        <path d="M{x - s * 0.4} {floor} v{-s * 0.06} M{x + s * 0.4} {floor} v{-s * 0.06}" fill="none" />
        <rect x={x - s * 0.4} y={floor - s * 0.5} width={s * 0.8} height={s * 0.3} rx={s * 0.08} fill="var(--teal)" />
        <rect x={x - s * 0.42} y={floor - s * 0.26} width={s * 0.84} height={s * 0.2} rx={s * 0.06} fill="var(--teal-deep)" />
        <rect x={x - s * 0.5} y={floor - s * 0.36} width={s * 0.14} height={s * 0.3} rx={s * 0.06} fill="var(--teal)" />
        <rect x={x + s * 0.36} y={floor - s * 0.36} width={s * 0.14} height={s * 0.3} rx={s * 0.06} fill="var(--teal)" />
        <g transform="translate({x + s * 0.08} {floor - s * 0.3}) rotate(-12)" stroke-width={s * 0.025}>
          <rect x={-s * 0.08} y={-s * 0.06} width={s * 0.16} height={s * 0.09} rx={s * 0.02} fill="var(--stone)" />
          <rect x={-s * 0.1} y={-s * 0.12} width={s * 0.16} height={s * 0.08} rx={s * 0.02} fill="var(--paper-2)" />
          <rect x={-s * 0.07} y={-s * 0.105} width={s * 0.1} height={s * 0.05} rx={s * 0.01} fill="var(--glass)" stroke="none" />
        </g>
      </g>
    </Depth>
  {/if}
{:else if devices.laptop}
  {@const d = devices.laptop}
  {@const k = d.size / 200}
  <!-- a star sticker on the laptop's palm rest -->
  {@const c = on(d, 158, 155)}
  {@const r = 9 * k}
  <path d={Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; return `${i ? 'L' : 'M'}${c.x + Math.cos(a) * q} ${c.y + Math.sin(a) * q}`; }).join(' ') + 'Z'}
    fill="var(--sun)" stroke="var(--line)" stroke-width={r * 0.25} stroke-linejoin="round" />
  {#if loading}
    <!-- a buffering wheel in the screen's corner, beside the face: eight dots, the darkest going round -->
    {@const w = on(d, 136, 59)}
    {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
      <circle cx={w.x + Math.cos((i * Math.PI) / 4) * 8 * k} cy={w.y + Math.sin((i * Math.PI) / 4) * 8 * k} r={2.4 * k} fill="var(--line)"
        opacity={still ? 0.3 + i * 0.1 : 0.2 + (((i - step + 8) % 8) / 7) * 0.8} />
    {/each}
  {/if}
{/if}
