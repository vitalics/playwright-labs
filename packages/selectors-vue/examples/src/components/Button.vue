<script setup lang="ts">
defineProps<{
  label: string;
  variant?: string;
  disabled?: boolean;
}>();
</script>

<template>
  <button
    class="btn"
    :class="`btn-${variant ?? 'default'}`"
    :disabled="disabled"
  >
    {{ label }}
  </button>
</template>
