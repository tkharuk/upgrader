#!/usr/bin/env zx
import "zx/globals";
import { getPRTemplate, createGhPR } from "../utils.mjs";

// reads yaml file and replaces a version to an orb
export async function upgradeJqOrb() {
  const ciConfigPath = ".circleci/config.yml";
  const ciConfig = await fs.readFile(ciConfigPath, "utf8");

  const updated = ciConfig.replace(
    /circleci\/jq@\d.\d.\d/,
    "circleci/jq@2.2.0"
  );

  await fs.writeFile(ciConfigPath, updated);

  echo`
  ========================================================
  ${chalk.green("CircleCI config updated")}
  ========================================================`;
}

export async function createPR() {
  const prTemplate = await getPRTemplate();

  const prTLDR = `
### TL&DR;

- Update JQ orb  \n`;

  const prBody = prTemplate
    ? prTemplate
        .replace(`### TL&DR;\n`, prTLDR)
        .replaceAll("[ ]", "[x]")
        .replace("### Description", "")
        .replace("XXXXXXXXXXXX", "")
        .replace("### Images", "")
        .replace("![XXX](url)", "")
    : prTLDR;

  echo`${prBody}`;

  const prTitle = `chore: update JQ orb for CircleCI`;

  const prURL = await createGhPR({ prTitle, prBody });

  return prURL;
}
