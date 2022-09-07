export async function updatePackage({ depName, depVersion }) {
  await $`yarn upgrade ${depName}@${depVersion}`;
  // await fs.writeFile("./README.md", `${depName}@${depVersion}`); // TODO: remove
}

export async function prepareBranch({ branchName, depName }) {
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

export async function pushUpdates({ branchName, depName, depVersion }) {
  const commitMessage = `chore: update ${depName} to ${depVersion}`;

  await $`git add .`;
  await $`git commit -am ${commitMessage}`;
  await $`git push -u --porcelain origin ${branchName}`;
  await $`git status`;
}

export async function createPR({ depName, depVersion }) {
  const prTemplatePath = ".github/pull_request_template.md";

  // create PR with title and body
  const prTitle = `Upgrade ${depName} to ${depVersion}`;
  let prBody = `
  ### TL&DR;
  
  - Upgrade ${depName} to ${depVersion}  `;

  // read pr template and substitute description
  try {
    const withPRTemplate = await fs.pathExists(prTemplatePath);
    if (withPRTemplate) {
      const prTemplate = await fs.readFile(prTemplatePath);
      const prTemplateContent = prTemplate.toString();
      prBody = prTemplateContent.replace(`### TL&DR;\n`, prBody);
    }
  } catch (error) {
    echo`Wasn't able to read PR template`;
  }

  const prURL = await $`gh pr create --title ${prTitle} --body ${prBody}`;

  return prURL;
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
