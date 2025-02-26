<script setup lang="ts">
import { fetchFiles, goBack, files, error, currentPath, loadRepo } from "./composables/useRepository";
import { fetchFile, fileContent, filePath, editedContent, saveLocally, discardLocalVersion, loadLocalVersion } from "./composables/useFileEditor";

import SearchRepository from "./components/SearchRepository.vue";
import RepositoryList from "./components/RepositoryList.vue";
import Editor from "./components/Editor.vue";

// Initial fetch

</script>

<template>
  <SearchRepository @load-repo="loadRepo" />
  <RepositoryList :files="files" :currentPath="currentPath" @fetchFiles="fetchFiles" @fetchFile="fetchFile"
    @goBack="goBack" />
  <Editor v-if="fileContent" :fileContent="fileContent" v-model:editedContent="editedContent" :filePath="filePath"
    @saveLocally="saveLocally" @loadLocalVersion="loadLocalVersion" @discardLocalVersion="discardLocalVersion" />
  <p v-if="error" class="error">{{ error }}</p>
</template>

<style>
.container {
  max-width: 600px;
  margin: auto;
  text-align: center;
}
</style>
