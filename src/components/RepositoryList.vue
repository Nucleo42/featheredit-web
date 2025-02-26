<!-- RepositoryList.vue -->
<template>
    <div>
        <h3 v-if="currentPath">📂 {{ currentPath || "Root" }}</h3>
        <button v-if="currentPath" @click="$emit('go-back')">⬅️ Back</button>
        <div v-if="files.length">
            <h3>Contents:</h3>
            <div v-for="file in files" :key="file.path">
                <button v-if="file.type === 'dir'" @click="$emit('fetch-files', file.path)">📁 {{ file.name }}</button>
                <button v-else @click="$emit('fetch-file', file.path)">📄 {{ file.name }}</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps(['files', 'currentPath']);
</script>
