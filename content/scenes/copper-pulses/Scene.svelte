<svelte:options namespace="svg" />
<script lang="ts">
  import { Node, Text, legibleSize, nameOf, strings, view, type LinkSubject } from '$core/api';
  import { COPPER, EYE_PATHS, PAM_LABELS, WIRE_PATHS, copperSparks, pamPath, squareWavePath, toScene, trackMatrix } from './copper';
  import Cable from './art/Cable.svelte';
  import Card from './art/Card.svelte';

  let { subject }: { subject: LinkSubject } = $props();
  const S = strings('scene.copper-pulses');
  const legible = legibleSize();
  const nerd = $derived(S('mode') === 'nerd');
  const o = $derived(view.orient);
  const portrait = $derived(o === 'portrait');
  const compact = $derived(o === 'landscape' && view.vp.h < 470);
  // on a phone on its side the words never get smaller than the theme's label minimum (issue #33)
  const fs = (size: number) => (compact ? legible(size) : size);
  const sparks = $derived(copperSparks(view.time, view.still, nerd));
  const fromHop = $derived(subject.route.hops[subject.link.from]);
  const toHop = $derived(subject.route.hops[subject.link.to]);
  const fromNode = $derived(fromHop.node.id);
  const toNode = $derived(toHop.node.id);
  const trackShift = $derived(portrait || compact ? 0 : 110);
  const trackTransform = $derived(portrait ? trackMatrix(o) : `translate(0 ${trackShift})`);
  const fromPos = $derived(toScene({ x: COPPER.fromX, y: COPPER.nodeY + trackShift }, o));
  const toPos = $derived(toScene({ x: COPPER.toX, y: COPPER.nodeY + trackShift }, o));
  const L = $derived.by(() => {
    if (portrait) return {
      node: { size: 170, fromLabel: { x: 205, y: 1570 }, toLabel: { x: 205, y: 280 } },
      twist: { x: 330, y: 150, w: 540, h: 350 },
      kid: { x: 330, y: 600, w: 540, h: 350 },
      pam: { x: 330, y: 515, w: 540, h: 390 },
      eye: { x: 330, y: 940, w: 540, h: 430 },
      title: { x: 610, y: 100 }, cableLabel: { x: 610, y: 1390 }, text: { title: 40, head: 34, body: 36, small: 36, tick: 32 },
    };
    // a phone on its side: no title (the bar and the caption say it), the names in one row under the cable, fewer
    // and bigger words on the cards
    if (compact) return {
      node: { size: 170, fromLabel: { x: 30, y: 400 }, toLabel: { x: 1570, y: 400 } },
      twist: { x: nerd ? 70 : 150, y: nerd ? 470 : 440, w: nerd ? 460 : 620, h: nerd ? 300 : 420 }, kid: { x: 830, y: 440, w: 620, h: 420 }, pam: { x: 570, y: 470, w: 460, h: 300 }, eye: { x: 1070, y: 470, w: 460, h: 300 },
      title: { x: 800, y: 90 }, cableLabel: { x: 800, y: 400 }, text: { title: 38, head: 44, body: 44, small: 42, tick: 42 },
    };
    return {
      node: { size: 220, fromLabel: { x: fromPos.x + 60, y: fromPos.y + 145 }, toLabel: { x: toPos.x - 40, y: toPos.y + 145 } },
      twist: { x: nerd ? 70 : 220, y: 505, w: nerd ? 450 : 520, h: 315 },
      kid: { x: 860, y: 505, w: 520, h: 315 },
      pam: { x: 575, y: 505, w: 450, h: 315 },
      eye: { x: 1080, y: 505, w: 450, h: 315 },
      title: { x: 800, y: 130 }, cableLabel: { x: 800, y: 466 }, text: { title: 42, head: 30, body: 24, small: 22, tick: 22 },
    };
  });
  const twistScale = $derived(portrait ? 1.12 : nerd ? 1.05 : 1.22);
  const pulseD = $derived(squareWavePath(L.kid.x + 76, L.kid.y + (portrait ? 112 : 96), L.kid.w - 152, portrait ? 78 : 62, [1, 0, 1, 1, 0, 0, 1, 0]));
  const pamD = $derived(pamPath(L.pam.x + 96, L.pam.y + (portrait ? 104 : 92), L.pam.w - 148, portrait ? 168 : 102));
  const eyeD = (pts: { x: number; y: number }[], x: number, y: number, w: number, h: number) => 'M' + pts.map((p) => `${(x + p.x * w).toFixed(1)},${(y + p.y * h).toFixed(1)}`).join(' ');
</script>

{#if !portrait && !compact}<text x={L.title.x} y={L.title.y} text-anchor="middle" font-family="var(--label-font)" font-size={L.text.title} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="7" paint-order="stroke">{S('title')}</text>{/if}
<g transform={trackTransform}>
  <Cable paths={WIRE_PATHS} {sparks} {nerd} />
</g>
<Node id={fromNode} x={fromPos.x} y={fromPos.y} size={L.node.size} focused />
<Node id={toNode} x={toPos.x} y={toPos.y} size={L.node.size} />
{#if portrait}
  <text x={L.node.toLabel.x} y={L.node.toLabel.y} text-anchor="middle" font-family="var(--label-font)" font-size="30" font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{nameOf(toHop)}</text>
  <text x={L.node.fromLabel.x} y={L.node.fromLabel.y} text-anchor="middle" font-family="var(--label-font)" font-size="30" font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{nameOf(fromHop)}</text>
{:else if compact}
  <Text x={L.node.fromLabel.x} y={L.node.fromLabel.y} text={nameOf(fromHop)} size={L.text.small} kind="node" anchor="start" />
  <Text x={L.node.toLabel.x} y={L.node.toLabel.y} text={nameOf(toHop)} size={L.text.small} kind="node" anchor="end" />
{:else}
  <Text x={L.node.fromLabel.x} y={L.node.fromLabel.y} text={nameOf(fromHop)} size={25} kind="node" />
  <Text x={L.node.toLabel.x} y={L.node.toLabel.y} text={nameOf(toHop)} size={25} kind="node" />
{/if}
{#if !portrait}
  <text x={L.cableLabel.x} y={L.cableLabel.y} text-anchor="middle" font-family="var(--label-font)" font-size={fs(compact ? L.text.small : 26)} font-weight="900" fill={subject.link.tech.colour}>{S(compact ? 'pairsShort' : 'pairs')}</text>
  {#if !compact}<text x={L.cableLabel.x} y={L.cableLabel.y + 34} text-anchor="middle" font-family="var(--label-font)" font-size="24" font-weight="900" fill="var(--line)">{S('bothWays')}</text>{/if}
{/if}

<Card x={L.twist.x} y={L.twist.y} w={L.twist.w} h={L.twist.h} tint="var(--teal)" />
<text x={L.twist.x + L.twist.w / 2} y={L.twist.y + 42} text-anchor="middle" font-family="var(--label-font)" font-size={fs(L.text.head)} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{S('twistTitle')}</text>
<g transform={`translate(${L.twist.x + (portrait ? 54 : nerd ? 42 : 60)} ${L.twist.y + (portrait ? 92 : 88)}) scale(${twistScale})`}>
  <path d="M0 46 C55 0 115 92 170 46 S285 0 340 46" fill="none" stroke="var(--line)" stroke-width="18" stroke-linecap="round" opacity="0.24" />
  <path d="M0 46 C55 0 115 92 170 46 S285 0 340 46" fill="none" stroke="var(--orange)" stroke-width="12" stroke-linecap="round" />
  <path d="M0 46 C55 92 115 0 170 46 S285 92 340 46" fill="none" stroke="var(--paper)" stroke-width="15" stroke-linecap="round" />
  <path d="M0 46 C55 92 115 0 170 46 S285 92 340 46" fill="none" stroke="var(--orange)" stroke-width="7" stroke-linecap="round" stroke-dasharray="18 18" />
  <circle cx="78" cy="14" r="22" fill="var(--paper)" stroke="var(--line)" stroke-width="4" />
  <path d="M70 14 H86 M78 6 V22" stroke="var(--line)" stroke-width="4.5" stroke-linecap="round" />
  <circle cx="78" cy="78" r="22" fill="var(--paper)" stroke="var(--line)" stroke-width="4" />
  <path d="M70 78 H86" stroke="var(--line)" stroke-width="4.5" stroke-linecap="round" />
  <path d="M254 -10 l18 28 l-15 -4 l13 38 l-34 -48 l17 6 Z" fill="var(--sun)" stroke="var(--line)" stroke-width="4" />
</g>
{#if !(compact && nerd)}<text x={L.twist.x + 34} y={L.twist.y + L.twist.h - 40} font-family="var(--label-font)" font-size={fs(L.text.body)} font-weight="800" fill="var(--line)">{S(nerd ? 'twistLineNerd' : 'twistLine')}</text>{/if}

{#if nerd}
  {@const P = L.pam}
  <Card x={P.x} y={P.y} w={P.w} h={P.h} tint="var(--blue)" />
  <text x={P.x + P.w / 2} y={P.y + 42} text-anchor="middle" font-family="var(--label-font)" font-size={fs(L.text.head)} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{S('pamTitle')}</text>
  <g>
    {#each PAM_LABELS as label, i}
      {@const yy = P.y + (portrait ? 104 : 92) + ((portrait ? 168 : 102) * i) / 4}
      <path d={`M${P.x + 92} ${yy} H${P.x + P.w - 42}`} stroke="var(--line)" stroke-width="2" opacity="0.16" />
      {#if !compact || i % 2 === 0}<text x={P.x + 70} y={yy + L.text.tick * 0.33} text-anchor="end" font-family="var(--tag-font)" font-size={fs(L.text.tick)} font-weight="800" fill="var(--line)">{label}</text>{/if}
    {/each}
    <path d={pamD} fill="none" stroke="var(--line)" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" opacity="0.28" />
    <path d={pamD} fill="none" stroke="var(--berry)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" />
  </g>
  {#if !compact}
    <text x={P.x + 34} y={P.y + P.h - (portrait ? 54 : 62)} font-family="var(--label-font)" font-size={fs(L.text.body)} font-weight="800" fill="var(--line)">{S('pamLine')}</text>
    {#if !portrait}<text x={P.x + 34} y={P.y + P.h - 30} font-family="var(--tag-font)" font-size={fs(L.text.small)} font-weight="800" fill="var(--line)">{S('tag.speedShort')}</text>{/if}
  {/if}

  {@const E = L.eye}
  <Card x={E.x} y={E.y} w={E.w} h={E.h} tint="var(--berry)" />
  <text x={E.x + E.w / 2} y={E.y + 42} text-anchor="middle" font-family="var(--label-font)" font-size={fs(L.text.head)} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{S('eyeTitle')}</text>
  <g>
    <rect x={E.x + 82} y={E.y + 78} width={E.w - 122} height={portrait ? 210 : 126} rx="18" fill="var(--paper-white)" stroke="var(--line)" stroke-width="4" opacity="0.9" />
    {#each PAM_LABELS as label, i}
      {@const yy = E.y + 88 + ((portrait ? 190 : 106) * i) / 4}
      <path d={`M${E.x + 82} ${yy} H${E.x + E.w - 40}`} stroke="var(--line)" stroke-width="2" opacity="0.14" />
      {#if !compact || i % 2 === 0}<text x={E.x + 64} y={yy + L.text.tick * 0.3} text-anchor="end" font-family="var(--tag-font)" font-size={fs(L.text.tick)} font-weight="800" fill="var(--line)">{label}</text>{/if}
    {/each}
    {#each EYE_PATHS as e, i}
      <path d={eyeD(e, E.x + 98, E.y + 88, E.w - 154, portrait ? 190 : 106)} fill="none" stroke={i % 3 === 0 ? 'var(--blue)' : i % 3 === 1 ? 'var(--orange)' : 'var(--teal)'} stroke-width="5" opacity="0.48" />
    {/each}
    {#each [0, 1, 2, 3] as gap}
      {@const gy = E.y + 88 + ((portrait ? 190 : 106) * (gap + 0.5)) / 4}
      <ellipse cx={E.x + E.w / 2 + 18} cy={gy} rx={portrait ? 72 : 62} ry={portrait ? 18 : 13} fill="var(--paper-white)" opacity="0.52" />
      <ellipse cx={E.x + E.w / 2 + 18} cy={gy} rx={portrait ? 72 : 62} ry={portrait ? 18 : 13} fill="none" stroke="var(--line)" stroke-width="2.5" stroke-dasharray="7 9" opacity="0.42" />
    {/each}
  </g>
  {#if !compact}
    <text x={E.x + 34} y={E.y + E.h - (portrait ? 54 : 62)} font-family="var(--label-font)" font-size={fs(L.text.body)} font-weight="800" fill="var(--line)">{S('eyeLine')}</text>
    {#if !portrait}<text x={E.x + 34} y={E.y + E.h - 30} font-family="var(--tag-font)" font-size={fs(L.text.small)} font-weight="800" fill="var(--line)">{S('tag.duplexShort')} · {S('tag.catShort')}</text>{/if}
  {/if}
{:else}
  {@const K = L.kid}
  <Card x={K.x} y={K.y} w={K.w} h={K.h} tint="var(--sun)" />
  <text x={K.x + K.w / 2} y={K.y + 42} text-anchor="middle" font-family="var(--label-font)" font-size={fs(L.text.head)} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{S('pushTitle')}</text>
  <path d={pulseD} fill="none" stroke="var(--line)" stroke-width="17" stroke-linejoin="round" stroke-linecap="round" opacity="0.26" />
  <path d={pulseD} fill="none" stroke="var(--accent)" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" />
  <g transform={`translate(${K.x + 78} ${K.y + (portrait ? 224 : 212)})`}>
    <path d={`M0 0 H${K.w - 156}`} stroke="var(--line)" stroke-width="6" stroke-linecap="round" />
    <path d={`M${K.w - 280} 0 H${K.w - 156}`} stroke="var(--paper)" stroke-width="14" stroke-linecap="round" opacity="0.78" />
    <path d={`M${K.w - 280} 0 H${K.w - 156}`} stroke="var(--line)" stroke-width="6" stroke-linecap="round" stroke-dasharray="7 10" opacity="0.28" />
    <text x="0" y="-12" font-family="var(--tag-font)" font-size={fs(L.text.small)} font-weight="800" fill="var(--line)">0 m</text>
    <text x={K.w - 156} y="-12" text-anchor="end" font-family="var(--tag-font)" font-size={fs(L.text.small)} font-weight="800" fill="var(--line)">100 m</text>
  </g>
  {#if portrait || compact}
    <text x={K.x + 34} y={K.y + K.h - (portrait ? 78 : 88)} font-family="var(--label-font)" font-size={fs(portrait ? 34 : L.text.body)} font-weight="800" fill="var(--line)">{S('hundredA')}</text>
    <text x={K.x + 34} y={K.y + K.h - 30} font-family="var(--label-font)" font-size={fs(portrait ? 34 : L.text.body)} font-weight="800" fill="var(--line)">{S('hundredB')}</text>
  {:else}
    <text x={K.x + 34} y={K.y + K.h - 40} font-family="var(--label-font)" font-size={fs(L.text.body)} font-weight="800" fill="var(--line)">{S('hundredShort')}</text>
  {/if}
{/if}
