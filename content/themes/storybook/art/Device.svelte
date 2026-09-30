<svelte:options namespace="svg" />
<script lang="ts">
  // Places a node's own art (content/nodes/<id>/art/Device.svelte) and gives it the storybook look: chunky brown
  // outlines, paper colours, a blinking face and a gentle bob in dives. The node art only uses the shared classes.
  import type { DeviceProps } from '$core/api';
  let { id, x, y, size, time, Art, face, context, focused }: DeviceProps = $props();
  const blink = $derived(Math.sin(time * 3 + id.length * 0.7) > 0.93);
  const bob = $derived(context === 'dive' ? Math.sin(time * 1.5 + id.length) * 3 : 0);
</script>

<g class="storybook-device dev-{id}" class:focused transform="translate({x - size / 2} {y - size / 2 + bob}) scale({size / 200})">
  {#if focused}<circle class="focus" cx="100" cy="100" r="98" />{/if}
  {#if Art}<Art {time} />{:else}<rect class="body peach" x="34" y="44" width="132" height="112" rx="26" />{/if}
  {#if face || !Art}
    {@const f = face ?? [100, 104]}
    <g class="face" transform="translate({f[0]} {f[1]})">
      <ellipse class="eye" cx="-18" cy="-7" rx="5.5" ry={blink ? 1.4 : 6} />
      <ellipse class="eye" cx="18" cy="-7" rx="5.5" ry={blink ? 1.4 : 6} />
      <path class="smile" d="M-15 12 Q0 24 15 12" />
    </g>
  {/if}
</g>

<style>
  .focus { fill: #fff6d7; stroke: #efb159; stroke-width: 7; opacity: .8; }
  .storybook-device :global(.body), .storybook-device :global(.screen) { stroke: #6b3f2a; stroke-width: 6; stroke-linejoin: round; }
  .storybook-device :global(.body) { fill: #f6b56b; }
  .storybook-device :global(.peach) { fill: #ffd89c; }
  .storybook-device :global(.orange) { fill: #f19a55; }
  .storybook-device :global(.teal) { fill: #72b8a5; }
  .storybook-device :global(.berry) { fill: #bd6b87; }
  .storybook-device :global(.cloud) { fill: #fff7df; }
  .storybook-device :global(.screen) { fill: #fff1d1; }
  .storybook-device :global(.roof), .storybook-device :global(.line), .storybook-device :global(.wave), .smile {
    fill: none; stroke: #6b3f2a; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round;
  }
  .storybook-device :global(.thin) { stroke-width: 4; opacity: .55; }
  .storybook-device :global(.wave) { stroke-width: 6; }
  .storybook-device :global(.accent), .storybook-device :global(.button) { fill: #ffcf5d; stroke: #6b3f2a; stroke-width: 4; }
  .storybook-device :global(.hi) { fill: #fff6d7; opacity: .55; }
  .eye { fill: #6b3f2a; }
</style>
