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
    blank = false,
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
    /** Rows as blank lines, not words (a phone on its side has no room for words this small). */
    blank?: boolean;
  } = $props();
  const fill = $derived(kind === 'radio' ? 'var(--sun)' : 'var(--teal)');
  const stripe = $derived(kind === 'radio' ? 'var(--berry)' : 'var(--orange)');
  const step = $derived(walking ? Math.sin(time * 14) * 7 : 0);
  const width = 280;
  const longRows = $derived(rows.some((row) => row.value.length > 13));
  const bodyH = $derived(rows.length > 2 ? (longRows ? 188 : 150) : 126);
  const font = $derived(rows.length > 2 ? (longRows ? 16 : 21) : 22);
  const rowGap = $derived(rows.length > 2 ? (longRows ? 42 : 30) : 36);
</script>

<g transform="translate({x} {y}) scale({scale})">
  {#if walking}
    <ellipse cx={0} cy="72" rx="72" ry="14" fill="var(--shade)" opacity="0.14" />
    <g stroke="var(--line)" stroke-width="7" stroke-linecap="round">
      <path d="M-26 58 L{-34 + step} 76" />
      <path d="M26 58 L{34 - step} 76" />
    </g>
  {/if}
  <rect x={-width / 2} y={-bodyH / 2} width={width} height={bodyH} rx="18" fill={fill} stroke="var(--line)" stroke-width="6" />
  <path d={open ? `M${-width / 2 + 8} ${-bodyH / 2 + 8} L0 ${-bodyH / 2 - 46} L${width / 2 - 8} ${-bodyH / 2 + 8}` : `M${-width / 2 + 8} ${-bodyH / 2 + 8} L0 ${-bodyH / 2 + 58} L${width / 2 - 8} ${-bodyH / 2 + 8}`} fill="var(--kraft)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" opacity="0.86" />
  <path d={`M${-width / 2 + 10} ${bodyH / 2 - 10} L-14 8 M${width / 2 - 10} ${bodyH / 2 - 10} L14 8`} fill="none" stroke="var(--line)" stroke-width="3.5" opacity="0.6" />
  <path d={`M${-width / 2 + 16} ${-bodyH / 2 + 34} H${width / 2 - 16}`} stroke={stripe} stroke-width="8" stroke-linecap="round" opacity="0.82" />
  {#if rows.length}
    <rect x={-width / 2 + 18} y={-bodyH / 2 + 50} width={width - 36} height={bodyH - 66} rx="12" fill="var(--paper)" opacity="0.93" />
  {/if}
  {#if title}
    <Text x={0} y={-bodyH / 2 + 29} text={title} size={22} kind="big" colour="var(--line)" />
  {/if}
  {#each rows as row, i}
    {@const yy = -bodyH / 2 + 64 + i * rowGap}
    {#if blank}
      <rect x="-98" y={yy - font * 0.25} width="62" height={font * 0.5} rx={font * 0.25} fill="var(--line)" opacity="0.3" />
      <rect x="-6" y={yy - font * 0.25} width={row.hot ? 104 : 88} height={font * 0.5} rx={font * 0.25} fill="var(--line)" opacity={row.hot ? 0.75 : 0.3} />
    {:else if longRows}
      <Text x={-82} y={yy - font * 0.05} text={row.label} size={font * 0.78} kind="small" anchor="start" />
      <Text x={-82} y={yy + font * 0.98} text={row.value} size={font * 0.66} kind="node" anchor="start" />
    {:else}
      <text x="-98" y={yy + font * 0.35} font-family="var(--label-font)" font-size={font * 0.9} font-weight="800" fill="var(--line)">{row.label}</text>
      <text x="-6" y={yy + font * 0.35} font-family="var(--label-font)" font-size={font * 0.9} font-weight={row.hot ? 900 : 800} fill="var(--line)">{row.value}</text>
    {/if}
  {/each}
  {#if note}
    <Text x={0} y={bodyH / 2 + 30} text={note} size={22} kind="big" colour="var(--brick)" />
  {/if}
</g>
