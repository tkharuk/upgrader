#!/usr/bin/env zx
import "zx/globals";
import { updatePackage, createGhPR, getPRBody } from "../utils.mjs";

export async function upgradeCypress() {
  updatePackage({
    depName: "cypress",
    depVersion: "13.0.0",
  });

  echo`
  ========================================================
  ${chalk.green("Cypress upgraded to v13.0.0")}
  ========================================================`;
}

export async function createPR() {
  const tldrSection = `
### TL&DR;

- Update JQ orb  \n`;

  const prTitle = `chore: update JQ orb for CircleCI`;
  const prBody = await getPRBody({ tldrSection });
  const prURL = await createGhPR({ prTitle, prBody });

  echo`${prBody}`;

  return prURL;
}
