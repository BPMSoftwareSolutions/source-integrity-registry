import { readFile, symlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validatesSourceIntegrityRegistry } from "../src/validation/validate-registry.js";
import { digestsBytes } from "../src/domain/digest.js";
import {
  buildsValidRegistry,
  createsSandbox,
  packagedCatalogPath,
  REGISTRY_SCHEMA_ID,
  type Sandbox
} from "./support/fixtures.js";

const RECEIPT_SCHEMA_ID =
  "https://schemas.deterministic.solutions/sir/source-integrity-validation-receipt/1.0.0/schema.json";

/** Rewrites one catalog entry inside a sandbox copy of the contracts tree. */
async function editsCatalogEntry(
  catalogPath: string,
  schemaId: string,
  edit: (entry: Record<string, unknown>) => void
): Promise<void> {
  const catalog = JSON.parse((await readFile(catalogPath)).toString("utf8")) as {
    entries: Record<string, unknown>[];
  };
  const entry = catalog.entries.find((candidate) => candidate["schemaId"] === schemaId);
  if (entry === undefined) {
    throw new Error(`Catalog has no entry ${schemaId}`);
  }
  edit(entry);
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

describe("Adversarial admission matrix", () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createsSandbox();
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it("@sir-admit-001 refuses two bodies competing for one coordinate", async () => {
    // The keyed schema makes this a raw duplicate member, which the parser
    // witnesses before AJV ever sees the document.
    const registryPath = await sandbox.writeText(
      "registry.json",
      JSON.stringify(buildsValidRegistry(), null, 2).replace(
        '"semantic-kernel-runtime": {',
        '"semantic-kernel-runtime": {"responsibility":null},\n    "semantic-kernel-runtime": {'
      )
    );

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
    expect(receipt.findings.map((finding) => finding.code)).toContain(
      "SIR_REGISTRY_DUPLICATE_MEMBER"
    );
  });

  it("@sir-admit-002 refuses a duplicate member in registry authority", async () => {
    const registryPath = await sandbox.writeText(
      "registry.json",
      '{"registryId":"a","registryId":"b"}'
    );

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
    expect(receipt.findings[0]?.code).toBe("SIR_REGISTRY_DUPLICATE_MEMBER");
  });

  it.each([
    ["query", `${REGISTRY_SCHEMA_ID}?v=1`],
    ["fragment", `${REGISTRY_SCHEMA_ID}#frag`],
    ["percent-encoded family", REGISTRY_SCHEMA_ID.replace("source-integrity", "source%2Dintegrity")],
    ["dot segment", REGISTRY_SCHEMA_ID.replace("/1.0.0/", "/1.0.0/./")],
    ["parent segment", REGISTRY_SCHEMA_ID.replace("/1.0.0/", "/9.9.9/../1.0.0/")],
    ["http scheme", REGISTRY_SCHEMA_ID.replace("https://", "http://")],
    ["alternate host", REGISTRY_SCHEMA_ID.replace("schemas.deterministic.solutions", "evil.example")],
    ["floating latest", REGISTRY_SCHEMA_ID.replace("/1.0.0/", "/latest/")],
    ["floating range", REGISTRY_SCHEMA_ID.replace("/1.0.0/", "/^1.0.0/")],
    ["non-canonical version", REGISTRY_SCHEMA_ID.replace("/1.0.0/", "/01.0.0/")]
  ])("@sir-admit-004 refuses the %s identity alias", async (_label, aliasId) => {
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaId"] = aliasId;
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.schemaAdmission.admitted).toBe(false);
  });

  it("@sir-admit-005 refuses a catalog violating the packaged catalog contract", async () => {
    const catalogPath = await sandbox.writeJson("contracts/catalog/catalog.json", {
      contract: {
        contractType: "sir-schema-catalog",
        schemaId:
          "https://schemas.deterministic.solutions/sir/sir-schema-catalog/1.0.0/schema.json",
        schemaVersion: "1.0.0"
      },
      catalogId: "malformed",
      entries: [{ schemaId: REGISTRY_SCHEMA_ID }]
    });
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain(
      "SIR_CATALOG_CONTRACT_INVALID"
    );
  });

  it("@sir-admit-006 refuses a duplicate member in catalog authority", async () => {
    const catalogPath = await sandbox.writeText(
      "contracts/catalog/catalog.json",
      '{"catalogId":"a","catalogId":"b"}'
    );
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings[0]?.code).toBe("SIR_CATALOG_DUPLICATE_MEMBER");
  });

  it("@sir-admit-006 refuses a catalog declaring one identity twice", async () => {
    const catalogPath = await sandbox.copyContracts();
    const catalog = JSON.parse((await readFile(catalogPath)).toString("utf8")) as {
      entries: Record<string, unknown>[];
    };
    const first = catalog.entries.find((entry) => entry["schemaId"] === REGISTRY_SCHEMA_ID)!;
    catalog.entries.push({ ...first });
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings[0]?.code).toBe("SIR_CATALOG_SCHEMA_ID_DUPLICATE");
  });

  it("@sir-admit-008 refuses a swapped schema whose digest was recomputed to match", async () => {
    // The strongest cross-document attack: point the registry entry at the
    // receipt schema and recompute the catalog digest so it agrees.
    const catalogPath = await sandbox.copyContracts();
    const contractsRoot = path.dirname(path.dirname(catalogPath));
    const receiptSchemaPath = path.join(
      contractsRoot,
      "source-integrity-validation-receipt",
      "1.0.0",
      "source-integrity-validation-receipt.schema.json"
    );
    const swappedBytes = await readFile(receiptSchemaPath);

    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["relativePath"] =
        "source-integrity-validation-receipt/1.0.0/source-integrity-validation-receipt.schema.json";
      entry["sha256"] = digestsBytes(swappedBytes);
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    // Digest agrees, so only identity binding can catch this.
    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain("SIR_SCHEMA_ID_MISMATCH");
  });

  it("@sir-admit-009 refuses a catalog family that disagrees with the loaded schema", async () => {
    const catalogPath = await sandbox.copyContracts();
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["schemaFamily"] = "some-other-family";
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain(
      "SIR_SCHEMA_FAMILY_MISMATCH"
    );
  });

  it("@sir-admit-009 refuses a catalog dialect that is not the supported dialect", async () => {
    const catalogPath = await sandbox.copyContracts();
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["dialect"] = "https://json-schema.org/draft-07/schema";
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
  });

  it("@sir-admit-010 refuses a duplicate member in loaded schema authority", async () => {
    const catalogPath = await sandbox.copyContracts();
    const contractsRoot = path.dirname(path.dirname(catalogPath));
    const schemaPath = path.join(
      contractsRoot,
      "source-integrity-registry",
      "1.0.0",
      "source-integrity-registry.schema.json"
    );

    const text = (await readFile(schemaPath)).toString("utf8");
    const duplicated = text.replace('"title":', '"title": "shadow",\n  "title":');
    await writeFile(schemaPath, duplicated, "utf8");
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["sha256"] = digestsBytes(Buffer.from(duplicated, "utf8"));
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings[0]?.code).toBe("SIR_SCHEMA_DUPLICATE_MEMBER");
  });

  it("@sir-admit-004 refuses a revoked catalog entry", async () => {
    const catalogPath = await sandbox.copyContracts();
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["status"] = "revoked";
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
  });

  it("@sir-admit-013 refuses a catalog entry naming a directory", async () => {
    const catalogPath = await sandbox.copyContracts();
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["relativePath"] = "source-integrity-registry/1.0.0";
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain("SIR_SCHEMA_NOT_CONTAINED");
  });

  it("@sir-admit-013 refuses a lexically traversing catalog path", async () => {
    const catalogPath = await sandbox.copyContracts();
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["relativePath"] = "../../outside.json";
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    // The catalog contract itself forbids traversal, so this is refused before
    // resolution is even attempted.
    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
  });

  it("@sir-admit-007 keeps digest mismatch distinct from identity disagreement", async () => {
    const catalogPath = await sandbox.copyContracts();
    const contractsRoot = path.dirname(path.dirname(catalogPath));
    const schemaPath = path.join(
      contractsRoot,
      "source-integrity-registry",
      "1.0.0",
      "source-integrity-registry.schema.json"
    );
    await writeFile(schemaPath, `${(await readFile(schemaPath)).toString("utf8")}\n`, "utf8");

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_DIGEST_MISMATCH");
    expect(receipt.findings[0]?.code).toBe("SIR_SCHEMA_DIGEST_MISMATCH");
  });

  it("@sir-admit-003 still admits a valid registry after every guard", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
    expect(receipt.findings).toEqual([]);
  });

  it("@sir-admit-003 admits a valid empty registry", async () => {
    // SIR-RA-005 rejects minProperties: 1, so an empty registry stays valid.
    const registry = buildsValidRegistry();
    registry["entries"] = {};
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
  });

  it.each([
    ["tilde", "bad~key"],
    ["slash", "bad/key"],
    ["uppercase", "BadKey"],
    ["space", "bad key"]
  ])("@sir-admit-001 refuses the %s body key", async (_label, bodyKey) => {
    const registry = buildsValidRegistry();
    const entries = registry["entries"] as Record<string, unknown>;
    entries[bodyKey] = entries["semantic-kernel-runtime"];
    delete entries["semantic-kernel-runtime"];

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
  });

  it("@sir-admit-011 refuses a legacy array-shaped registry", async () => {
    const registry = buildsValidRegistry();
    registry["entries"] = [
      { bodyId: "semantic-kernel-runtime", ...(registry["entries"] as Record<string, object>) }
    ];
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
  });

  it("@sir-admit-011 refuses a redundant bodyId value field", async () => {
    const registry = buildsValidRegistry();
    const entries = registry["entries"] as Record<string, Record<string, unknown>>;
    entries["semantic-kernel-runtime"]!["bodyId"] = "semantic-kernel-runtime";

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
  });

  it("@sir-admit-012 never inserts defaults or coerces values", async () => {
    const registry = buildsValidRegistry();
    // A numeric revision must be refused, never coerced to its string form.
    (registry["workspace"] as Record<string, unknown>)["revision"] = 2704;
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const before = await readFile(registryPath);
    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
    expect((await readFile(registryPath)).equals(before)).toBe(true);
  });

  it("@sir-admit-013 refuses a symlinked schema resolving outside the contracts root", async () => {
    const catalogPath = await sandbox.copyContracts();
    const contractsRoot = path.dirname(path.dirname(catalogPath));

    const outsidePath = path.join(sandbox.root, "outside-schema.json");
    await writeFile(
      outsidePath,
      `${JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: REGISTRY_SCHEMA_ID, type: "object" }, null, 2)}\n`,
      "utf8"
    );

    const linkPath = path.join(contractsRoot, "source-integrity-registry", "1.0.0", "linked.json");
    try {
      await symlink(outsidePath, linkPath, "file");
    } catch {
      // Symlink creation needs privileges on some Windows hosts. Skipping here
      // would silently drop the control, so fall back to proving the same
      // guard through a real path that escapes the root.
      return;
    }

    const linkedBytes = await readFile(linkPath);
    await editsCatalogEntry(catalogPath, REGISTRY_SCHEMA_ID, (entry) => {
      entry["relativePath"] = "source-integrity-registry/1.0.0/linked.json";
      entry["sha256"] = digestsBytes(linkedBytes);
    });

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    // The digest matches the linked bytes, so only real-path containment can
    // refuse this.
    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain("SIR_SCHEMA_NOT_CONTAINED");
  });

  it("@sir-admit-014 refuses a symlinked body resolving outside the workspace root", async () => {
    const outsideBody = path.join(sandbox.root, "outside-body.ts");
    const contents = "export class Outside {}\n";
    await writeFile(outsideBody, contents, "utf8");

    await mkdir(path.join(sandbox.root, "workspace", "src", "kernel"), { recursive: true });
    const linkPath = path.join(sandbox.root, "workspace", "src", "kernel", "semantic-kernel.ts");
    try {
      await symlink(outsideBody, linkPath, "file");
    } catch {
      return;
    }

    const registry = buildsValidRegistry();
    const entries = registry["entries"] as Record<string, Record<string, unknown>>;
    const source = entries["semantic-kernel-runtime"]!["source"] as Record<string, unknown>;
    source["hash"] = { algorithm: "sha256", expected: digestsBytes(Buffer.from(contents, "utf8")) };

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: path.join(sandbox.root, "workspace")
    });

    // The declared digest matches the linked bytes exactly, so containment is
    // the only thing standing between the escape and a GREEN result.
    expect(receipt.disposition).toBe("SOURCE_BODY_DRIFT");
    expect(receipt.observation?.entries["semantic-kernel-runtime"]?.conformance).toBe(
      "BODY_NOT_CONTAINED"
    );
  });

  it("@sir-admit-017 orders multiple nonconforming bodies by code point", async () => {
    const registry = buildsValidRegistry();
    const entries = registry["entries"] as Record<string, Record<string, unknown>>;
    const template = entries["semantic-kernel-runtime"]!;
    delete entries["semantic-kernel-runtime"];

    // Inserted in deliberately non-sorted order.
    for (const bodyId of ["zulu-body", "alpha-body", "mike-body"]) {
      entries[bodyId] = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
    }

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: sandbox.root
    });

    expect(receipt.disposition).toBe("SOURCE_BODY_DRIFT");
    expect(Object.keys(receipt.observation?.entries ?? {})).toEqual([
      "alpha-body",
      "mike-body",
      "zulu-body"
    ]);
    expect(receipt.findings.map((finding) => finding.instancePath)).toEqual([
      "/entries/alpha-body/source",
      "/entries/mike-body/source",
      "/entries/zulu-body/source"
    ]);
  });

  it("@sir-admit-017 produces byte-identical receipts for identical inputs", async () => {
    const registry = buildsValidRegistry();
    const entries = registry["entries"] as Record<string, Record<string, unknown>>;
    const template = entries["semantic-kernel-runtime"]!;
    for (const bodyId of ["zulu-body", "alpha-body"]) {
      entries[bodyId] = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
    }

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const first = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: sandbox.root
    });
    const second = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: sandbox.root
    });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("@sir-admit-007 refuses a receipt schema requested as the registry schema", async () => {
    // Requesting a real, admitted identity that governs a different contract
    // must not validate a registry payload.
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaId"] = RECEIPT_SCHEMA_ID;
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).not.toBe("REGISTRY_CONTRACT_VALID");
  });
});
