<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import axios from "axios";

// State variables
const owner = ref(localStorage.getItem("githubOwner") || "");
const repo = ref(localStorage.getItem("githubRepo") || "");
const token = ref(localStorage.getItem("githubToken") || "");
const saveSettings = ref(true);
const files = ref<any[]>([]);
const fileContent = ref("");
const filePath = ref("");
const editedContent = ref("");
const error = ref("");
const currentPath = ref("");
const diffMode = ref(false); // Toggle for diff mode

// Fetch repository files
const fetchFiles = async (path = "") => {
  error.value = "";
  files.value = [];
  fileContent.value = "";
  filePath.value = "";
  editedContent.value = "";

  if (!owner.value || !repo.value || !token.value) {
    error.value = "Please enter the GitHub owner, repository, or token!";
    return;
  }

  const url = `https://api.github.com/repos/${owner.value}/${repo.value}/contents/${path}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token.value) headers["Authorization"] = `token ${token.value}`;

  try {
    const response = await axios.get(url, { headers });
    if (Array.isArray(response.data)) {
      files.value = response.data;
      currentPath.value = path;

      if (saveSettings.value) {
        localStorage.setItem("githubOwner", owner.value);
        localStorage.setItem("githubRepo", repo.value);
        localStorage.setItem("githubToken", token.value);
      }
    } else {
      error.value = "Failed to fetch files!";
    }
  } catch {
    error.value = "Error fetching files!";
  }
};

// Fetch file content
const fetchFile = async (path: string) => {
  error.value = "";
  fileContent.value = "";
  filePath.value = path;
  editedContent.value = localStorage.getItem(`localEdit_${path}`) || ""; // Load local edits

  const url = `https://api.github.com/repos/${owner.value}/${repo.value}/contents/${path}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token.value) headers["Authorization"] = `token ${token.value}`;

  try {
    const response = await axios.get(url, { headers });
    if (response.data.content) {
      fileContent.value = atob(response.data.content);
      if (!editedContent.value) {
        editedContent.value = fileContent.value; // Load file if no local edits exist
      }
    } else {
      error.value = "File not found or error fetching file!";
    }
  } catch {
    error.value = "Error fetching file!";
  }
};

const modifiedFiles = ref<Record<string, string>>({}); // Store file path -> content

const saveLocally = () => {
  if (filePath.value) {
    localStorage.setItem(`localEdit_${filePath.value}`, editedContent.value);
    modifiedFiles.value[filePath.value] = editedContent.value; // Store modified file
    alert(`Changes saved locally for ${filePath.value}!`);
  }
};


// Reload local saved version
const loadLocalVersion = () => {
  if (filePath.value) {
    editedContent.value = localStorage.getItem(`localEdit_${filePath.value}`) || "";
  }
};

// Discard local changes and revert to GitHub version
const discardLocalVersion = () => {
  if (filePath.value) {
    localStorage.removeItem(`localEdit_${filePath.value}`);
    editedContent.value = fileContent.value; // Reset to original content
    alert("Local changes discarded!");
  }
};

// Compare GitHub version with local version
const getDiffLines = computed(() => {
  const original = fileContent.value.split("\n");
  const edited = editedContent.value.split("\n");

  const diffLines = edited.map((line, index) => {
    if (index >= original.length) {
      return { text: line, type: "added" }; // New line added
    } else if (line !== original[index]) {
      return { text: line, type: "changed" }; // Modified line
    } else {
      return { text: line, type: "unchanged" }; // No change
    }
  });

  // Handle deleted lines
  if (original.length > edited.length) {
    for (let i = edited.length; i < original.length; i++) {
      diffLines.push({ text: original[i], type: "removed" });
    }
  }

  return diffLines;
});

// Navigate back
const goBack = () => {
  if (!currentPath.value) return;
  const newPath = currentPath.value.split("/").slice(0, -1).join("/");
  fetchFiles(newPath);
};

// Auto-fetch settings on load
onMounted(() => {
  if (owner.value && repo.value && token.value) {
    fetchFiles();
  }
});

// Watch for file selection changes and reset errors
watch(filePath, () => {
  error.value = "";
});

const commitChanges = async () => {
  if (!owner.value || !repo.value || !token.value) {
    error.value = "Missing GitHub credentials!";
    return;
  }

  if (Object.keys(modifiedFiles.value).length === 0) {
    error.value = "No changes to commit!";
    return;
  }

  try {
    const commitMessage = prompt("Enter commit message:") || "Updated files";
    const branch = "main"; // Change this if needed

    // Step 1: Get latest commit SHA and tree SHA
    const repoUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/refs/heads/${branch}`;
    const headers = {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token.value}`,
    };

    const { data: refData } = await axios.get(repoUrl, { headers });
    const latestCommitSha = refData.object.sha;

    const commitUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/commits/${latestCommitSha}`;
    const { data: commitData } = await axios.get(commitUrl, { headers });
    const baseTreeSha = commitData.tree.sha;

    // Step 2: Create blobs for each modified file
    const fileBlobs = await Promise.all(
      Object.entries(modifiedFiles.value).map(async ([path, content]) => {
        const blobUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/blobs`;
        const { data: blobData } = await axios.post(blobUrl, { content: btoa(content), encoding: "base64" }, { headers });
        return { path, mode: "100644", type: "blob", sha: blobData.sha };
      })
    );

    // Step 3: Create a new tree with the modified files
    const treeUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/trees`;
    const { data: treeData } = await axios.post(treeUrl, { base_tree: baseTreeSha, tree: fileBlobs }, { headers });

    // Step 4: Create a new commit
    const newCommitUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/commits`;
    const { data: newCommitData } = await axios.post(newCommitUrl, { message: commitMessage, tree: treeData.sha, parents: [latestCommitSha] }, { headers });

    // Step 5: Update the branch reference
    await axios.patch(repoUrl, { sha: newCommitData.sha }, { headers });

    alert("✅ Changes committed to GitHub!");

    // Step 6: Clear only the file changes in localStorage
    Object.keys(modifiedFiles.value).forEach((filePath) => {
      localStorage.removeItem(`localEdit_${filePath}`); // Clear only the modified files from localStorage
    });
    modifiedFiles.value = {}; // Clear the modified files from the in-memory state

    // Step 7: Fetch the updated repository files
    fetchFiles(); // Reload the repository files

  } catch (err) {
    error.value = `❌ Error committing changes`;
  }
};



</script>

<template>
  <div class="container">
    <h2>Lightweigth online editor</h2>

    <div class="input-group">
      <input v-model="owner" placeholder="GitHub Owner" />
      <input v-model="repo" placeholder="Repository" />
      <input v-model="token" type="password" placeholder="GitHub Token (optional)" />
      <button @click="fetchFiles()">Load Repository</button>
    </div>

    <label>
      <input type="checkbox" v-model="saveSettings" /> Save settings
    </label>



    <h3 v-if="currentPath">📂 {{ currentPath || "Root" }}</h3>

    <button v-if="currentPath" @click="goBack()">⬅️ Back</button>

    <div v-if="files.length">
      <h3>Contents:</h3>
      <div v-for="file in files" :key="file.path">
        <button v-if="file.type === 'dir'" @click="fetchFiles(file.path)">📁 {{ file.name }}</button>
        <button v-else @click="fetchFile(file.path)">📄 {{ file.name }}</button>
      </div>
    </div>

    <div v-if="fileContent">
      <h3>📄 File Content:</h3>
      <button @click="diffMode = !diffMode">
        {{ diffMode ? "✏️ Edit Mode" : "🔍 Compare Mode" }}
      </button>

      <div v-if="Object.keys(modifiedFiles).length">
        <h3>📝 Modified Files:</h3>
        <ul>
          <li v-for="(path) in modifiedFiles" :key="path">
            📄 {{ path }}
          </li>
        </ul>
        <button @click="commitChanges">🚀 Commit to GitHub</button>
      </div>

      <div v-if="diffMode">
        <h3>🔍 Differences:</h3>
        <pre v-for="(line, index) in getDiffLines" :key="index" :class="line.type">
          <span v-if="line.type === 'added'"></span>
          <span v-else-if="line.type === 'removed'"></span>
          <span v-else-if="line.type === 'changed'"></span>
          {{ line.text }}
        </pre>
      </div>

      <textarea v-else v-model="editedContent" rows="10" cols="50"></textarea>
      <br />
      <button v-if="!diffMode" @click="saveLocally">💾 Save Locally</button>
      <button v-if="!diffMode" @click="loadLocalVersion">🔄 Load Local Version</button>
      <button v-if="!diffMode" @click="discardLocalVersion">🗑️ Discard Local Changes</button>

    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style>
.container {
  max-width: 600px;
  margin: auto;
  text-align: center;
}

.input-group input {
  display: block;
  margin: 5px auto;
  padding: 8px;
  width: 90%;
}

pre {
  margin: 0;
  padding: 0;
  line-height: 0.5;
  font-size: 14px;
  white-space: pre-wrap;
}

button {
  margin: 5px;
  padding: 8px 12px;
}

textarea {
  width: 100%;
  padding: 8px;
}

.error {
  color: red;
}

.added {
  color: green;
}

.removed {
  color: red;
  text-decoration: line-through;
}

.changed {
  color: orange;
}
</style>
