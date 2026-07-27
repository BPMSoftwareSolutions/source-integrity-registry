import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { repositoryRoot } from "./remediation/build-index.ts";

/**
 * Proves the surface a consumer actually receives.
 *
 * Everything here runs against an installed tarball in a temporary directory.
 * Repository source is never on the resolution path, so a file that exists
 * only in the repo — and would be missing from the published package — fails
 * this gate instead of passing by accident.
 */
async function provesPackedConsumer(): Promise<void> {
  const workspace = await mkdtemp(path.join(tmpdir(), "sir-pack-"));
  const consumer = path.join(workspace, "consumer");

  try {
    // `--ignore-scripts` prevents the pack from re-entering prepack, which
    // would recurse back into proof.
    const packed = spawnSync(
      "npm",
      ["pack", "--pack-destination", workspace, "--ignore-scripts", "--silent"],
      { cwd: repositoryRoot, encoding: "utf8", shell: process.platform === "win32" }
    );

    if (packed.status !== 0) {
      fails(`npm pack failed:\n${packed.stdout ?? ""}${packed.stderr ?? ""}`);
      return;
    }

    const tarballs = (await readdir(workspace)).filter((entry) => entry.endsWith(".tgz"));
    const tarball = tarballs[0];
    if (tarball === undefined) {
      fails("npm pack produced no tarball.");
      return;
    }

    await writeFile(
      path.join(workspace, "package.json"),
      `${JSON.stringify({ name: "sir-consumer-root", private: true }, null, 2)}\n`,
      "utf8"
    );

    const { mkdir } = await import("node:fs/promises");
    await mkdir(consumer, { recursive: true });
    await writeFile(
      path.join(consumer, "package.json"),
      `${JSON.stringify(
        { name: "sir-consumer", private: true, version: "0.0.0", type: "module" },
        null,
        2
      )}\n`,
      "utf8"
    );

    const installed = spawnSync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--ignore-scripts", path.join(workspace, tarball)],
      { cwd: consumer, encoding: "utf8", shell: process.platform === "win32" }
    );

    if (installed.status !== 0) {
      fails(`Installing the tarball failed:\n${installed.stdout ?? ""}${installed.stderr ?? ""}`);
      return;
    }

    const packageRoot = path.join(
      consumer,
      "node_modules",
      "@deterministic-solutions",
      "source-integrity-registry"
    );

    // 1. The public library export must import and expose its contract.
    const probe = path.join(consumer, "probe.mjs");
    await writeFile(
      probe,
      [
        "import * as sir from '@deterministic-solutions/source-integrity-registry';",
        "const required = ['validatesSourceIntegrityRegistry','admitsSchemaCatalog','parsesAuthorityDocument','observesSourceBodies','EXIT_CODE'];",
        "const missing = required.filter((name) => sir[name] === undefined);",
        "if (missing.length > 0) { console.error('MISSING_EXPORTS:' + missing.join(',')); process.exit(1); }",
        "console.log('EXPORTS_OK');"
      ].join("\n"),
      "utf8"
    );

    const imported = spawnSync(process.execPath, [probe], { cwd: consumer, encoding: "utf8" });
    if (imported.status !== 0 || !(imported.stdout ?? "").includes("EXPORTS_OK")) {
      fails(
        `Installed library export failed:\n${imported.stdout ?? ""}${imported.stderr ?? ""}`
      );
      return;
    }

    // 2. The packaged CLI must run and resolve its own default catalog.
    const registryPath = path.join(consumer, "registry.json");
    await writeFile(registryPath, `${JSON.stringify(buildsProbeRegistry(), null, 2)}\n`, "utf8");

    const cliPath = path.join(packageRoot, "dist", "cli", "sir.js");
    const cli = spawnSync(process.execPath, [cliPath, "validate", registryPath], {
      cwd: consumer,
      encoding: "utf8"
    });

    if (cli.status !== 0 || !(cli.stdout ?? "").includes("REGISTRY_CONTRACT_VALID")) {
      fails(
        `Packaged CLI did not validate a known-good registry using its default catalog:\n` +
          `exit=${String(cli.status)}\n${cli.stdout ?? ""}${cli.stderr ?? ""}`
      );
      return;
    }

    // 3. Every catalog-referenced schema must be present in the package.
    const catalogPath = path.join(packageRoot, "contracts", "catalog", "sir-schema-catalog.v1.json");
    const parsed = parsesAuthorityDocument(await readFile(catalogPath));
    if (parsed.outcome === "failed") {
      fails(`Packaged catalog is not admissible: ${parsed.failure.message}`);
      return;
    }

    const catalog = parsed.document.value as { entries: { relativePath: string }[] };
    const contractsRoot = path.join(packageRoot, "contracts");

    for (const entry of catalog.entries) {
      try {
        await stat(path.join(contractsRoot, entry.relativePath));
      } catch {
        fails(`Packaged catalog references ${entry.relativePath}, which is not in the package.`);
        return;
      }
    }

    process.stdout.write(
      `Packed consumer surface verified: library export, CLI, default catalog, and ${catalog.entries.length} referenced schemas.\n`
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function fails(message: string): void {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function buildsProbeRegistry(): Record<string, unknown> {
  return {
    contract: {
      contractType: "source-integrity-registry",
      schemaId:
        "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
      schemaVersion: "1.0.0"
    },
    registryId: "sir-packed-consumer-probe",
    workspace: {
      workspaceId: "packed-consumer",
      revision: "0".repeat(40)
    },
    entries: {}
  };
}

await provesPackedConsumer();
