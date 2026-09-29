<svelte:options namespace="svg" />
<script lang="ts">
  import { Text, view, type LayerSubject } from '$core/api';
  let { subject }: { subject: LayerSubject } = $props();
</script>

<Text x={800} y={450} text={`${subject.layer} at ${subject.ctx.to.id} (${subject.ctx.role}, ${subject.open ? 'open' : 'sealed'}) ${view.orient}`} size={40} kind="big" />
