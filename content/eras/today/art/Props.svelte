<svelte:options namespace="svg" />
<script lang="ts">
  // Today (the era flavour): a smart speaker on a wall shelf (a plain cylinder with a light ring), and grey bars on
  // the phone's screen for the moment the video takes to start.
  import { Depth, type EraPropsProps } from '$core/api';
  let { layer, spots, devices, age, time, still }: EraPropsProps = $props();
  const loading = $derived(age < 2);
  // a shimmer sweeps down the bars (they stand still with reduced motion)
  const sweep = $derived(still ? -1 : (time * 1.6) % 1.6 - 0.3);
</script>

{#if layer === 'back'}
  {#if spots.shelf}
    {@const [x, y, w, h] = spots.shelf}
    {@const s = Math.min(w / 0.8, h / 0.66)}
    {@const plank = y + h / 2 - s * 0.14}
    <Depth d={1.03}>
      <g stroke="var(--line)" stroke-width={s * 0.03} stroke-linejoin="round">
        <!-- a shelf on two brackets -->
        <path d="M{x - s * 0.26} {plank} v{s * 0.12} l{s * 0.09} {-s * 0.09} M{x + s * 0.26} {plank} v{s * 0.12} l{-s * 0.09} {-s * 0.09}" fill="none" />
        <rect x={x - s * 0.4} y={plank - s * 0.05} width={s * 0.8} height={s * 0.05} rx={s * 0.02} fill="var(--cardboard)" />
        <!-- the speaker: a cylinder with a ring of light round its top -->
        <path d="M{x - s * 0.18} {plank - s * 0.06} V{plank - s * 0.46} H{x + s * 0.18} V{plank - s * 0.06} Z" fill="var(--stone)" />
        <ellipse cx={x} cy={plank - s * 0.06} rx={s * 0.18} ry={s * 0.04} fill="var(--stone)" />
        <ellipse cx={x} cy={plank - s * 0.46} rx={s * 0.18} ry={s * 0.045} fill="var(--teal)" />
        <ellipse cx={x} cy={plank - s * 0.46} rx={s * 0.1} ry={s * 0.022} fill="var(--stone)" stroke="none" />
      </g>
    </Depth>
  {/if}
{:else if devices.phone && loading}
  <!-- a skeleton loader on the phone's screen, above its face: grey bars where the video's title will be -->
  {@const d = devices.phone}
  {@const k = d.size / 200}
  {@const x0 = d.x - 22 * k}
  {#each [[72, 44], [83, 34], [94, 24]] as [by, bw], i (i)}
    <rect x={x0} y={d.y + (by - 100) * k - 3.5 * k} width={bw * k} height={7 * k} rx={3.5 * k}
      fill={Math.abs(sweep - i * 0.3) < 0.25 ? 'var(--paper)' : 'var(--stone)'} />
  {/each}
{/if}
