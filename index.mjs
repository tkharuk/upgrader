#!/usr/bin/env zx
import "zx/globals";

const config = {
  appName: "owners-reports",
  depName: "@guestyci/coverager",
  depVersion: "1.0.21-alpha.16",
  onAfterPR: () => $`yarn deployci --testOnly --cluster=staging8`,
};

const url = await upgradeRepository(config);
console.log(url);

/**
 *
 * @param {{
 *  appName: string,
 *  depName: string,
 *  depVersion: string,
 *  onBeforePush?: () => Promise<any>,
 *  onAfterPR?: () => Promise<any>,
 * }} configs
 * @returns {Promise<string>}
 */
async function upgradeRepository(configs) {
  const {
    appName,
    depName,
    depVersion,
    onBeforePush = async () => {},
    onAfterPR = async () => {},
  } = configs;

  const appPath = `../${appName}`;
  const branchName = `feature/update-${depName}`
    .replace("@", "")
    .replace("guestyci/", "guestyci-");

  try {
    cd(appPath);

    const pkg = await fs.readJSON("./package.json");
    const currentDepVersion =
      pkg.devDependencies[depName] || pkg.dependencies[depName];

    echo`
========================================================
App: ${chalk.cyan(appName)}

Upgrading: ${chalk.cyan(depName)}
  from: ${chalk.red(currentDepVersion)}
  to ${chalk.cyan(depVersion)}

========================================================`;

    // TODO: or higher
    if (currentDepVersion === depVersion) {
      echo`
========================================================
App: ${chalk.cyan(appName)}

Status: ${chalk.gray("already upgraded")}
  current version: ${chalk.green(currentDepVersion)}

========================================================`;
      process.exit(0);
    }

    // NOT UPDATED
    await checkGithubAuth();

    await useNvm();

    await prepareBranch({ branchName, depName });

    await updatePackage({ depName, depVersion });

    await onBeforePush();

    await pushUpdates({ branchName, depName, depVersion });

    const prURL = await createPR({ depName, depVersion });

    await onAfterPR();

    echo`
========================================================
App: ${chalk.cyan(appName)}

Status: ${chalk.green("PR created")}
  URL: ${chalk.cyan(prURL)}

========================================================`;

    return prURL.toString();
  } catch (error) {
    console.error(error);
  }
}

async function updatePackage({ depName, depVersion }) {
  await $`yarn upgrade ${depName}@${depVersion}`;
  // await fs.writeFile("./README.md", `${depName}@${depVersion}`); // TODO: remove
}

async function prepareBranch({ branchName, depName }) {
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

async function pushUpdates({ branchName, depName, depVersion }) {
  const commitMessage = `chore: update ${depName} to ${depVersion}`;

  await $`git add .`;
  await $`git commit -am ${commitMessage}`;
  await $`git push -u --porcelain origin ${branchName}`;
  await $`git status`;
}

async function createPR({ depName, depVersion }) {
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

async function useNvm() {
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

async function checkGithubAuth() {
  $`gh auth status`;
}
