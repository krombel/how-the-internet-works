<svelte:options namespace="svg" />
<script lang="ts">
  // Doors in the storybook look. Each verb has its own mark and shape: look inside = a teal magnifier in a round lens,
  // open up = an orange lens with a door swinging open, change = a berry square with arrows going
  // round, in the colours of the caption's lit door chips (--door-*, the mark and label --btn-on-ink: ≥ 4.5:1 in both
  // modes, model/contrast.test.ts). Things that open "breathe" at rest (a dashed, glowing ring round a group, a pulsing
  // ring round a magnifier), and glow when pointed at or lit by "What can I explore?".
  import type { HintProps } from '$core/api';
  let { kind, part, x, y, label, labelW, labelled, size, hot, target, time }: HintProps = $props();
  const INK = 'var(--line)', MARK = 'var(--btn-on-ink)';
  // the badge is drawn at one size, U, and scaled to `size` as a whole: a zoom then moves one transform a frame
  // rather than every radius, stroke and font size in it
  const U = 22;
  const R = U * 1.1;
  const fill = $derived(kind === 'dive' ? 'var(--door-dive)' : kind === 'swap' ? 'var(--door-catch)' : 'var(--door-open)');
  const breathe = $derived(0.5 + 0.5 * Math.sin(time * 2.2));
  const bob = $derived(Math.sin(time * 2.1 + (kind === 'dive' ? 0 : 1)) * size * 0.18);
  const pulse = $derived((time / 1.8) % 1);
  const tw = $derived(labelled ? (labelW * U) / size : 0);
  /** The pill is centred on (x, y) with the mark at its start and the label after it. */
  const pw = $derived(labelled ? R * 2 + tw + U * 0.9 : R * 2);
  const x0 = $derived(kind === 'expand' ? -pw / 2 : -R);
  const mx = $derived(x0 + R);
  const node = $derived('d' in target ? null : target);
</script>

{#if part === 'glow'}
  {#if !node}
    {#if hot}<path d={'d' in target ? target.d : ''} fill="none" stroke="var(--sun)" stroke-width={size * 1.8} stroke-linecap="round" opacity=".6" pointer-events="none" />{/if}
  {:else if kind === 'expand' || hot}
    <!-- a warm glow with a dashed ring round the thing that opens, breathing slowly; brighter when pointed at -->
    <g transform="translate({node.x} {node.y + node.size * 0.05})" pointer-events="none">
      <ellipse rx={node.size * (0.42 + 0.02 * breathe)} ry={node.size * (0.36 + 0.02 * breathe)} fill="var(--glow)" opacity={hot ? 0.75 : 0.25 + 0.2 * breathe} />
      <ellipse rx={node.size * (0.42 + 0.02 * breathe)} ry={node.size * (0.36 + 0.02 * breathe)} fill="none" stroke={fill}
        stroke-width={size * 0.22} stroke-dasharray="{size * 0.7} {size * 0.55}" stroke-linecap="round" opacity={hot ? 0.95 : 0.35 + 0.35 * breathe} />
    </g>
  {/if}
{:else}
  <g class="hint" transform="translate({x} {y + bob}) scale({(size / U) * (hot ? 1.12 : 1)})" pointer-events="none">
    {#if kind === 'dive' && !hot}<circle cx={mx} r={R + R * 0.75 * pulse} fill="none" stroke="var(--glow)" stroke-width={U * 0.22} opacity={0.6 * (1 - pulse)} />{/if}
    {#if hot}<rect class="hint-hot" x={x0 - U * 0.35} y={-R - U * 0.35} width={pw + U * 0.7} height={R * 2 + U * 0.7} rx={R + U * 0.35} fill="var(--sun)" opacity=".75" />{/if}
    {#if labelled}
      <rect x={x0} y={-R + U * 0.2} width={pw} height={R * 2} rx={R} fill={INK} opacity=".18" />
      <rect class="hint-badge" x={x0} y={-R} width={pw} height={R * 2} rx={R} {fill} stroke={INK} stroke-width={U * 0.22} />
      <text class="hint-label" x={mx + R + U * 0.25 + tw / 2} y={U * 0.05} font-size={U} text-anchor="middle" dominant-baseline="central">{label}</text>
    {:else if kind === 'swap'}
      <rect class="hint-badge" x={-R} y={-R} width={R * 2} height={R * 2} rx={R * 0.38} {fill} stroke={INK} stroke-width={U * 0.22} />
    {:else}
      <circle class="hint-badge" r={R} {fill} stroke={INK} stroke-width={U * 0.22} />
    {/if}
    <g class="hint-mark" transform="translate({mx} 0) scale({R / 24})" fill="none" stroke={MARK} stroke-linecap="round" stroke-linejoin="round">
      {#if kind === 'dive'}
        <circle cx="-4" cy="-5" r="8" stroke-width="4" />
        <path d="M3 3 L11 11" stroke-width="5" />
      {:else if kind === 'swap'}
        <!-- two arrows going round: "change where you are / what you do" -->
        <path d="M-11 -2 A11 11 0 0 1 8 -8 M11 2 A11 11 0 0 1 -8 8" stroke-width="4" />
        <path d="M3 -13 L9 -8 L3 -3 M-3 13 L-9 8 L-3 3" stroke-width="3.5" />
      {:else}
        <!-- a door swinging open: "there's more inside" -->
        <path d="M-9 13 V-12 H9 V13" stroke-width="3.5" />
        <path class="hint-leaf" d="M-9 -12 L3 -8 V16 L-9 13 Z" fill={MARK} stroke-width="3" />
        <circle class="hint-knob" cx="0" cy="3" r="1.6" fill={fill} stroke="none" />
      {/if}
    </g>
  </g>
{/if}

<style>
  .hint-label { fill: var(--btn-on-ink); font-family: var(--label-font); font-weight: 800; }
  /* forced colours (a contrast theme): the doors in the system's link colours, like the caption's door chips */
  @media (forced-colors: active) {
    .hint-badge, .hint-knob { fill: Canvas; stroke: LinkText; }
    .hint-mark { stroke: LinkText; }
    .hint-leaf, .hint-label { fill: LinkText; }
    .hint-hot { fill: Highlight; }
  }
</style>
