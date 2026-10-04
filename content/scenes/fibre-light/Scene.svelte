<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside a fibre link: light bouncing along a glass core, told by where the thread runs (light.ts, modeOf):
  // the street's shared access fibre, a building's own thread (both ways), a metro thread (or a cross-connect) carrying
  // a few colours (one, in a data centre in 2010), a long-haul one crossing the country, or a cable on the sea floor.
  import type { LinkSubject } from '$core/api';
  import { modeOf, oneColour } from './light';
  import Access from './Access.svelte';
  import Building from './Building.svelte';
  import Metro from './Metro.svelte';
  import LongHaul from './LongHaul.svelte';
  import Submarine from './Submarine.svelte';
  let { subject, time }: { subject: LinkSubject; time: number } = $props();
  const mode = $derived(modeOf(subject.link.tech.id));
</script>

{#if mode === 'access'}<Access {time} />{:else if mode === 'building'}<Building {time} />{:else if mode === 'long-haul'}<LongHaul {subject} {time} />{:else if mode === 'submarine'}<Submarine {subject} {time} />{:else}<Metro {time} tech={subject.link.tech.id} one={oneColour(subject.link.tech.id, subject.route.era)} />{/if}
