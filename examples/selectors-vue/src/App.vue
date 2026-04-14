<script setup lang="ts">
import { provide } from "vue";
import Button from "./components/Button.vue";
import Counter from "./components/Counter.vue";
import OptionsCounter from "./components/OptionsCounter.vue";
import UserCard from "./components/UserCard.vue";
import ThemedButton from "./components/ThemedButton.vue";

// Provide theme context consumed by ThemedButton via inject
provide("theme", "dark");
</script>

<template>
  <div>
    <Button label="Submit" variant="primary" :disabled="false" />
    <Button label="Cancel" variant="secondary" :disabled="false" />
    <Button label="Delete" variant="danger" :disabled="true" />

    <Counter :step="1" />
    <Counter :step="5" />

    <OptionsCounter :step="1" />

    <UserCard :user="{ name: 'Alice', role: 'admin' }" />
    <UserCard :user="{ name: 'Bob', role: 'user' }" />

    <ThemedButton label="Themed" />
  </div>
</template>
