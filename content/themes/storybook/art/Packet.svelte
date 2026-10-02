<svelte:options namespace="svg" />
<script lang="ts">
  import { view, type PacketProps } from '$core/api';
  let { dir, pose, colour, time, followed, mark: Mark }: PacketProps = $props();
  const facing = $derived(Math.cos(pose.angle) < 0 ? -1 : 1);
  const blink = $derived(Math.sin(time * 4.2 + pose.seg) > 0.94);
  // what it carries tells the way it goes by shape, not only by colour: a square parcel up (the request), a round reel
  // of film back down (the answer)
  const reel = $derived(dir === 'down');
  // by night the courier is outlined in dark ink (--face) with a pale moonlit rim, so it reads on the sky and in lit rooms
  const night = $derived(view.mode === 'night');
</script>

<g class="courier" transform="translate({pose.x} {pose.y})">
  {#if followed}<ellipse cx="0" cy="28" rx="40" ry="15" fill="var(--glow-pale)" stroke="var(--line)" stroke-width="4" opacity="0.85" />{/if}
  <g transform="scale({facing} 1)">
    {#if night}
      <g class="rim">
        <path d="M-11 20 L-22 34 M10 20 L21 34" />
        <circle r="22" />
        {#if reel}<circle cx="40" cy="-2" r="16" />
        {:else}<rect x="-2" y="-14" width="28" height="25" rx="4" transform="translate(26 -2) rotate(-8)" />{/if}
      </g>
    {/if}
    <g class="legs" stroke="var(--face)" stroke-width="6" stroke-linecap="round">
      <path d="M-11 20 L-22 34" />
      <path d="M10 20 L21 34" />
    </g>
    <circle class="body" cy="0" r="22" fill={colour} />
    <path class="highlight" d="M-12 -12 C-2 -22 13 -15 15 -4 C7 -9 -2 -10 -12 -4 Z" />
    <ellipse class="eye" cx="-8" cy="-4" rx="3.4" ry={blink ? 0.8 : 4.2} />
    <ellipse class="eye" cx="8" cy="-4" rx="3.4" ry={blink ? 0.8 : 4.2} />
    <path class="smile" d="M-7 8 Q0 14 8 8" />
    {#if reel}
      <g transform="translate(40 -2) rotate({time * 90})">
        <circle class="film" r="16" />
        {#each [0, 90, 180, 270] as a}<circle class="hole" cx="8" r="3.6" transform="rotate({a})" />{/each}
        <circle class="hole" r="2.4" />
      </g>
      {#if Mark}<g transform="translate(40 -2)"><Mark {dir} size={30} /></g>{/if}
    {:else}
      <g transform="translate(26 -2) rotate(-8)">
        <rect class="parcel" x="-2" y="-14" width="28" height="25" rx="4" />
        <path class="parcel-line" d="M12 -14 V11 M-2 -2 H26" />
        {#if Mark}<g transform="translate(12 -1.5)"><Mark {dir} size={24} /></g>{/if}
      </g>
    {/if}
  </g>
</g>

<style>
  .body, .parcel, .film { stroke: var(--face); stroke-width: 5; }
  .rim { fill: none; stroke: var(--line); stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; }
  .highlight { fill: var(--shine); opacity: .48; }
  .eye { fill: var(--face); }
  .smile { fill: none; stroke: var(--face); stroke-width: 3.4; stroke-linecap: round; }
  .parcel { fill: var(--cardboard); }
  .parcel-line { fill: none; stroke: var(--line); stroke-width: 3; stroke-linecap: round; opacity: .8; }
  .film { fill: var(--teal); }
  .hole { fill: var(--shine); }
</style>
