<script lang="ts">
  // The one polite status line screen readers hear (announce.svelte.ts); visually hidden.
  import { announcer } from './announce.svelte';
</script>

<div class="sr" role="status">{announcer.text}</div>
