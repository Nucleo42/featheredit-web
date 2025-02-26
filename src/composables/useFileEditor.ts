import { ref, computed } from "vue";
import axios from "axios";
import { owner, repo, token } from "./useRepository";

// File States
export const fileContent = ref("");
export const filePath = ref("");
export const editedContent = ref("");
export const modifiedFiles = ref<Record<string, string>>({});
export const diffMode = ref(false);
export const error = ref("");

// Fetch file content
export const fetchFile = async (path: string) => {
  error.value = "";
  fileContent.value = "";
  filePath.value = path;
  editedContent.value = localStorage.getItem(`localEdit_${path}`) || "";

  const url = `https://api.github.com/repos/${owner.value}/${repo.value}/contents/${path}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  
  if (token.value) headers["Authorization"] = `token ${token.value}`;

  try {
    const response = await axios.get(url, { headers });
    if (response.data.content) {
      fileContent.value = atob(response.data.content);
      if (!editedContent.value) {
        editedContent.value = fileContent.value;
      }
    } else {
      error.value = "File not found or error fetching file!";
    }
  } catch {
    error.value = "Error fetching file! The file may be private or not exist.";
  }
};

// Salva localmente
export const saveLocally = () => {
  if (filePath.value) {
    localStorage.setItem(`localEdit_${filePath.value}`, editedContent.value);
    modifiedFiles.value[filePath.value] = editedContent.value;
    alert(`Changes saved locally for ${filePath.value}!`);
  }
};

// Carrega a versão salva localmente
export const loadLocalVersion = () => {
  if (filePath.value) {
    editedContent.value = localStorage.getItem(`localEdit_${filePath.value}`) || "";
  }
};

// Deleta a versão salva localmente
export const discardLocalVersion = () => {
  if (filePath.value) {
    localStorage.removeItem(`localEdit_${filePath.value}`);
    editedContent.value = fileContent.value;
    alert("Local changes discarded!");
  }
};

// Calcula diferenças
export const getDiffLines = computed(() => {
  const original = fileContent.value.split("\n");
  const edited = editedContent.value.split("\n");

  return edited.map((line, index) => {
    if (index >= original.length) return { text: line, type: "added" };
    if (line !== original[index]) return { text: line, type: "changed" };
    return { text: line, type: "unchanged" };
  }).concat(original.slice(edited.length).map(line => ({ text: line, type: "removed" })));
});
