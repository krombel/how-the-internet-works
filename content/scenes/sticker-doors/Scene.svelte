<svelte:options namespace="svg" />
<script lang="ts">
  import { Node, Text, fakeMac, fill, nameOf, strings, view, yours, type LayerSubject } from '$core/api';
  import Card from './art/Card.svelte';
  import StickerParcel from './art/StickerParcel.svelte';
  import { bob, layoutFor, moment, parcelX, ramp, type LayerKind, type RoleKind } from './sticker';

  let { subject }: { subject: LayerSubject } = $props();
  const S = strings('scene.sticker-doors');
  const ctx = $derived(subject.ctx);
  const nerd = $derived(ctx.level === 'nerd');
  const layer = $derived<LayerKind>(subject.layer === 'vlan' || subject.layer === 'mpls' ? subject.layer : 'ethernet');
  const role = $derived<RoleKind>(ctx.role);
  const L = $derived(layoutFor(view.orient, view.vp));
  const T = $derived(L.text);
  const m = $derived(moment(view.still ? 5.4 : view.time));
  const x = $derived(parcelX(L, m));
  const moving = $derived(m.phase === 'arrive' || m.phase === 'reply' || m.phase === 'straight');
  const action = $derived.by(() => {
    if (layer === 'vlan') return ctx.to.id === 'bng' ? 'vlan.bng' : 'vlan.pass';
    if (layer === 'mpls') return ctx.to.id === 'core' ? 'mpls.pop' : (ctx.to.id === 'bng' || ctx.to.id === 'mobile-core') ? 'mpls.push' : 'mpls.swap';
    return role === 'bridge' ? 'ethernet.bridge' : 'ethernet.me';
  });
  const actionTint = $derived(layer === 'vlan' ? '#72b8a5' : layer === 'mpls' ? '#bd6b87' : role === 'bridge' ? '#ffcf5d' : '#f28f5b');
  const bookTint = $derived(layer === 'vlan' ? '#8fc97a' : layer === 'mpls' ? '#9a6b45' : '#72b8a5');
  const fromMac = $derived(fakeMac(ctx.client.id));
  const boxMac = $derived(fakeMac(ctx.to.id));
  const nextMac = $derived(fakeMac(ctx.from.id));
  const arpTarget = $derived(ctx.from.addr ?? ctx.client.addr ?? ctx.dst);
  const arpMac = $derived(fakeMac(arpTarget || ctx.from.id));
  const laneRows = $derived(ctx.to.id === 'bng'
    ? [['S-VID', '101'], ['C-VID', '2042'], [S('book.owner'), nerd ? S('book.subscriber') : S('book.you')]]
    : [[S('book.street'), '101'], [S('book.house'), '2042'], [S('book.otherStreet'), '102']]);
  const mplsRows = $derived(action === 'mpls.push'
    ? [['IP', `${S('book.push')} 24012`], ['24012', `${S('book.door')} 3`]]
    : action === 'mpls.pop'
      ? [['17003', S('book.pop')], ['IP', S('book.readNext')]]
      : [[`${S('book.in')} 24012`, `${S('book.door')} 3`], [S('book.out'), '17003']]);
  const bookRows = $derived.by(() => {
    if (layer === 'vlan') return laneRows;
    if (layer === 'mpls') return mplsRows;
    if (role === 'bridge') return [
      [nerd ? fromMac : S('label.phone'), '1'],
      [m.learned ? (nerd ? nextMac : S('label.reply')) : S('label.unknown'), m.learned ? '2' : '?'],
      ...(nerd ? [[S('book.age'), '~300 s']] : []),
    ];
    return [
      [arpTarget || '192.168.1.23', m.learned ? arpMac : 'ff:ff:ff:ff:ff:ff'],
      [nerd ? S('book.fcs') : S('book.check'), m.phase === 'fanout' ? S('book.drop') : 'OK'],
      ...(nerd ? [['IPv6', 'NDP']] : []),
    ];
  });
  const packetSticker = $derived(layer === 'vlan' ? '101' : layer === 'mpls' ? (m.learned ? mplsRight : mplsLeft) : role === 'bridge' ? (m.learned ? '2' : '') : S('sticker.meShort'));
  const isPortrait = $derived(view.orient === 'portrait');
  const rowY = (i: number) => L.cards[1].y + (isPortrait ? 148 : L.compact ? 142 : 112) + i * (isPortrait ? 62 : L.compact ? 58 : 44);
  const doorPulse = $derived(m.phase === 'fanout' ? ramp(m.p, 0.05, 0.85) : m.phase === 'straight' ? 1 : 0);
  const peel = $derived(role !== 'bridge' && layer === 'ethernet' ? (m.phase === 'fanout' ? ramp(m.p, 0, 0.6) : m.phase === 'straight' ? 1 : 0) : 0);
  const actionScale = $derived(isPortrait ? 1.05 : L.compact ? 0.9 : 0.95);
  const actionY = $derived(L.cards[0].y + (isPortrait ? 198 : L.compact ? 178 : 158));
  // each drawing is lopsided around its origin; nudge it back to the card's middle
  const actionDx = $derived(layer === 'mpls' ? 0 : layer === 'vlan' ? 10 : role === 'bridge' ? 39 : -73);
  const steps = $derived([S(`mini.${action}.a`), S(`mini.${action}.b`)]);
  const fieldsLine = $derived(layer === 'vlan'
    ? '0x88a8 S101 · 0x8100 C2042'
    : layer === 'mpls'
      ? `${mplsLeft} → ${mplsRight} · TC 0 · S 1 · TTL ${ctx.ttl}`
      : role === 'bridge'
        ? `dst …${nextMac.slice(-5)} · src …${fromMac.slice(-5)} · 0x0800`
        : `dst …${boxMac.slice(-5)} · src …${nextMac.slice(-5)} · 0x0800`);
  const mplsLeft = $derived(action === 'mpls.push' ? 'IP' : action === 'mpls.pop' ? '17003' : '24012');
  const mplsRight = $derived(action === 'mpls.push' ? '24012' : action === 'mpls.pop' ? 'IP' : '17003');
  const mplsMid = $derived(action === 'mpls.pop' ? 'pop' : '');
</script>

<defs>
  <marker id="arrow-sticker" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 Z" fill="#6b3f2a" />
  </marker>
</defs>

{#snippet smallEnvelope(x0: number, y0: number, tint: string, label: string, opacity = 1, scale = 1)}
  <g transform="translate({x0} {y0}) scale({scale})" opacity={opacity}>
    <rect x="-48" y="-35" width="96" height="70" rx="12" fill={tint} stroke="#6b3f2a" stroke-width="5" />
    <path d="M-42 -29 L0 3 L42 -29" fill="none" stroke="#6b3f2a" stroke-width="4" opacity="0.65" />
    <rect x="-33" y="0" width="66" height="26" rx="6" fill="#fff7df" stroke="#6b3f2a" stroke-width="3" />
    {#if label}<text x="0" y="26" text-anchor="middle" font-size={label.length <= 3 ? 42 : 30} font-family="system-ui, sans-serif" font-weight="900" fill="#6b3f2a">{label}</text>{/if}
  </g>
{/snippet}

{#snippet tinyDoorBox(x0: number, y0: number, scale = 1, vlan = false)}
  <g transform="translate({x0} {y0}) scale({scale})">
    <rect x="-125" y="-70" width="250" height="140" rx="22" fill="#e7bd78" stroke="#6b3f2a" stroke-width="6" />
    {#each [0, 1, 2, 3] as i}
      {@const lane = !vlan || i === 0 || i === 2}
      <rect x={-104 + i * 56} y="-22" width="42" height="70" rx="8" fill={vlan ? (lane ? '#72b8a5' : '#d9cbb4') : '#fff2d7'} stroke="#6b3f2a" stroke-width="4" opacity={vlan && !lane ? 0.55 : 1} />
      <text x={-83 + i * 56} y="25" text-anchor="middle" font-size="39" font-family="system-ui, sans-serif" font-weight="900" fill={vlan && lane ? '#fff7df' : '#6b3f2a'}>{i + 1}</text>
    {/each}
  </g>
{/snippet}

<rect x={L.road.x0} y={L.road.y - 36} width={L.road.x1 - L.road.x0} height="72" rx="36" fill="#f5d9a3" stroke="#6b3f2a" stroke-width="6" />
<path d={`M${L.road.x0 + 50} ${L.road.y} H${L.road.x1 - 50}`} stroke="#fff7df" stroke-width="7" stroke-dasharray="34 30" stroke-linecap="round" />

<Card x={L.cards[0].x} y={L.cards[0].y} w={L.cards[0].w} h={L.cards[0].h} tint={actionTint} />
<Text x={L.cards[0].x + 34} y={L.cards[0].y + (isPortrait || L.compact ? 82 : 62)} text={S(`card.${layer === 'mpls' ? 'label' : 'action'}`)} size={T.title * (L.compact ? 0.62 : 1)} kind="big" anchor="start" />
<g transform="translate({L.cards[0].x + L.cards[0].w / 2 + actionDx * actionScale} {actionY}) scale({actionScale})">
  {#if layer === 'ethernet' && role === 'bridge'}
    {@render tinyDoorBox(0, 8, 0.92, false)}
    {@render smallEnvelope(-170 + 38 * ramp(m.p, 0, 0.6), 0, '#ffcf5d', '', 1, 0.68)}
    {#each [-42, 15, 72] as dx, i}
      <path d={`M-64 -6 Q${-16 + i * 12} ${-88 - i * 18} ${dx} -56`} fill="none" stroke="#bd6b87" stroke-width="7" stroke-linecap="round" stroke-dasharray="16 12" opacity={doorPulse * 0.72} />
      {@render smallEnvelope(dx, -78 - i * 12, '#ffcf5d', '', doorPulse * 0.5, 0.45)}
    {/each}
    {#if m.phase === 'straight'}
      <path d="M-62 -5 C-10 -92 24 -92 18 -38" fill="none" stroke="#4f8b41" stroke-width="9" stroke-linecap="round" marker-end="url(#arrow-sticker)" />
    {/if}
  {:else if layer === 'ethernet'}
    {@render smallEnvelope(-86, 6, '#f28f5b', '', 1, 0.88)}
    <g transform="translate({-86 - peel * 50} {-30 - peel * 8}) rotate({-18 * peel})" opacity={1 - peel * 0.35}>
      <rect x="-64" y="-28" width="128" height="56" rx="12" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
      <text x="0" y="11" text-anchor="middle" font-size="36" font-family="system-ui, sans-serif" font-weight="900" fill="#4f8b41">For ✓</text>
    </g>
    <rect x="8" y="-80" width="124" height="58" rx="16" fill="#fff7df" stroke="#6b3f2a" stroke-width="5" />
    <text x="70" y="-41" text-anchor="middle" font-size="34" font-family="system-ui, sans-serif" font-weight="900" fill="#4f8b41">FCS ✓</text>
    <g opacity={m.phase === 'lookup' || m.phase === 'fanout' ? 1 : 0.45}>
      <path d="M-8 42 C42 96 117 84 145 42" fill="none" stroke="#72b8a5" stroke-width="8" stroke-linecap="round" stroke-dasharray="18 14" />
      <rect x="8" y="40" width="285" height="58" rx="18" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
      <text x="150" y="78" text-anchor="middle" font-size="36" font-family="system-ui, sans-serif" font-weight="900" fill="#6b3f2a">{S('label.whoHasShort')}</text>
      <rect x="224" y="-24" width="72" height="56" rx="16" fill="#8fc97a" stroke="#6b3f2a" stroke-width="4" opacity={m.phase === 'fanout' || m.phase === 'straight' ? 1 : 0.25} />
      <path d="M243 5 L256 18 L278 -10" fill="none" stroke="#6b3f2a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity={m.phase === 'fanout' || m.phase === 'straight' ? 1 : 0.25} />
    </g>
  {:else if layer === 'vlan'}
    {@render tinyDoorBox(0, 16, 0.92, true)}
    {@render smallEnvelope(-150, 0, '#72b8a5', '101', 1, 0.85)}
    <path d="M-74 0 C-24 -74 42 -74 66 -38" fill="none" stroke="#72b8a5" stroke-width="9" stroke-linecap="round" opacity={0.9} />
    <path d="M-72 -4 C-12 74 90 74 84 25" fill="none" stroke="#d9cbb4" stroke-width="7" stroke-linecap="round" stroke-dasharray="12 12" opacity="0.35" />
    {#if action === 'vlan.bng'}
      <g transform="translate(104 -55) rotate(-8)">
        <rect x="-54" y="-26" width="108" height="52" rx="12" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
        <text x="0" y="9" text-anchor="middle" font-size="30" font-family="system-ui, sans-serif" font-weight="900" fill="#6b3f2a">TAGS</text>
      </g>
      <path d="M62 -28 Q102 -84 143 -55" fill="none" stroke="#bd6b87" stroke-width="7" stroke-linecap="round" />
    {/if}
  {:else}
    <g transform="translate(-110 -6)">
      <path d="M-100 44 H115" stroke="#6b3f2a" stroke-width="16" stroke-linecap="round" />
      <path d="M-90 44 H105" stroke="#fff7df" stroke-width="5" stroke-dasharray="18 14" stroke-linecap="round" />
      <rect x="-112" y="-58" width="166" height="64" rx="16" fill={action === 'mpls.push' ? '#fff2d7' : '#bd6b87'} stroke="#6b3f2a" stroke-width="5" />
      <text x="-29" y="-13" text-anchor="middle" font-size="48" font-family="system-ui, sans-serif" font-weight="900" fill={action === 'mpls.push' ? '#6b3f2a' : '#fff7df'}>{mplsLeft}</text>
      <path d="M72 -25 H142" stroke="#6b3f2a" stroke-width="7" stroke-linecap="round" marker-end="url(#arrow-sticker)" />
      {#if mplsMid}
        <rect x="66" y="-64" width="90" height="32" rx="10" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
        <text x="111" y="-38" text-anchor="middle" font-size="34" font-family="system-ui, sans-serif" font-weight="900" fill="#6b3f2a">{mplsMid}</text>
      {/if}
      <rect x="166" y="-58" width="166" height="64" rx="16" fill={action === 'mpls.pop' ? '#fff2d7' : '#bd6b87'} stroke="#6b3f2a" stroke-width="5" />
      <text x="249" y="-13" text-anchor="middle" font-size="48" font-family="system-ui, sans-serif" font-weight="900" fill={action === 'mpls.pop' ? '#6b3f2a' : '#fff7df'}>{mplsRight}</text>
    </g>
  {/if}
</g>
{#if isPortrait || L.compact}
  {#each steps as step, i}
    <Text x={L.cards[0].x + L.cards[0].w / 2} y={L.cards[0].y + L.cards[0].h - (L.compact ? 84 : 100) + i * (L.compact ? 60 : 62)} text={i ? `→ ${step}` : step} size={32} kind="big" colour="#a65435" />
  {/each}
{:else}
  <Text x={L.cards[0].x + L.cards[0].w / 2} y={L.cards[0].y + L.cards[0].h - 24} text={`${steps[0]}  →  ${steps[1]}`} size={22} kind="big" colour="#a65435" />
{/if}

<Card x={L.cards[1].x} y={L.cards[1].y} w={L.cards[1].w} h={L.cards[1].h} tint={bookTint} />
{#if L.compact}
  <text x={L.cards[1].x + 38} y={L.cards[1].y + 92} font-size="58" font-family="system-ui, sans-serif" font-weight="800" fill="#6b3f2a">{S(layer === 'mpls' ? 'card.lfib' : layer === 'vlan' ? 'card.lanes' : role === 'bridge' ? 'card.macBook' : 'card.arpBook')}</text>
  {#each bookRows.slice(0, 2) as r, i}
    <rect x={L.cards[1].x + 34} y={L.cards[1].y + 140 + i * 72} width={L.cards[1].w - 68} height="54" rx="14" fill="#fff7df" stroke="#6b3f2a" stroke-width="4" />
    <text x={L.cards[1].x + 58} y={L.cards[1].y + 179 + i * 72} font-size="38" font-family="system-ui, sans-serif" font-weight="800" fill="#6b3f2a">{r[0]}</text>
    <text x={L.cards[1].x + L.cards[1].w - 58} y={L.cards[1].y + 179 + i * 72} text-anchor="end" font-size="38" font-family="system-ui, sans-serif" font-weight="800" fill="#a65435">{r[1]}</text>
  {/each}
{:else}
  <Text x={L.cards[1].x + 34} y={L.cards[1].y + (isPortrait ? 88 : 72)} text={S(layer === 'mpls' ? 'card.lfib' : layer === 'vlan' ? 'card.lanes' : role === 'bridge' ? 'card.macBook' : 'card.arpBook')} size={T.title} kind="big" anchor="start" />
  {#each bookRows as r, i}
    {@const y = rowY(i)}
    <rect x={L.cards[1].x + 28} y={y - T.small * 0.78} width={L.cards[1].w - 56} height={T.small * 1.42} rx="13" fill={i === 0 && (m.phase === 'lookup' || m.phase === 'straight') ? '#fff2d7' : '#fff7df'} stroke="#6b3f2a" stroke-width={i === 0 && (m.phase === 'lookup' || m.phase === 'straight') ? 5 : 2} opacity="0.96" />
    <Text x={L.cards[1].x + 48} y={y + T.small * 0.35} text={r[0]} size={T.small} kind="node" anchor="start" />
    <Text x={L.cards[1].x + L.cards[1].w - 48} y={y + T.small * 0.35} text={r[1]} size={T.small} kind="big" anchor="end" colour={i === 0 ? '#a65435' : '#6b3f2a'} />
  {/each}
{/if}

{#if nerd}
  {@const c = L.cards[1]}
  {@const fs = isPortrait ? 32 : L.compact ? 30 : 20}
  <rect x={c.x + 28} y={c.y + c.h - fs * 2.9} width={c.w - 56} height={fs * 2} rx="14" fill="#fff2d7" stroke="#6b3f2a" stroke-width="4" />
  <text x={c.x + c.w / 2} y={c.y + c.h - fs * 1.55} text-anchor="middle" font-family="var(--tag-font)" font-size={fs} font-weight="800" fill="#6b3f2a">{fieldsLine}</text>
{/if}

<Node id={ctx.client.node.id} x={L.ends[0].x} y={L.ends[0].y} size={L.ends[0].size} />
<Node id={ctx.server.node.id} x={L.ends[1].x} y={L.ends[1].y} size={L.ends[1].size} />

<g>
  <rect x={L.box.x} y={L.box.y} width={L.box.w} height={L.box.h} rx="28" fill="#e7bd78" stroke="#6b3f2a" stroke-width="7" />
  <path d={`M${L.box.x + 28} ${L.box.y + 58} H${L.box.x + L.box.w - 28}`} stroke="#fff7df" stroke-width="8" stroke-linecap="round" opacity="0.55" />
  {#each L.doors as d, i}
    {@const sameLane = layer !== 'vlan' || i === 0 || i === 2}
    {@const active = (role === 'bridge' && layer === 'ethernet' && ((m.phase === 'fanout' && i > 0) || (m.phase === 'straight' && i === 1))) || (layer === 'vlan' && sameLane && i !== 3) || (layer === 'mpls' && i === 2)}
    <rect x={d.x - 35} y={d.y - 82} width="70" height="82" rx="10" fill={layer === 'vlan' ? (sameLane ? '#72b8a5' : '#d9cbb4') : '#fff2d7'} stroke={active ? '#e97845' : '#6b3f2a'} stroke-width={active ? 7 : 5} />
    <Text x={d.x} y={d.y - 28} text={String(i + 1)} size={T.small * 1.28} kind="big" colour={layer === 'vlan' && sameLane ? '#fff7df' : '#6b3f2a'} />
  {/each}
  <Node id={ctx.to.node.id} x={L.hop.x} y={L.hop.y} size={L.hop.size} focused />
</g>

{#if layer === 'ethernet' && role === 'bridge' && m.phase === 'fanout'}
  {#each L.doors.slice(1) as d, i}
    <path d={`M${L.doors[0].x} ${L.doors[0].y - 112} Q${(L.doors[0].x + d.x) / 2} ${L.doors[0].y - 190 - i * 18} ${d.x} ${d.y - 112}`} fill="none" stroke="#bd6b87" stroke-width="8" stroke-linecap="round" stroke-dasharray="18 14" opacity={0.3 + 0.55 * ramp(m.p, 0.1, 0.8)} />
  {/each}
{:else if layer === 'ethernet' && role !== 'bridge' && m.phase === 'fanout'}
  {#each L.doors as d}
    <path d={`M${L.doors[1].x} ${L.doors[1].y - 112} Q${(L.doors[1].x + d.x) / 2} ${L.doors[1].y - 185} ${d.x} ${d.y - 112}`} fill="none" stroke="#72b8a5" stroke-width="7" stroke-linecap="round" stroke-dasharray="16 14" opacity="0.55" />
  {/each}
{/if}

{#if !isPortrait && !L.compact}
  <Text x={L.ends[0].x} y={L.names} text={nameOf(ctx.client)} size={T.small} kind="node" />
  <Text x={L.ends[1].x} y={L.names} text={nameOf(ctx.server)} size={T.small} kind="node" />
{/if}
{#if !L.compact}<Text x={L.hop.x} y={L.names} text={nameOf(ctx.to)} size={T.title * (isPortrait ? 0.82 : 1)} kind="big" />{/if}

<StickerParcel x={x} y={L.walk + bob(view.time, moving)} scale={T.parcel} tint={actionTint} sticker={packetSticker} moving={moving} time={view.time} smudge={layer === 'ethernet' && role !== 'bridge' && m.phase === 'fanout'} />

{#if layer === 'ethernet' && role !== 'bridge' && m.phase === 'lookup'}
  <g transform="translate({L.box.x + L.box.w / 2} {L.box.y - 55})">
    <rect x="-118" y="-34" width="236" height="68" rx="22" fill="#fff7df" stroke="#6b3f2a" stroke-width="5" />
    <Text x="0" y="12" text={S('label.whoHasShort')} size={T.small} kind="big" />
  </g>
{/if}
