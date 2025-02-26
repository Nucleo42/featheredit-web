import axios from "axios";
import { owner, repo, token } from "./useRepository";
import { modifiedFiles, error } from "./useFileEditor";

export const commitChanges = async () => {
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
    const branch = "main"; // Seleciona a Branch

    // Carrega o ultimo commit
    const repoUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/refs/heads/${branch}`;
    const headers = { Accept: "application/vnd.github.v3+json", Authorization: `token ${token.value}` };

    const { data: refData } = await axios.get(repoUrl, { headers });
    const latestCommitSha = refData.object.sha;

    const commitUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/commits/${latestCommitSha}`;
    const { data: commitData } = await axios.get(commitUrl, { headers });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs
    const fileBlobs = await Promise.all(
      Object.entries(modifiedFiles.value).map(async ([path, content]) => {
        const blobUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/blobs`;
        const { data: blobData } = await axios.post(blobUrl, { content: btoa(content), encoding: "base64" }, { headers });
        return { path, mode: "100644", type: "blob", sha: blobData.sha };
      })
    );

    // Cria tree
    const treeUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/trees`;
    const { data: treeData } = await axios.post(treeUrl, { base_tree: baseTreeSha, tree: fileBlobs }, { headers });

    // Cria commit
    const newCommitUrl = `https://api.github.com/repos/${owner.value}/${repo.value}/git/commits`;
    const { data: newCommitData } = await axios.post(newCommitUrl, { message: commitMessage, tree: treeData.sha, parents: [latestCommitSha] }, { headers });

    // Atualiza branch
    await axios.patch(repoUrl, { sha: newCommitData.sha }, { headers });

    alert("✅ Changes committed to GitHub!");
    modifiedFiles.value = {};

  } catch (err) {
    error.value = `❌ Error committing changes`;
  }
};
