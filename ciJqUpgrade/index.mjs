#!/usr/bin/env zx
import "zx/globals";

import {
  checkGithubAuth,
  useNvm,
  prepareBranch,
  pushUpdates,
  goToApp,
  checkoutMaster,
} from "../utils.mjs";

import { upgradeJqOrb, createPR } from "./main.mjs";

const config = {
  appName: "reservation-page",
  branchName: "cypress-upgrade-v13",
  onBeforePush: () => $`yarn`,
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

    checkoutMaster();

    echo`
    ========================================================
    App: ${chalk.cyan(appName)}
    Status: ${chalk.green("PR created")}
    URL: ${chalk.cyan(prURL)}
    ========================================================`;
  } catch (error) {
    console.error(error);
  }
}
