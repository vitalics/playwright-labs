<script setup lang="ts">
import { inject } from "vue";

defineProps<{
  label: string;
}>();

// Injected from the nearest ancestor that calls provide("theme", ...)
const theme = inject<string>("theme", "light");
</script>

<template>
  <button class="themed-btn" :class="`theme-${theme}`">
    {{ label }}
  </button>
</template>
