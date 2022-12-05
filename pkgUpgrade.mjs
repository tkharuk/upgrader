#!/usr/bin/env zx
import "zx/globals";

import {
  checkGithubAuth,
  useNvm,
  prepareBranch,
  updatePackage,
  pushUpdates,
} from "./utils.mjs";

const config = {
  appName: "",
  depName: "",
  depVersion: "",
  onAfterPR: () => $`yarn deployci --testOnly --cluster=production`,
};

// MAIN
upgradeRepository(config);

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
      prBody = prBody.replaceAll(`[ ]`, `[x]`);
    }
  } catch (error) {
    echo`Wasn't able to read PR template`;
  }

  const prURL = await $`gh pr create --title ${prTitle} --body ${prBody}`;

  return prURL;
}
