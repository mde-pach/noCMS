<script setup>
import { ref } from 'vue';
const props = defineProps({ start: { type: Number, default: 0 } });
const n = ref(props.start);
</script>
<template><button id="vuebtn" @click="n++">vue: {{ n }}</button></template>
