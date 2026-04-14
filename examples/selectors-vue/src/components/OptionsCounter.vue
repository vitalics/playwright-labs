<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "OptionsCounter",
  props: {
    step: {
      type: Number,
      default: 1,
    },
  },
  data() {
    return {
      count: 0,
    };
  },
});
</script>

<template>
  <div class="options-counter">
    <button @click="count -= step">-</button>
    <span>{{ count }}</span>
    <button @click="count += step">+</button>
  </div>
</template>
