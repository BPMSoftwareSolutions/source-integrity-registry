import { spawnSync } from "node:child_process";
import { mkdtemp, rm, readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { comparesByCodePoint } from "../src/domain/ordering.ts";
import { repositoryRoot } from "./remediation/build-index.ts";

/**
 * Proves the committed source compiles cleanly into fresh output.
 *
 * The build is emitted into a temporary staging directory rather than over
 * `dist`, so proof cannot repair or mask stale compiled output. Nothing in the
 * working tree is written, which is what makes the proof idempotent.
 */
async function provesFreshBuild(): Promise<void> {
  const staging = await mkdtemp(path.join(tmpdir(), "sir-build-"));

  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, "node_modules", "typescript", "lib", "tsc.js"),
        "--project",
        path.join(repositoryRoot, "tsconfig.build.json"),
        "--outDir",
        staging
      ],
      { cwd: repositoryRoot, encoding: "utf8" }
    );

    if (result.status !== 0) {
      process.stderr.write(
        `Fresh build failed:\n${result.stdout ?? ""}${result.stderr ?? ""}\n`
      );
      process.exitCode = 1;
      return;
    }

    // The staged output must contain the entrypoints the package contract
    // promises, or packaging would ship a surface that does not exist.
    const required = [
      path.join(staging, "index.js"),
      path.join(staging, "index.d.ts"),
      path.join(staging, "cli", "sir.js")
    ];

    for (const file of required) {
      try {
        await stat(file);
      } catch {
        process.stderr.write(
          `Fresh build did not emit required artifact ${path.relative(staging, file)}.\n`
        );
        process.exitCode = 1;
        return;
      }
    }

    const emitted = await collectsFiles(staging, staging);
    process.stdout.write(
      `Fresh build verified: ${emitted.length} artifacts emitted from committed source.\n`
    );

    // If a dist tree exists, it must agree with what source produces now.
    const distRoot = path.join(repositoryRoot, "dist");
    let distExists = true;
    try {
      await stat(distRoot);
    } catch {
      distExists = false;
    }

    if (distExists) {
      const drifted = await comparesTrees(staging, distRoot, emitted);
      if (drifted.length > 0) {
        process.stderr.write(
          `Compiled dist output does not match a fresh build of committed source:\n${drifted
            .map((entry) => `  ${entry}`)
            .join("\n")}\n\nRun "pnpm build" and review the difference.\n`
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write("Compiled dist output matches a fresh build of committed source.\n");
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function collectsFiles(root: string, directory: string): Promise<string[]> {
  const found: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectsFiles(root, full)));
      continue;
    }
    found.push(path.relative(root, full).split(path.sep).join("/"));
  }

  return found.sort(comparesByCodePoint);
}

/**
 * Compares staged output with dist, ignoring source-map path references.
 *
 * `--outDir` changes the relative path a `.map` records, so those lines differ
 * for reasons that carry no meaning about the compiled behavior.
 */
async function comparesTrees(
  staging: string,
  distRoot: string,
  files: readonly string[]
): Promise<string[]> {
  const drifted: string[] = [];

  for (const file of files) {
    if (file.endsWith(".map")) {
      continue;
    }

    let distBytes: Buffer;
    try {
      distBytes = await readFile(path.join(distRoot, file));
    } catch {
      drifted.push(`${file} (missing from dist)`);
      continue;
    }

    const stagedBytes = await readFile(path.join(staging, file));
    if (!stagedBytes.equals(distBytes)) {
      drifted.push(`${file} (differs)`);
    }
  }

  return drifted;
}

await provesFreshBuild();
