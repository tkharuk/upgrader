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

/**
 *
 * @param {{
 *  appName: string,
 *  depName: string,
 *  depVersion?: string,
 *  branchName: string,
 *  main: () => Promise<any>,
 *  onBeforePush?: () => Promise<any>,
 *  createPR: () => Promise<any>,
 *  onAfterPR?: () => Promise<any>,
 * }} configs
 */
export async function upgradeRepository(configs) {
  const {
    appName,
    depName,
    branchName,
    main,
    createPR,
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
    await prepareBranch({ branchName, depName });

    await main(); // main upgrade

    await onBeforePush();
    await pushUpdates({
      branchName,
      commitMessage: "chore: update dependencies",
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
