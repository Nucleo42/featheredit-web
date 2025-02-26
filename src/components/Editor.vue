<!-- Editor.vue -->
<template>
    <div v-if="fileContent">
        <h3>📄 File Content:</h3>
        <button @click="diffMode = !diffMode">
            {{ diffMode ? "✏️ Edit Mode" : "🔍 Compare Mode" }}
        </button>
        <div v-if="diffMode">
            <h3>🔍 Differences:</h3>
            <pre v-for="(line, index) in getDiffLines" :key="index" :class="line.type">{{ line.text }}</pre>
        </div>
        <textarea v-else v-model="editedContent" rows="10" cols="50"></textarea>
        <button v-if="!diffMode" @click="$emit('save-locally', filePath, editedContent)">💾 Save Locally</button>
        <button v-if="!diffMode" @click="$emit('load-local', filePath)">🔄 Load Local Version</button>
        <button v-if="!diffMode" @click="$emit('discard-local', filePath)">🗑️ Discard Local Changes</button>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps(['fileContent', 'filePath']);
const editedContent = ref(props.fileContent);
const diffMode = ref(false);
const getDiffLines = computed(() => {
    const original = props.fileContent.split("\n");
    const edited = editedContent.value.split("\n");
    return edited.map((line, index) => ({ text: line, type: original[index] !== line ? "changed" : "unchanged" }));
});
</script>
