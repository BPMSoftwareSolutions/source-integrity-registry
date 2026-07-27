import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.js";
import { repositoryRoot, contractsRoot, packagedCatalogPath } from "./support/fixtures.js";

async function readsPackageManifest(): Promise<Record<string, unknown>> {
  const parsed = parsesAuthorityDocument(await readFile(path.join(repositoryRoot, "package.json")));
  if (parsed.outcome === "failed") {
    throw new Error(`package.json is not admissible: ${parsed.failure.message}`);
  }
  return parsed.document.value as Record<string, unknown>;
}

/**
 * These prove the *shape* of the proof contract: that the lifecycle cannot
 * recurse, that proof never invokes a generator, and that the packaged catalog
 * only references schemas the package actually ships.
 *
 * The end-to-end behavior of `pnpm prove` is exercised by running it, not from
 * inside itself, which would recurse.
 */
describe("@sir-package-001 Proof lifecycle contract", () => {
  it("makes prepack run prove:core rather than the packing proof", async () => {
    const manifest = await readsPackageManifest();
    const scripts = manifest["scripts"] as Record<string, string>;

    // The outer proof packs; if prepack invoked it, packing would re-enter
    // prepack and recurse indefinitely.
    expect(scripts["prepack"]).toBe("pnpm prove:core");
    expect(scripts["prepack"]).not.toContain("prove:packed");
    expect(scripts["prove"]).toContain("prove:core");
    expect(scripts["prove"]).toContain("prove-packed-consumer");
  });

  it("never invokes a generate command inside proof", async () => {
    const manifest = await readsPackageManifest();
    const scripts = manifest["scripts"] as Record<string, string>;

    for (const proofScript of ["prove", "prove:core", "prepack"]) {
      const body = scripts[proofScript] ?? "";
      // Proof must fail on drift rather than repair it.
      expect(body, `${proofScript} must not generate`).not.toMatch(/\bgenerate:/u);
    }
  });

  it("includes every prerequisite in prove:core", async () => {
    const manifest = await readsPackageManifest();
    const core = (manifest["scripts"] as Record<string, string>)["prove:core"] ?? "";

    expect(core).toContain("typecheck");
    expect(core).toContain("pnpm test");
    expect(core).toContain("check:generated");
    expect(core).toContain("check:remediation-index");
    expect(core).toContain("check:remediation-history");
    expect(core).toContain("prove-fresh-build");
  });

  it("uses the plain documented test command", async () => {
    const manifest = await readsPackageManifest();
    const scripts = manifest["scripts"] as Record<string, string>;

    // Worker bounds live in committed config, so the proven command is the
    // same one the README documents.
    expect(scripts["test"]).toBe("vitest run");

    const config = (await readFile(path.join(repositoryRoot, "vitest.config.ts"))).toString("utf8");
    expect(config).toContain("maxWorkers");
    expect(config).toContain("minWorkers");
  });
});

describe("@sir-package-002 Generated authority is checked, not repaired", () => {
  it("exposes comparison-only check commands separate from generators", async () => {
    const manifest = await readsPackageManifest();
    const scripts = manifest["scripts"] as Record<string, string>;

    expect(scripts["check:generated"]).toBeDefined();
    expect(scripts["check:remediation-index"]).toBeDefined();
    expect(scripts["generate:catalog"]).toBeDefined();
    expect(scripts["generate:remediation-index"]).toBeDefined();

    // The check scripts must not invoke a generator. Their own filenames
    // contain "generated", so the property is about invocation, not spelling.
    expect(scripts["check:generated"]).not.toMatch(/\bgenerate:/u);
    expect(scripts["check:remediation-index"]).not.toMatch(/\bgenerate:/u);
    expect(scripts["check:generated"]).toMatch(/^tsx scripts\/check-/u);
    expect(scripts["check:remediation-index"]).toMatch(/^tsx scripts\/check-/u);
  });
});

describe("@sir-package-003 Packed consumer surface", () => {
  it("ships every schema the packaged catalog references", async () => {
    const manifest = await readsPackageManifest();
    const files = manifest["files"] as string[];

    expect(files).toContain("dist");
    expect(files).toContain("contracts");

    const parsed = parsesAuthorityDocument(await readFile(packagedCatalogPath));
    expect(parsed.outcome).toBe("parsed");
    if (parsed.outcome !== "parsed") return;

    const catalog = parsed.document.value as { entries: { relativePath: string }[] };
    expect(catalog.entries.length).toBeGreaterThan(0);

    for (const entry of catalog.entries) {
      // A referenced schema outside contracts/ would resolve in the repository
      // but be absent from the tarball.
      expect(entry.relativePath.startsWith("..")).toBe(false);
      await expect(
        readFile(path.join(contractsRoot, entry.relativePath))
      ).resolves.toBeDefined();
    }
  });

  it("declares the library export and CLI the consumer smoke test exercises", async () => {
    const manifest = await readsPackageManifest();

    const exports = manifest["exports"] as Record<string, Record<string, string>>;
    expect(exports["."]?.["import"]).toBe("./dist/index.js");
    expect(exports["."]?.["types"]).toBe("./dist/index.d.ts");

    const bin = manifest["bin"] as Record<string, string>;
    expect(bin["sir"]).toBe("./dist/cli/sir.js");
  });
});

describe("@sir-provenance-001 Release provenance remains deferred", () => {
  it("makes no authenticated release claim yet", async () => {
    const manifest = await readsPackageManifest();

    // SIR-RA-021 is DEFERRED. Until a signed tag binds the released bytes,
    // the package must not present itself as an authorized release.
    expect(manifest["private"]).toBeUndefined();
    expect(manifest["version"]).toBe("0.1.0");

    const scripts = manifest["scripts"] as Record<string, string>;
    // Internal consistency is not independent authorization: no proof script
    // may claim to establish provenance.
    for (const body of Object.values(scripts)) {
      expect(body).not.toMatch(/provenance/u);
    }
  });

  it("keeps provenance authority in its own feature", async () => {
    const feature = (
      await readFile(
        path.join(
          repositoryRoot,
          "features",
          "establish-source-integrity-registry-release-provenance.feature"
        )
      )
    ).toString("utf8");

    expect(feature).toContain("@sir-provenance-001");
    expect(feature).toMatch(/signature can never turn/iu);

    // Provenance must not be smuggled into the product admission feature.
    const admission = (
      await readFile(
        path.join(repositoryRoot, "features", "admit-source-integrity-registry.feature")
      )
    ).toString("utf8");
    expect(admission).not.toContain("@sir-provenance-");
  });
});
