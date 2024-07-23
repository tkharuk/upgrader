#!/usr/bin/env zx
import "zx/globals";
import { updatePackage, createGhPR, getPRBody } from "../utils.mjs";
import { upgradeRepository } from "./pkgUpgrade.mjs";

// This file defines a configuration object that specifies various properties and functions for an upgrader script.

// The `config` object contains the following properties:
// - `appName`: The name of the application, e.g. "business-models-page".
// - `depName`: The name of a dependency, e.g. "@guestyci/localize".
// - `depVersion`: The version of the dependency, e.g. "2.0.15-alpha.15".
// - `branchName`: The name of the branch, e.g. "localize-upgrade".
// - `main`: A  function representing main upgrade.
// - `onBeforePush`: A function that runs before pushing changes, e.g. `yarn` command to install dependencies.
// - `createPR`: A function representing the creation of a pull request, e.g. to generate custom title and body of a PR.
// - `onAfterPR`: A function that runs after creating a pull request, e.g. the `yarn deployci --testOnly --cluster=production` command.

const config = {
  appName: "",
  depName: "",
  depVersion: "",
  branchName: "", // will be set automatically if empty
  main: main,
  onBeforePush: () => $`nvm use && yarn`,
  createPR: createPR,
  onAfterPR: () => $`nvm use && yarn deployci --testOnly --cluster=production`,
};

// main upgrade function
async function main() {
  return updatePackage({
    depName: config.depName,
    depVersion: config.depVersion,
  });
}

// create PR function
async function createPR() {
  const tldrSection = `
### TL&DR;

- TLDR GOES HERE  \n`;

  const prTitle = `PR TITLE GOES HERE`;
  const prBody = await getPRBody({ tldrSection });
  const prURL = await createGhPR({ prTitle, prBody });

  echo`${prBody}`;

  return prURL;
}

// MAIN run
upgradeRepository(config);
