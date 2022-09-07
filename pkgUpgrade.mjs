#!/usr/bin/env zx
import "zx/globals";

import {
  checkGithubAuth,
  useNvm,
  prepareBranch,
  updatePackage,
  pushUpdates,
  createPR,
} from "./utils.mjs";

const config = {
  appName: "owners-reports",
  depName: "@guestyci/coverager",
  depVersion: "1.0.21-alpha.16",
  onAfterPR: () => $`yarn deployci --testOnly --cluster=staging8`,
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
