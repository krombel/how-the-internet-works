<svelte:options namespace="svg" />
<script lang="ts">
  // PPP, the envelope of a dial-up call: only your computer and the internet company's modem open it. One card takes
  // the envelope apart (flag, address, what's inside, the check, flag); the other plays the hello that starts every
  // call: agree how to talk (LCP), log in (CHAP), get an address (IPCP), with the envelope crossing the line each time.
  import { Node, Text, legibleSize, nameOf, strings, view, type LayerSubject } from '$core/api';
  import Card from '../copper-pulses/art/Card.svelte';
  import { HDLC_TALKS, TALKS, momentAt } from './ppp';

  let { subject }: { subject: LayerSubject } = $props();
  const S = strings('scene.ppp-hello');
  const legible = legibleSize();
  const portrait = $derived(view.orient === 'portrait');
  const compact = $derived(view.orient === 'landscape' && view.vp.h < 470);
  const fs = (size: number) => (compact ? legible(size) : size);

  // On a rented line (Cisco HDLC, 1995) the envelope is simpler and there's no hello: the routers keep each other
  // posted with keepalives. Its words are under `hdlc.`.
  const hdlc = $derived(subject.layer === 'hdlc');
  const K = $derived(hdlc ? 'hdlc.' : '');
  const talks = $derived(hdlc ? HDLC_TALKS : TALKS);

  // the envelope's two ends: this link, stretched across anything in between that only passes the envelope along (a
  // telephone exchange connecting the call)
  const run = $derived.by(() => {
    const ls = subject.route.links.filter((l) => !l.aside), i = ls.findIndex((l) => l.id === subject.ctx.link.id);
    const carries = (j: number) => !!ls[j]?.stack.includes(subject.layer);
    const through = (j: number) => subject.route.hops[ls[j].from].node.role === 'bridge';
    let a = i, b = i;
    while (carries(a - 1) && through(a)) a--;
    while (carries(b + 1) && through(b + 1)) b++;
    return { you: subject.route.hops[ls[a].from], isp: subject.route.hops[ls[b].to], colour: subject.ctx.link.tech.colour };
  });

  type Box = { x: number; y: number; w: number; h: number };
  const L = $derived.by((): { line: { x0: number; x1: number; y: number }; size: number; names: number; name: number; cards: [Box, Box]; head: number; row: number } => {
    if (portrait) return {
      line: { x0: 170, x1: 730, y: 250 }, size: 180, names: 395, name: 30,
      cards: [{ x: 50, y: 460, w: 800, h: 500 }, { x: 50, y: 1000, w: 800, h: 540 }], head: 36, row: 30,
    };
    if (compact) return {
      line: { x0: 260, x1: 1340, y: 160 }, size: 170, names: 310, name: 42,
      cards: [{ x: 40, y: 370, w: 745, h: 500 }, { x: 815, y: 370, w: 745, h: 500 }], head: 44, row: 38,
    };
    return {
      line: { x0: 260, x1: 1340, y: 250 }, size: 200, names: 385, name: 26,
      cards: [{ x: 90, y: 470, w: 690, h: 390 }, { x: 820, y: 470, w: 690, h: 390 }], head: 30, row: 24,
    };
  });
  const A = $derived(L.cards[0]), B = $derived(L.cards[1]);
  const t = $derived(view.still ? 6.6 : view.time);
  const m = $derived(momentAt(t, talks));

  // the envelope, taken apart: [bytes, label key, chip colour]
  const PPP = [
    ['7E', 'flag', 'var(--orange)'],
    ['FF 03', 'address', 'var(--teal)'],
    ['00 21', 'proto', 'var(--teal)'],
    ['IP', 'packet', 'var(--sun)'],
    ['FCS', 'fcs', 'var(--berry)'],
    ['7E', 'flag', 'var(--orange)'],
  ] as const;
  const HDLC = [
    ['7E', 'flag', 'var(--orange)'],
    ['0F 00', 'address', 'var(--teal)'],
    ['08 00', 'proto', 'var(--teal)'],
    ['IP', 'packet', 'var(--sun)'],
    ['FCS', 'fcs', 'var(--berry)'],
    ['7E', 'flag', 'var(--orange)'],
  ] as const;
  const PARTS = $derived(hdlc ? HDLC : PPP);
  const chipW = $derived(fs(L.row) * 3.6);
</script>

{#if !portrait && !compact}<text x="800" y="110" text-anchor="middle" font-size="42" font-weight="900" stroke="var(--paper)" stroke-width="7" paint-order="stroke" font-family="var(--label-font)" fill="var(--line)">{S(`${K}title`)}</text>{/if}

<!-- the call, end to end, with the envelope crossing it -->
<path d={`M${L.line.x0 + 90} ${L.line.y} H${L.line.x1 - 90}`} stroke="var(--line)" stroke-width="16" stroke-linecap="round" opacity="0.24" />
<path d={`M${L.line.x0 + 90} ${L.line.y} H${L.line.x1 - 90}`} stroke={run.colour} stroke-width="7" stroke-linecap="round" />
<Node id={run.you.node.id} x={L.line.x0} y={L.line.y} size={L.size} focused={subject.ctx.to.id === run.you.id} />
<Node id={run.isp.node.id} x={L.line.x1} y={L.line.y} size={L.size} focused={subject.ctx.to.id === run.isp.id} />
<Text x={L.line.x0} y={L.names} text={nameOf(run.you)} size={L.name} kind="node" fit />
<Text x={L.line.x1} y={L.names} text={nameOf(run.isp)} size={L.name} kind="node" fit />
{#if m.at !== null}
  {@const x = L.line.x0 + 130 + (L.line.x1 - L.line.x0 - 260) * m.at}
  <g transform={`translate(${x} ${L.line.y - 4})`} stroke="var(--line)" stroke-width="4" stroke-linejoin="round">
    <rect x="-46" y="-30" width="92" height="60" rx="6" fill="var(--paper)" />
    <path d="M-46 -30 L0 4 L46 -30" fill="none" />
    <path d="M-46 -30 V30 M46 -30 V30" stroke={run.colour} stroke-width="10" />
  </g>
{:else if m.ix === talks.length}
  <Text x={(L.line.x0 + L.line.x1) / 2} y={L.line.y - 40} text={S(`${K}online`)} size={L.name * 1.3} kind="big" />
{/if}

<!-- the envelope, taken apart -->
<Card x={A.x} y={A.y} w={A.w} h={A.h} tint="var(--teal)" />
<text x={A.x + A.w / 2} y={A.y + 42} text-anchor="middle" font-size={fs(L.head)} font-weight="900" stroke="var(--paper)" stroke-width="6" paint-order="stroke" font-family="var(--label-font)" fill="var(--line)">{S(`${K}frameTitle`)}</text>
{#each PARTS as [bytes, key, colour], i (i)}
  {@const gap = (A.h - 92) / PARTS.length}
  {@const y = A.y + 78 + gap * i}
  <rect x={A.x + 30} y={y + 4} width={chipW} height={gap - 8} rx="8" fill={colour} fill-opacity="0.25" stroke="var(--line)" stroke-width="3" />
  <text x={A.x + 30 + chipW / 2} y={y + gap / 2 + fs(L.row) * 0.35} text-anchor="middle" font-family="var(--mono-font)" font-size={fs(L.row)} font-weight="800" fill="var(--line)">{bytes}</text>
  <text x={A.x + 50 + chipW} y={y + gap / 2 + fs(L.row) * 0.35} font-size={fs(L.row)} font-weight="800" font-family="var(--label-font)" fill="var(--line)">{S(`${K}part.${key}`)}</text>
{/each}

<!-- the hello: three talks, each a question and an answer -->
<Card x={B.x} y={B.y} w={B.w} h={B.h} tint="var(--berry)" />
<text x={B.x + B.w / 2} y={B.y + 42} text-anchor="middle" font-size={fs(L.head)} font-weight="900" stroke="var(--paper)" stroke-width="6" paint-order="stroke" font-family="var(--label-font)" fill="var(--line)">{S(`${K}helloTitle`)}</text>
{#each talks as talk, i (talk.id)}
  {@const gap = (B.h - 92) / talks.length}
  {@const y = B.y + 78 + gap * i}
  {@const r = fs(L.row)}
  {@const said = i < m.ix || (i === m.ix && m.answered)}
  {#if i === m.ix}<rect x={B.x + 22} y={y + 2} width={B.w - 44} height={gap - 6} rx="12" fill="none" stroke="var(--orange)" stroke-width="4" />{/if}
  {#if i <= m.ix}
    {@const you = talk.first === 'you'}
    <text x={you ? B.x + 40 : B.x + B.w - 40} y={y + gap * 0.42} text-anchor={you ? 'start' : 'end'} font-size={r} font-weight="900" font-family="var(--label-font)" fill="var(--line)">{S(`${K}talk.${talk.id}.ask`)}</text>
    {#if said}<text x={you ? B.x + B.w - 40 : B.x + 40} y={y + gap * 0.42 + r * 1.25} text-anchor={you ? 'end' : 'start'} font-size={r} font-weight="800" font-family="var(--label-font)" fill="var(--line)">{S(`${K}talk.${talk.id}.answer`)}</text>{/if}
  {/if}
{/each}
