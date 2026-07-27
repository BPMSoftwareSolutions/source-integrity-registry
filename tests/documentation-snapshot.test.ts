import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.js";
import { digestsBytes } from "../src/domain/digest.js";
import {
  appliesTransformation,
  isDocumentationDerivation,
  isDocumentationSnapshot,
  recoversOriginBytes,
  reproducesDerivedDocument,
  type DocumentationDerivation,
  type DocumentationSnapshot
} from "../src/documentation/documentation-snapshot.js";
import { checksDocumentationSnapshots } from "../scripts/check-documentation-snapshots.js";
import { repositoryRoot } from "./support/fixtures.js";

const SNAPSHOT_DIRECTORY = path.join(repositoryRoot, "docs", "documentation-snapshots");

/** The identity SIR-RA-042 admitted for the supplied origin document. */
const ADMITTED_ORIGIN_DIGEST =
  "sha256:162197a180a93f4c0ce248f525e151347ae0526c4a44c5275d2183a13a021e74";
const ADMITTED_ORIGIN_LENGTH = 19878;
const ADMITTED_DERIVED_DIGEST =
  "sha256:de07b5ff26ff6e29e6081109a2d380aa1ae04f5b4cfae387bba7b5dd19e65b17";

async function readsAuthority<T>(fileName: string, admits: (value: unknown) => value is T): Promise<T> {
  const parsed = parsesAuthorityDocument(await readFile(path.join(SNAPSHOT_DIRECTORY, fileName)));
  if (parsed.outcome === "failed") {
    throw new Error(`${fileName} is inadmissible: ${parsed.failure.message}`);
  }
  if (!admits(parsed.document.value)) {
    throw new Error(`${fileName} does not satisfy its declared contract.`);
  }
  return parsed.document.value;
}

const readsSnapshot = (): Promise<DocumentationSnapshot> =>
  readsAuthority("SIR-DS-001.json", isDocumentationSnapshot);
const readsDerivation = (): Promise<DocumentationDerivation> =>
  readsAuthority("SIR-DD-001.json", isDocumentationDerivation);

describe("@sir-package-010 Preserve exact admitted documentation origin bytes", () => {
  it("recovers the exact supplied byte sequence from the origin snapshot", async () => {
    const snapshot = await readsSnapshot();
    const recovery = recoversOriginBytes(snapshot);

    expect(recovery.outcome).toBe("recovered");
    if (recovery.outcome !== "recovered") return;

    expect(recovery.bytes.byteLength).toBe(ADMITTED_ORIGIN_LENGTH);
    expect(recovery.digest).toBe(ADMITTED_ORIGIN_DIGEST);
  });

  it("matches the admitted raw byte length and digest", async () => {
    const snapshot = await readsSnapshot();

    expect(snapshot.byteLength).toBe(ADMITTED_ORIGIN_LENGTH);
    expect(snapshot.sha256).toBe(ADMITTED_ORIGIN_DIGEST);
  });

  it("retains the CRLF sequences that text normalization would rewrite", async () => {
    const snapshot = await readsSnapshot();
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome !== "recovered") throw new Error("origin must recover");

    // The supplied file carries 989 CRLF sequences and no bare LF. Admitting it
    // through the repository's `text=auto eol=lf` filter would store 18889 LF
    // bytes instead, and the admitted digest could never be produced again.
    const text = Buffer.from(recovery.bytes).toString("binary");
    expect(text.split("\r\n").length - 1).toBe(989);
    expect(text.replace(/\r\n/gu, "").includes("\n")).toBe(false);
  });

  it("cannot silently accept normalized bytes in place of the admitted ones", async () => {
    const snapshot = await readsSnapshot();
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome !== "recovered") throw new Error("origin must recover");

    const normalized = Buffer.from(
      Buffer.from(recovery.bytes).toString("binary").replace(/\r\n/gu, "\n"),
      "binary"
    );
    expect(digestsBytes(normalized)).not.toBe(ADMITTED_ORIGIN_DIGEST);

    // Presented under the admitted identity, normalized bytes must be refused.
    const forged: DocumentationSnapshot = {
      ...snapshot,
      byteLength: normalized.byteLength,
      contentBase64: [normalized.toString("base64")]
    };
    const result = recoversOriginBytes(forged);
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("SNAPSHOT_DIGEST_MISMATCH");
  });

  it("requires a new snapshot identity when source bytes change", async () => {
    const snapshot = await readsSnapshot();
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome !== "recovered") throw new Error("origin must recover");

    const changed = Buffer.concat([Buffer.from(recovery.bytes), Buffer.from("x", "utf8")]);
    const mutated: DocumentationSnapshot = {
      ...snapshot,
      byteLength: changed.byteLength,
      contentBase64: [changed.toString("base64")]
    };

    // Reusing SIR-DS-001 for different bytes fails rather than rewriting the
    // admitted identity: a changed document earns a new snapshot.
    const result = recoversOriginBytes(mutated);
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("SNAPSHOT_DIGEST_MISMATCH");
  });

  it("rejects a truncated payload rather than reporting short bytes as admitted", async () => {
    const snapshot = await readsSnapshot();
    const truncated: DocumentationSnapshot = {
      ...snapshot,
      contentBase64: snapshot.contentBase64.slice(0, -1)
    };

    const result = recoversOriginBytes(truncated);
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("SNAPSHOT_LENGTH_MISMATCH");
  });
});

describe("@sir-package-011 Reproduce a derived document from admitted origin and transformation", () => {
  it("reconstructs the derived document from the admitted origin bytes", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();

    const result = reproducesDerivedDocument(snapshot, derivation);
    expect(result.outcome).toBe("reproduced");
    if (result.outcome !== "reproduced") return;

    expect(result.digest).toBe(ADMITTED_DERIVED_DIGEST);
    expect(result.bytes.byteLength).toBe(derivation.derivedByteLength);
  });

  it("binds the derived identity to the declaration rather than a checked-out file", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();
    const result = reproducesDerivedDocument(snapshot, derivation);
    if (result.outcome !== "reproduced") throw new Error("derivation must reproduce");

    // The reproduction is byte-exact against the declared derived digest.
    expect(result.digest).toBe(derivation.derivedSha256);

    // The working-tree Markdown copy is checked out through the repository's
    // `text=auto eol=lf` filter, so on a fresh clone its bytes are normalized
    // just as the origin's were. It is a rendering, not authority: proof that
    // depended on it would pass only on the machine that authored the file.
    const rendering = await readFile(path.join(repositoryRoot, derivation.derivedPath));
    expect(rendering.byteLength).toBeGreaterThan(0);
  });

  it("fails closed when the declared origin digest disagrees with the snapshot", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();

    const result = reproducesDerivedDocument(snapshot, {
      ...derivation,
      originSha256: `sha256:${"0".repeat(64)}`
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("DERIVATION_ORIGIN_MISMATCH");
  });

  it("fails closed when the declaration names an unknown transformation", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();

    const result = reproducesDerivedDocument(snapshot, {
      ...derivation,
      transformation: {
        transformationId: "identity.v1" as DocumentationDerivation["transformation"]["transformationId"],
        parameters: {}
      }
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    // An unadmitted transformation must never degrade into a pass-through.
    expect(result.failure.kind).toBe("DERIVATION_TRANSFORMATION_UNKNOWN");
  });

  it("refuses to remove bytes the origin does not actually carry", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome !== "recovered") throw new Error("origin must recover");

    // Offset 0 holds "# ", not a CRLF. Without a content check the removal
    // would delete two arbitrary bytes and still be measured only by digest.
    const result = appliesTransformation(recovery.bytes, {
      ...derivation.transformation,
      parameters: { byteOffset: 0, removedSequence: "\r\n" }
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("DERIVATION_TRANSFORMATION_INAPPLICABLE");
  });

  it("fails closed when the reproduced output misses the declared derived digest", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();

    const result = reproducesDerivedDocument(snapshot, {
      ...derivation,
      derivedSha256: `sha256:${"1".repeat(64)}`
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("DERIVATION_OUTPUT_DIGEST_MISMATCH");
  });

  it("fails closed when a removal range lies outside the origin", async () => {
    const snapshot = await readsSnapshot();
    const derivation = await readsDerivation();
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome !== "recovered") throw new Error("origin must recover");

    const result = appliesTransformation(recovery.bytes, {
      ...derivation.transformation,
      parameters: { byteOffset: ADMITTED_ORIGIN_LENGTH, removedSequence: "\r\n" }
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;
    expect(result.failure.kind).toBe("DERIVATION_TRANSFORMATION_INAPPLICABLE");
  });

  it("proves the committed origin and derivation without rewriting authority", async () => {
    const before = await Promise.all(
      ["SIR-DS-001.json", "SIR-DD-001.json"].map(async (name) =>
        digestsBytes(await readFile(path.join(SNAPSHOT_DIRECTORY, name)))
      )
    );
    const derivedBefore = digestsBytes(
      await readFile(path.join(repositoryRoot, "docs", "durable-documentation-authority-intent.md"))
    );

    expect(await checksDocumentationSnapshots()).toEqual([]);

    const after = await Promise.all(
      ["SIR-DS-001.json", "SIR-DD-001.json"].map(async (name) =>
        digestsBytes(await readFile(path.join(SNAPSHOT_DIRECTORY, name)))
      )
    );
    const derivedAfter = digestsBytes(
      await readFile(path.join(repositoryRoot, "docs", "durable-documentation-authority-intent.md"))
    );

    // Proof reconstructs into temporary storage only.
    expect(after).toEqual(before);
    expect(derivedAfter).toBe(derivedBefore);
  });
});
