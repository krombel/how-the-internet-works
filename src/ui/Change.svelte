<script lang="ts">
  // A value a hop changed: drawn old → new, read as "new, was old" (the strike and the arrow aren't spoken).
  import { fill, tr } from '../state.svelte';
  let { was, now }: { was: string; now: string } = $props();
</script>

<span aria-hidden="true"><s>{was}</s><span class="to">→</span>{now}</span><span class="sr">{fill(tr('peek.was'), { was, now })}</span>
