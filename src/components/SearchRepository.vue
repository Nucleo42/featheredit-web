<!-- SearchRepository.vue -->
<template>
  <div>
    <h2>Lightweight Online Editor</h2>
    <div class="input-group">
      <input v-model="owner" placeholder="GitHub Owner" />
      <input v-model="repo" placeholder="Repository" />
      <input v-model="token" type="password" placeholder="GitHub Token (optional)" />
      <button @click="$emit('load-repo', { owner, repo, token })">Load Repository</button>
    </div>
    <label>
      <input type="checkbox" v-model="saveSettings" /> Save settings
    </label>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const owner = ref(localStorage.getItem("githubOwner") || "");
const repo = ref(localStorage.getItem("githubRepo") || "");
const token = ref(localStorage.getItem("githubToken") || "");
const saveSettings = ref(true);
</script>
