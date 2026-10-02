<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside a fibre link: light bouncing along a glass core, told by where the thread runs (light.ts, modeOf):
  // the street's shared access fibre, a building's own thread (both ways), a metro thread (or a cross-connect) carrying
  // a few colours, a long-haul one crossing the country, or a cable on the sea floor.
  import type { LinkSubject } from '$core/api';
  import { modeOf } from './light';
  import Access from './Access.svelte';
  import Building from './Building.svelte';
  import Metro from './Metro.svelte';
  import LongHaul from './LongHaul.svelte';
  import Submarine from './Submarine.svelte';
  let { subject }: { subject: LinkSubject } = $props();
  const mode = $derived(modeOf(subject.link.tech.id));
</script>

{#if mode === 'access'}<Access />{:else if mode === 'building'}<Building />{:else if mode === 'long-haul'}<LongHaul {subject} />{:else if mode === 'submarine'}<Submarine {subject} />{:else}<Metro tech={subject.link.tech.id} />{/if}
