<svelte:options namespace="svg" />
<script lang="ts">
  // Places a node's own art (content/nodes/<id>/art/Device.svelte) and gives it the storybook look: chunky brown
  // outlines, paper colours, a blinking face and a gentle bob in dives. The node art only uses the shared classes.
  import type { DeviceProps } from '$core/api';
  let { id, x, y, size, time, Art, face, pending, context, focused, kbd }: DeviceProps = $props();
  const blink = $derived(Math.sin(time * 3 + id.length * 0.7) > 0.93);
  const bob = $derived(context === 'dive' ? Math.sin(time * 1.5 + id.length) * 3 : 0);
  // art that lands after its placeholder showed (#91) fades in; art there from the start just shows
  let late = $state(false);
  $effect.pre(() => { if (pending) late = true; });
</script>

<g class="storybook-device dev-{id}" class:focused transform="translate({x - size / 2} {y - size / 2 + bob}) scale({size / 200})">
  {#if kbd}<g class="kbd"><circle class="kbd-gap" cx="100" cy="100" r="108" /><circle class="kbd-ink" cx="100" cy="100" r="108" /></g>{/if}
  {#if focused}<circle class="focus" cx="100" cy="100" r="98" />{/if}
  {#if Art}<g class:late><Art {time} />{#if face}{@render faceAt(face)}{/if}</g>
  {:else if pending}<rect class="pending" x="58" y="66" width="84" height="76" rx="26" />
  {:else}<rect class="body peach" x="34" y="44" width="132" height="112" rx="26" />{@render faceAt([100, 104])}{/if}
</g>

{#snippet faceAt(f: [number, number])}
  <g class="face" transform="translate({f[0]} {f[1]})">
    <ellipse class="eye" cx="-18" cy="-7" rx="5.5" ry={blink ? 1.4 : 6} />
    <ellipse class="eye" cx="18" cy="-7" rx="5.5" ry={blink ? 1.4 : 6} />
    <path class="smile" d="M-15 12 Q0 24 15 12" />
  </g>
{/snippet}

<style>
  /* the keyboard's ring, as the engine draws focus (this theme keeps its colours: ink over a gap in the page colour), outside the stop's own glow */
  .kbd circle { fill: none; }
  .kbd-gap { stroke: var(--bg); stroke-width: 18; }
  .kbd-ink { stroke: var(--ink); stroke-width: 7; }
  .focus { fill: var(--paper); stroke: var(--focus-ring); stroke-width: 7; opacity: .8; }
  .storybook-device :global(.body), .storybook-device :global(.screen) { stroke: var(--line); stroke-width: 6; stroke-linejoin: round; }
  .storybook-device :global(.body) { fill: var(--tan); }
  .storybook-device :global(.peach) { fill: var(--peach); }
  .storybook-device :global(.orange) { fill: var(--orange-soft); }
  .storybook-device :global(.teal) { fill: var(--teal); }
  .storybook-device :global(.berry) { fill: var(--berry); }
  .storybook-device :global(.cloud) { fill: var(--paper); }
  .storybook-device :global(.screen) { fill: var(--paper-2); }
  .storybook-device :global(.roof), .storybook-device :global(.line), .storybook-device :global(.wave), .smile {
    fill: none; stroke: var(--line); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round;
  }
  .storybook-device :global(.thin) { stroke-width: 4; opacity: .55; }
  .storybook-device :global(.wave) { stroke-width: 6; }
  .storybook-device :global(.accent), .storybook-device :global(.button) { fill: var(--sun); stroke: var(--line); stroke-width: 4; }
  /* at night the little lights (a device's accent dots) glow: a wide soft stroke under the fill, no filters */
  :global(:root[data-mode='night']) .storybook-device :global(.accent) {
    stroke: color-mix(in srgb, var(--lamp) 38%, transparent); stroke-width: 12; paint-order: stroke;
  }
  .storybook-device :global(.hi) { fill: var(--paper); opacity: .55; }
  .eye { fill: var(--line); }
  /* while the art loads (#91): a soft body-coloured pebble where the device will be, no outline, no face */
  .pending { fill: var(--tan-pale); opacity: .6; }
  .late { animation: arrive .25s ease-out; }
  @keyframes arrive { from { opacity: 0; } }
</style>
