<svelte:options namespace="svg" />
<script lang="ts">
  import { Text } from '$core/api';

  type Row = { label: string; value: string; hot?: boolean };
  let {
    x,
    y,
    scale = 1,
    kind = 'radio',
    rows = [],
    title = '',
    note = '',
    walking = false,
    time = 0,
    open = false,
  }: {
    x: number;
    y: number;
    scale?: number;
    kind?: 'radio' | 'cable';
    rows?: Row[];
    title?: string;
    note?: string;
    walking?: boolean;
    time?: number;
    open?: boolean;
  } = $props();
  const fill = $derived(kind === 'radio' ? '#ffcf5d' : '#72b8a5');
  const stripe = $derived(kind === 'radio' ? '#bd6b87' : '#f28f5b');
  const step = $derived(walking ? Math.sin(time * 14) * 7 : 0);
  const width = 280;
  const longRows = $derived(rows.some((row) => row.value.length > 13));
  const bodyH = $derived(rows.length > 2 ? (longRows ? 188 : 150) : 126);
  const font = $derived(rows.length > 2 ? (longRows ? 16 : 21) : 22);
  const rowGap = $derived(rows.length > 2 ? (longRows ? 42 : 30) : 36);
</script>

<g transform="translate({x} {y}) scale({scale})">
  {#if walking}
    <ellipse cx={0} cy="72" rx="72" ry="14" fill="#6b3f2a" opacity="0.14" />
    <g stroke="#6b3f2a" stroke-width="7" stroke-linecap="round">
      <path d="M-26 58 L{-34 + step} 76" />
      <path d="M26 58 L{34 - step} 76" />
    </g>
  {/if}
  <rect x={-width / 2} y={-bodyH / 2} width={width} height={bodyH} rx="18" fill={fill} stroke="#6b3f2a" stroke-width="6" />
  <path d={open ? `M${-width / 2 + 8} ${-bodyH / 2 + 8} L0 ${-bodyH / 2 - 46} L${width / 2 - 8} ${-bodyH / 2 + 8}` : `M${-width / 2 + 8} ${-bodyH / 2 + 8} L0 ${-bodyH / 2 + 58} L${width / 2 - 8} ${-bodyH / 2 + 8}`} fill="#f5d9a3" stroke="#6b3f2a" stroke-width="4" stroke-linejoin="round" opacity="0.86" />
  <path d={`M${-width / 2 + 10} ${bodyH / 2 - 10} L-14 8 M${width / 2 - 10} ${bodyH / 2 - 10} L14 8`} fill="none" stroke="#6b3f2a" stroke-width="3.5" opacity="0.6" />
  <path d={`M${-width / 2 + 16} ${-bodyH / 2 + 34} H${width / 2 - 16}`} stroke={stripe} stroke-width="8" stroke-linecap="round" opacity="0.82" />
  {#if rows.length}
    <rect x={-width / 2 + 18} y={-bodyH / 2 + 50} width={width - 36} height={bodyH - 66} rx="12" fill="#fff7df" opacity="0.93" />
  {/if}
  {#if title}
    <Text x={0} y={-bodyH / 2 + 29} text={title} size={22} kind="big" colour="#6b3f2a" />
  {/if}
  {#each rows as row, i}
    {@const yy = -bodyH / 2 + 64 + i * rowGap}
    {#if longRows}
      <Text x={-82} y={yy - font * 0.05} text={row.label} size={font * 0.78} kind="small" anchor="start" />
      <Text x={-82} y={yy + font * 0.98} text={row.value} size={font * 0.66} kind="node" anchor="start" />
    {:else}
      <text x="-98" y={yy + font * 0.35} font-family="var(--label-font)" font-size={font * 0.9} font-weight="800" fill="#6b3f2a">{row.label}</text>
      <text x="-6" y={yy + font * 0.35} font-family="var(--label-font)" font-size={font * 0.9} font-weight={row.hot ? 900 : 800} fill="#6b3f2a">{row.value}</text>
    {/if}
  {/each}
  {#if note}
    <Text x={0} y={bodyH / 2 + 30} text={note} size={22} kind="big" colour="#a65435" />
  {/if}
</g>
