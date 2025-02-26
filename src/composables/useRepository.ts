import { ref } from "vue";
import axios from "axios";

// State
export const owner = ref(localStorage.getItem("githubOwner") || "");
export const repo = ref(localStorage.getItem("githubRepo") || "");
export const token = ref(localStorage.getItem("githubToken") || "");
export const saveSettings = ref(true);
export const files = ref<any[]>([]);
export const error = ref("");
export const currentPath = ref("");

interface RepositoryInfo {
  owner: string;
  repo: string;
  token?: string;
}

export const loadRepo = ({ owner: newOwner, repo: newRepo, token: newToken }: RepositoryInfo) => {
  owner.value = newOwner;
  repo.value = newRepo;
  token.value = newToken || ""; // Garante que o token seja sempre uma string

  if (saveSettings.value) {
    localStorage.setItem("githubOwner", newOwner);
    localStorage.setItem("githubRepo", newRepo);
    localStorage.setItem("githubToken", newToken || "");
  }

  fetchFiles(""); // Carregar arquivos do repositório
};

// Carrega arquivos do repositório
export const fetchFiles = async (path = "") => {
  console.log(0)
  error.value = "";
  files.value = [];

  if (!owner.value || !repo.value) {
    error.value = "Please enter the GitHub owner and repository!";
    return;
  }

  const url = `https://api.github.com/repos/${owner.value}/${repo.value}/contents/${path}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  
  if (token.value) headers["Authorization"] = `token ${token.value}`;

  try {
      const response = await axios.get(url, { headers });
      console.log("GitHub API Response:", response);
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
  } catch (err: unknown) {
  console.error("Erro ao buscar arquivos:", err);

  if (axios.isAxiosError(err)) {
    error.value = `Erro ao buscar arquivos: ${err.response?.status} - ${err.response?.statusText}`;
  } else if (err instanceof Error) {
    error.value = `Erro desconhecido: ${err.message}`;
  } else {
    error.value = "Erro inesperado ao buscar arquivos!";
  }
}
};

// Voltar
export const goBack = () => {
  if (!currentPath.value) return;
  const newPath = currentPath.value.split("/").slice(0, -1).join("/");
  fetchFiles(newPath);
};
