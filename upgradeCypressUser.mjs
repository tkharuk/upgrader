#!/usr/bin/env zx
import "zx/globals";

import {
  checkGithubAuth,
  useNvm,
  getPRTemplate,
  prepareBranch,
  pushUpdates,
} from "./utils.mjs";

const config = {
  appName: "owners-reports",
  branchName: "",
  onAfterPR: () => $`yarn deployci --testOnly --cluster=staging8`,
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

  const appPath = `../${appName}`.replace("guestyorg/", "");

  try {
    cd(appPath);

    echo`
========================================================
App: ${chalk.cyan(appName)}
========================================================`;

    await checkGithubAuth();

    await useNvm();

    await prepareBranch({ branchName });

    await upgradeCypressUser(); // main upgrade

    await onBeforePush();

    await pushUpdates({
      branchName,
      commitMessage: "chore: update staging8 e2e user",
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

async function upgradeCypressUser() {
  const cypressConfigPath = "./cypress/config/staging8.json";
  const cypressConfig = await fs.readJSON(cypressConfigPath);

  if (cypressConfig.env.defaultUser === "qa") {
    delete cypressConfig.env.users.qa.password;
    delete cypressConfig.env.users.qa.apiKey;
  } else {
    delete cypressConfig.env.users.qa;
  }
  await fs.writeJSON(cypressConfigPath, cypressConfig, { spaces: 2 });

  echo`
    ========================================================
    Cypress config updated
    ${JSON.stringify(cypressConfig, null, 2)}
    ========================================================`;
}

async function createPR() {
  const prTemplate = await getPRTemplate();

  const prTLDR = `
### TL&DR;

- Update staging8 e2e user  \n`;

  const prBody = prTemplate
    ? prTemplate.replace(`### TL&DR;\n`, prTLDR)
    : prTLDR;

  echo`${prBody}`;

  const prTitle = `chore: update staging8 e2e user`;
  const prURL = await $`gh pr create --title ${prTitle} --body ${prBody}`;

  return prURL;
}
