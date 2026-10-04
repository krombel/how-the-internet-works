<svelte:options namespace="svg" />
<script lang="ts">
  // Inside the server that sends you the thing: today a video cache server (Cache), in 1995 (#59) a beige tower web
  // server with one disk (Tower). Chosen by the node drawn at the hop, so the dive keeps its id across eras.
  import type { NodeSubject } from '$core/api';
  import { modeOf } from './server';
  import Cache from './Cache.svelte';
  import Tower from './Tower.svelte';

  let { subject, time }: { subject: NodeSubject; time: number } = $props();
</script>

{#if modeOf(subject.hop.node.id) === 'tower'}
  <Tower {subject} {time} />
{:else}
  <Cache {subject} {time} />
{/if}
