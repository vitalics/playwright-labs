<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  step?: number;
}>();

const count = ref(0);
</script>

<template>
  <div class="counter">
    <button @click="count -= props.step ?? 1">-</button>
    <span>{{ count }}</span>
    <button @click="count += props.step ?? 1">+</button>
  </div>
</template>
