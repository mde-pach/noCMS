<script>
  let { start = 0 } = $props();
  let n = $state(start);
</script>
<button id="sveltebtn" onclick={() => n++}>svelte: {n}</button>
