<script setup lang="ts">
defineProps<{
  user: {
    name: string;
    role: string;
  };
}>();
</script>

<template>
  <div class="user-card">
    <span class="user-name">{{ user.name }}</span>
    <span class="user-role">{{ user.role }}</span>
  </div>
</template>
