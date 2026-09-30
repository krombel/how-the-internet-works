<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside a 5G link: the tower's antenna panel aims a beam at each phone, and a scheduler gives every phone its
  // own seats in a time × frequency grid (like seats on a bus), so many phones share the air at once.
  import { Node, TagAt, Text, strings, view, type LinkSubject } from '$core/api';
  import { COLS, LAYOUT, ROWS, USERS, beamPath, columns, owner } from './radio';
  import Beam from './art/Beam.svelte';
  import Seat from './art/Seat.svelte';
  let { subject }: { subject: LinkSubject } = $props();
  const S = strings('scene.nr-radio');
  // you, and two neighbours' phones
  const COLOURS = ['var(--berry)', 'var(--teal)', 'var(--mustard)'];
  const device = $derived(subject.route.hops[subject.link.from].node.id);
  const tower = $derived(subject.route.hops[subject.link.to].node.id);
  const L = $derived(LAYOUT[view.orient]);
  const cols = $derived(columns(view.time));
  const nowSlot = $derived(cols.find((c) => c.now)!.slot);
  const G = $derived(L.grid);
  // a beam glows while its phone has seats in the current slot
  const strength = $derived(Array.from({ length: USERS }, (_, u) => {
    let n = 0;
    for (let r = 0; r < ROWS; r++) if (owner(nowSlot, r) === u) n++;
    return Math.min(1, n / 2);
  }));
</script>

<!-- grid frame: frequency up, time along -->
<rect x={G.x - 8} y={G.y - 8} width={COLS * G.cw + 16} height={ROWS * G.ch + 16} rx="16" fill="var(--paper)" stroke="var(--line)" stroke-width="5" opacity="0.9" />
<clipPath id="nr-grid-{view.orient}"><rect x={G.x} y={G.y - 4} width={COLS * G.cw} height={ROWS * G.ch + 8} /></clipPath>
<g clip-path="url(#nr-grid-{view.orient})">
  {#each cols as c (c.slot)}
    {#each { length: ROWS } as _, r}
      {@const u = owner(c.slot, r)}
      <Seat x={G.x + c.dx * G.cw} y={G.y + (ROWS - 1 - r) * G.ch} w={G.cw} h={G.ch} colour={u >= 0 ? COLOURS[u] : null} now={c.now} />
    {/each}
  {/each}
</g>
<Text x={L.labels.grid.x} y={L.labels.grid.y} text={S('grid')} size={30} kind="big" />
<Text x={L.labels.time.x} y={L.labels.time.y} text={S('time')} size={24} kind="small" anchor="end" />
<g transform="rotate({L.labels.freq.rotate} {L.labels.freq.x} {L.labels.freq.y})">
  <Text x={L.labels.freq.x} y={L.labels.freq.y} text={S('frequency')} size={24} kind="small" />
</g>

{#each L.phones as p, i}
  <Beam d={beamPath(L.source, p, 40 + 10 * strength[i])} from={L.source} to={p} colour={COLOURS[i]} strength={strength[i]} time={view.time + i * 0.37} />
{/each}
<Node id={tower} x={L.tower.x} y={L.tower.y} size={L.tower.size} />
{#each L.phones as p, i}
  <Node id={device} x={p.x} y={p.y} size={p.size} focused={i === 0} />
  <circle cx={p.x + p.size * 0.36} cy={p.y - p.size * 0.4} r="14" fill={COLOURS[i]} stroke="var(--line)" stroke-width="4" />
{/each}
<Text x={L.labels.you.x} y={L.labels.you.y} text={S('you')} size={28} kind="node" />
<Text x={L.labels.beams.x} y={L.labels.beams.y} text={S('beams')} size={30} kind="big" colour={COLOURS[0]} />
<TagAt x={L.tags.tower.x} y={L.tags.tower.y} text={S('tag.beams')} size={24} />
<TagAt x={L.tags.grid.x} y={L.tags.grid.y} text={S('tag.grid')} size={24} />
