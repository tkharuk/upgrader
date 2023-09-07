#!/usr/bin/env zx
import "zx/globals";

/**
 * @param {{
 * depName: string,
 * depVersion: string,
 * }} configs
 */
export async function updatePackage({ depName, depVersion }) {
  await $`yarn upgrade ${depName.trim()}@${depVersion.trim()}`;
}

/**
 * @param {{
 * branchName: string,
 * depName?: string,
 * }} configs
 */
export async function prepareBranch({ branchName, depName = "" }) {
  if (!branchName && !depName) {
    throw new Error(
      `branchName and depName are missing. Please provide at least one of them`
    );
  }

  echo`
  ========================================================
  Preparing branch: ${chalk.cyan(branchName)}
  ========================================================`;

  // stash changes if any
  const gitChanges = await $`git status --porcelain`;
  const isGitDirty = !!gitChanges.toString().trim().length;

  if (isGitDirty) {
    await $`git stash save "before ${depName}" upgrade`;
    // TODO: trace stashes
  }

  // create new branch for upgrade
  await $`git checkout master`;
  await $`git pull`;
  await $`git branch ${branchName}`;
  await $`git checkout ${branchName}`;
}

/**
 *
 * @param {{
 * branchName: string,
 * commitMessage?: string,
 * depName?: string,
 * depVersion?: string,
 * }} configs
 */
export async function pushUpdates({
  branchName,
  commitMessage = "",
  depName = "",
  depVersion = "",
}) {
  const depCommitMessage = `chore: update ${depName} to ${depVersion}`;

  await $`git add .`;
  await $`git commit -am ${commitMessage || depCommitMessage}`;
  await $`git push -u --porcelain origin ${branchName}`;
  await $`git status`;
}

/**
 * creates draft PR
 * @param {{ prTitle: string, prBody: string, }} configs
 */
export async function createGhPR({ prTitle, prBody }) {
  return await $`gh pr create --draft --title ${prTitle} --body ${prBody}`;
}

export async function getPRTemplate() {
  const prTemplatePath = ".github/pull_request_template.md";

  try {
    const withPRTemplate = await fs.pathExists(prTemplatePath);
    if (withPRTemplate) {
      const prTemplate = await fs.readFile(prTemplatePath);
      const prTemplateContent = prTemplate.toString();
      return prTemplateContent;
    } else {
      echo`PR template is not found at ${prTemplatePath}`;
      return "";
    }
  } catch (error) {
    echo`Wasn't able to read PR template`;
    return "";
  }
}

export async function useNvm() {
  try {
    // use necesarry node version
    $.prefix += "export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh; ";
    await $`nvm use`;
  } catch (error) {
    echo`Wasn't able to switch node version with nvm`;
  } finally {
    await $`node -v`;
  }
}

export async function checkGithubAuth() {
  $`gh auth status`;
}

/**
 * changes directory to guesty app
 * @param {string} appName
 */
export async function goToApp(appName) {
  const appPath = `../${appName}`.replace("guestyorg/", "");

  cd(appPath);
}
