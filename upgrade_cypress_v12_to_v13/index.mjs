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

import { upgradeCypress, createPR } from "./main.mjs";

const config = {
  appName: "business-models-page",
  branchName: "jq-orb-upgrade",
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

    await upgradeCypress(); // main upgrade

    await onBeforePush();
    await pushUpdates({
      branchName,
      commitMessage: "chore: updatre jq orb",
    });
    const prURL = await createPR();
    await onAfterPR();
    await checkoutMaster();

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
