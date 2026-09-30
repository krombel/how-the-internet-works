<svelte:options namespace="svg" />
<script lang="ts">
  // THESIS: GTP is the mobile network's tunnel envelope, staged like the IP dive: a road below and paper cards above.
  // OWN-WORLD: storybook road, pinned paper cards, chunky tunnel mouths, cream envelopes, brown ink. STORY: the tower
  // wraps a phone-addressed parcel for the mobile core, the core unwraps it, and handover swings the tunnel to the next
  // tower while the phone address stays. FIRST VIEWPORT: focused reader hop on the road, cards explain tunnel label and
  // handover. FORM: IP-dive family staging with a deterministic 16 s loop.
  import { Node, TagAt, Text, nameOf, strings, view, type LayerSubject } from '$core/api';
  import Card from './art/Card.svelte';
  import Parcel from './art/Parcel.svelte';
  import TunnelEnvelope from './art/TunnelEnvelope.svelte';
  import TunnelMouth from './art/TunnelMouth.svelte';
  import { layoutFor, sceneState } from './tunnel';

  let { subject }: { subject: LayerSubject } = $props();
  const S = strings('scene.gtp-tunnel');
  const focus = $derived(subject.ctx.to.node.id === 'mobile-core' ? 'mobile-core' : 'cell-tower');
  const L = $derived(layoutFor(view.orient, focus, view.vp));
  const T = $derived(L.size);
  const st = $derived(sceneState(view.time, L));
  const phoneName = $derived(nameOf(subject.ctx.client));
  const towerName = $derived(nameOf(subject.route.hops['cell-tower']));
  const coreName = $derived(nameOf(subject.route.hops['mobile-core']));
  const address = '100.64.12.7';
  const c0 = $derived(L.cards[0]);
  const c1 = $derived(L.cards[1]);
  const portrait = $derived(view.orient === 'portrait');
  const compact = $derived(!!L.compact);
  const cardEnvScale = $derived(compact ? 1.25 : portrait ? 1.4 : 1.35);
  const tagTexts = $derived(compact ? [] : portrait ? [S('tag.tunnel')] : [S('tag.tunnel'), S('tag.anchor')]);
  const statusSize = $derived(portrait ? 44 : compact ? 40 : 32);
  const statusY = $derived(c1.y + c1.h - (portrait ? 34 : compact ? 36 : 24));
  const statusW = $derived(portrait ? 410 : compact ? 380 : 330);
  const directionText = $derived(S(st.goingToCore ? 'label.toCore' : 'label.fromCore'));
  const labelLines = $derived.by(() => {
    const words = directionText.split(' ');
    const direction = words.length > 2 ? [`${words[0]} ${words[1]}`, words.slice(2).join(' ')]
      : directionText.length > 12 ? words : [directionText];
    return [...direction, S('label.envelope')];
  });
  const labelTextX = $derived(portrait ? c0.x + c0.w * 0.44 : c0.x + c0.w * 0.57);
  const labelTextY = $derived(portrait ? c0.y + c0.h * 0.48 : c0.y + c0.h * 0.40);
  const labelGap = $derived(portrait ? 58 : 40);
  /** Keep a name inside the panel (the focused core sits near the right edge in portrait). */
  const nameX = (x: number, text: string, size: number) => {
    const half = text.length * size * 0.28;
    return Math.max(L.road.x0 + half, Math.min(L.road.x1 - half, x));
  };
</script>

<!-- road and tunnel cutaway -->
<path d={portrait
  ? `M0 ${L.road.y - 115} C190 ${L.road.y - 190} 325 ${L.road.y - 70} 510 ${L.road.y - 140} C680 ${L.road.y - 205} 760 ${L.road.y - 120} 900 ${L.road.y - 150} L900 1600 H0 Z`
  : `M0 ${L.road.y - 95} C210 ${L.road.y - 170} 360 ${L.road.y - 60} 575 ${L.road.y - 135} C820 ${L.road.y - 220} 1040 ${L.road.y - 70} 1600 ${L.road.y - 170} L1600 900 H0 Z`}
  fill="var(--meadow)" opacity="0.58" />
<path d={`M${st.towerEnd.x} ${L.road.y - 105} Q${(st.towerEnd.x + L.core.x) / 2} ${L.road.y - (portrait ? 255 : compact ? 180 : 210)} ${L.core.x} ${L.road.y - 105}`} fill="none" stroke="var(--line)" stroke-width="54" stroke-linecap="round" opacity="0.95" />
<path d={`M${st.towerEnd.x} ${L.road.y - 105} Q${(st.towerEnd.x + L.core.x) / 2} ${L.road.y - (portrait ? 255 : compact ? 180 : 210)} ${L.core.x} ${L.road.y - 105}`} fill="none" stroke="var(--teal)" stroke-width="40" stroke-linecap="round" />
<path d={`M${st.towerEnd.x} ${L.road.y - 105} Q${(st.towerEnd.x + L.core.x) / 2} ${L.road.y - (portrait ? 255 : compact ? 180 : 210)} ${L.core.x} ${L.road.y - 105}`} fill="none" stroke="var(--paper)" stroke-width="16" stroke-linecap="round" stroke-dasharray="30 25" opacity="0.72" />
<rect x={L.road.x0} y={L.road.y - 36} width={L.road.x1 - L.road.x0} height="72" rx="36" fill="var(--kraft)" stroke="var(--line)" stroke-width="6" />
<path d={`M${L.road.x0 + 50} ${L.road.y} H${L.road.x1 - 50}`} stroke="var(--paper)" stroke-width="7" stroke-dasharray="34 30" stroke-linecap="round" />
<TunnelMouth x={st.towerEnd.x} y={L.road.y - 112} scale={portrait ? 0.78 : 0.82} active={focus === 'cell-tower'} />
<TunnelMouth x={L.core.x} y={L.road.y - 112} scale={portrait ? 0.78 : 0.82} active={focus === 'mobile-core'} />

<!-- cards -->
<Card x={c0.x} y={c0.y} w={c0.w} h={c0.h} tint="var(--teal)" />
<Text x={c0.x + 34} y={c0.y + (portrait || compact ? 88 : 72)} text={S('label.cardLabel')} size={T.big} kind="big" anchor="start" />
<g transform="translate({c0.x + c0.w * (portrait ? 0.24 : compact ? 0.27 : 0.29)} {c0.y + c0.h * (portrait ? 0.64 : compact ? 0.58 : 0.70)})">
  <TunnelEnvelope x={0} y={0} scale={cardEnvScale} open={st.opening} />
</g>
{#if !compact && !st.opening}
  {#each labelLines as line, i}
    <Text x={labelTextX} y={labelTextY + i * labelGap} text={line} size={T.text} kind="small" anchor="start" colour="var(--brick)" />
  {/each}
{/if}
{#if st.opening}
  <Parcel x={c0.x + c0.w * (portrait ? 0.76 : compact ? 0.71 : 0.72)} y={c0.y + c0.h * (portrait ? 0.78 : compact ? 0.72 : 0.76)} scale={portrait ? 1.05 : compact ? 0.78 : 0.86} colour="var(--sun)" />
  <Text x={c0.x + c0.w * (portrait ? 0.72 : compact ? 0.68 : 0.72)} y={c0.y + c0.h * (portrait ? 0.90 : compact ? 0.88 : 0.94)} text={address} size={compact ? 34 : T.text * 0.85} kind="small" colour="var(--brick)" />
{:else}
  <Text x={c0.x + c0.w * (portrait ? 0.72 : compact ? 0.67 : 0.72)} y={c0.y + c0.h * (portrait ? 0.90 : compact ? 0.79 : 0.80)} text={address} size={compact ? 34 : T.text * 0.9} kind="node" colour="var(--brick)" />
{/if}

<Card x={c1.x} y={c1.y} w={c1.w} h={c1.h} tint="var(--berry)" />
<Text x={c1.x + 34} y={c1.y + (portrait || compact ? 88 : 72)} text={S('label.handover')} size={T.big} kind="big" anchor="start" />
<g opacity="0.94">
  <Node id="cell-tower" x={c1.x + c1.w * 0.22} y={c1.y + c1.h * (portrait ? 0.54 : compact ? 0.56 : 0.55)} size={portrait || compact ? 200 : 180} />
  <Node id="cell-tower" x={c1.x + c1.w * 0.50} y={c1.y + c1.h * (portrait ? 0.54 : compact ? 0.56 : 0.55)} size={portrait || compact ? 200 : 180} />
  <Node id="mobile-core" x={c1.x + c1.w * 0.80} y={c1.y + c1.h * (portrait ? 0.53 : compact ? 0.55 : 0.55)} size={portrait || compact ? 205 : 185} />
  <path d={`M${c1.x + c1.w * 0.22} ${c1.y + c1.h * (portrait ? 0.73 : 0.73)} Q${c1.x + c1.w * (0.22 + 0.28 * st.p)} ${c1.y + c1.h * (portrait ? 0.30 : compact ? 0.31 : 0.28)} ${c1.x + c1.w * 0.80} ${c1.y + c1.h * (portrait ? 0.73 : 0.73)}`} fill="none" stroke="var(--teal)" stroke-width={portrait || compact ? 18 : 14} stroke-linecap="round" opacity="0.72" />
  <path d={`M${c1.x + c1.w * 0.22} ${c1.y + c1.h * (portrait ? 0.73 : 0.73)} Q${c1.x + c1.w * (0.22 + 0.28 * st.p)} ${c1.y + c1.h * (portrait ? 0.30 : compact ? 0.31 : 0.28)} ${c1.x + c1.w * 0.80} ${c1.y + c1.h * (portrait ? 0.73 : 0.73)}`} fill="none" stroke="var(--paper)" stroke-width={portrait || compact ? 7 : 5} stroke-linecap="round" stroke-dasharray="22 16" opacity="0.8" />
</g>
<rect x={c1.x + c1.w / 2 - statusW / 2} y={statusY - statusSize * 0.78} width={statusW} height={statusSize * 1.15} rx="18" fill="var(--paper)" opacity="0.94" />
<Text x={c1.x + c1.w / 2} y={statusY} text={S(st.phase === 'handover' || st.phase === 'new-up' ? 'label.walk' : 'label.sameAddress')} size={statusSize} kind="big" colour="var(--brick)" />

<!-- nodes on the road -->
{#if st.phase === 'handover' || st.phase === 'new-up'}
  <path d={`M${L.phoneA.x} ${L.walk + 20} Q${(L.phoneA.x + L.phoneB.x) / 2} ${L.walk + 70} ${L.phoneB.x} ${L.walk + 20}`} fill="none" stroke="var(--line)" stroke-width="5" stroke-dasharray="10 18" stroke-linecap="round" opacity="0.42" />
  <path d={`M${L.tower.x} ${L.road.y - 120} Q${(L.tower.x + L.nextTower.x) / 2} ${L.road.y - 235} ${L.nextTower.x} ${L.road.y - 120}`} fill="none" stroke="var(--berry)" stroke-width="8" stroke-dasharray="18 14" stroke-linecap="round" opacity="0.7" />
{/if}
<Node id="phone" x={st.phone.x} y={st.phone.y} size={st.phone.size} />
<Node id="cell-tower" x={L.tower.x} y={L.tower.y} size={L.tower.size} focused={focus === 'cell-tower'} />
<g opacity={st.phase === 'handover' || st.phase === 'new-up' ? 0.98 : 0.45}>
  <Node id="cell-tower" x={L.nextTower.x} y={L.nextTower.y} size={L.nextTower.size} />
</g>
<Node id="mobile-core" x={L.core.x} y={L.core.y} size={L.core.size} focused={focus === 'mobile-core'} />
{#if !portrait && !compact && st.phase !== 'handover' && st.phase !== 'new-up'}<Text x={st.phone.x} y={L.names} text={phoneName} size={T.text} kind="node" />{/if}
{#if (!portrait && !compact) || focus === 'cell-tower'}<Text x={nameX(L.tower.x, towerName, T.big)} y={L.names} text={towerName} size={focus === 'cell-tower' ? T.big : T.text} kind={focus === 'cell-tower' ? 'big' : 'node'} />{/if}
{#if (!portrait && !compact) || focus === 'mobile-core'}<Text x={nameX(L.core.x, coreName, T.big)} y={L.names} text={coreName} size={(focus === 'mobile-core' ? T.big : T.text) * (portrait ? 0.86 : 1)} kind={focus === 'mobile-core' ? 'big' : 'node'} />{/if}

<!-- walking tunnel envelope -->
{#if st.phase !== 'handover'}
  <g transform="translate({st.parcel.x} {st.parcel.y}) scale({T.parcel})">
    <ellipse cx="0" cy="10" rx="74" ry="16" fill="var(--line)" opacity="0.14" />
    <g stroke="var(--line)" stroke-width="6" stroke-linecap="round">
      <path d="M-28 -8 L-36 10" />
      <path d="M28 -8 L36 10" />
    </g>
    <TunnelEnvelope x={0} y={-60} scale="0.92" open={st.opening} />
    {#if st.opening}<Parcel x={st.goingToCore ? 106 : -106} y={0} scale="0.52" colour="var(--sun)" />{/if}
  </g>
{/if}

{#each tagTexts as tag, i}<TagAt x={L.tags[i].x} y={L.tags[i].y} text={tag} size={T.tag} />{/each}
