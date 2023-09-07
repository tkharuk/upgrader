#!/usr/bin/env zx
import "zx/globals";

import {
  checkGithubAuth,
  useNvm,
  prepareBranch,
  pushUpdates,
  goToApp,
} from "../utils.mjs";

import { upgradeJqOrb, createPR } from "./main.mjs";

const config = {
  appName: "owners-reports",
  branchName: "",
  onAfterPR: () => $`yarn deployci --testOnly --cluster=production`,
};

// MAIN
upgradeRepository(config);

/**
 *
 * @param {{
 *  appName: string,
 *  branchName: string,
 *  onBeforePush?: () => Promise<any>,
 *  onAfterPR?: () => Promise<any>,
 * }} configs
 * @returns {Promise<string>}
 */
async function upgradeRepository(configs) {
  const {
    appName,
    branchName,
    onBeforePush = async () => {},
    onAfterPR = async () => {},
  } = configs;

  echo`
  ========================================================
  App: ${chalk.cyan(appName)}
  ========================================================`;

  try {
    await goToApp(appName);

    await checkGithubAuth();

    await useNvm();

    await prepareBranch({ branchName });

    await upgradeJqOrb(); // main upgrade

    await onBeforePush();

    await pushUpdates({
      branchName,
      commitMessage: "chore: updatre jq orb",
    });

    const prURL = await createPR();

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
