import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checksCheckpointCoverage,
  checksCheckpointRequiredAuthorityFiles,
  checksPipelineMarkerContinuity,
  extractsCheckpointIds,
  isImplementationPath
} from "../scripts/check-remediation-history.ts";
import { parsesCheckpointArguments } from "../scripts/create-remediation-checkpoint.ts";
import { generatesRemediationIndex } from "../scripts/generate-remediation-index.ts";
import {
  buildsTraceabilityProjection,
  checksAnalysisAssertionReferences,
  repositoryRoot,
  type RemediationIndex
} from "../scripts/remediation/build-index.ts";
import { readsAnalysisBlocks } from "../scripts/remediation/extract-traceability.ts";
import {
  evaluatesScenarioExecution,
  type ScenarioExecutionTestimony
} from "../scripts/remediation/scenario-execution.ts";
import { checksCheckpointProjectionBinding } from "../scripts/remediation/checkpoint-binding.ts";
import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.js";
import { createsSirSchemaValidator } from "../src/validation/ajv-factory.js";

async function compilesGovernanceSchema(fileName: string) {
  const bytes = await readFile(
    path.join(repositoryRoot, "docs", "remediation-governance", fileName)
  );
  const parsed = parsesAuthorityDocument(bytes);
  if (parsed.outcome === "failed") {
    throw new Error(parsed.failure.message);
  }
  return createsSirSchemaValidator().compile(parsed.document.value as object);
}

describe("@sir-package-005 Complete remediation-analysis admission", () => {
  it("requires every structured integrity assertion in corrected unreleased v1", async () => {
    const validate = await compilesGovernanceSchema(
      "sir-remediation-analysis.v1.schema.json"
    );
    const blocks = await readsAnalysisBlocks(
      path.join(repositoryRoot, "docs", "source-integrity-registry-remediation-analysis.md")
    );
    const template = blocks.find((block) => block.analysisId === "SIR-RA-025");
    if (template === undefined) {
      throw new Error("SIR-RA-025 is missing.");
    }

    for (const required of [
      "evidence",
      "direction",
      "integrityGain",
      "nonDegradationGuards",
      "proofBoundary",
      "scenarioCoveragePolicy"
    ]) {
      const candidate = structuredClone(template) as unknown as Record<string, unknown>;
      delete candidate[required];
      expect(validate(candidate), `${required} must be required`).toBe(false);
    }
  });

  it("admits every migrated analysis block under the same closed contract", async () => {
    const validate = await compilesGovernanceSchema(
      "sir-remediation-analysis.v1.schema.json"
    );
    const blocks = await readsAnalysisBlocks(
      path.join(repositoryRoot, "docs", "source-integrity-registry-remediation-analysis.md")
    );

    for (const block of blocks) {
      expect(validate(block), `${block.analysisId}: ${JSON.stringify(validate.errors)}`).toBe(
        true
      );
    }
  });

  it("requires every referenced ledger assertion to contain substantive text", async () => {
    const [template] = await readsAnalysisBlocks(
      path.join(repositoryRoot, "docs", "source-integrity-registry-remediation-analysis.md")
    );
    if (template === undefined) {
      throw new Error("No remediation analysis is available.");
    }
    const witnesses = new Map<string, readonly string[]>([
      ["workspace-validation", ["repository evidence"]],
      ["direction", [""]],
      ["integrity-gain", ["integrity improvement"]],
      ["non-degradation-guard", ["preserved guarantee"]]
    ]);

    expect(
      checksAnalysisAssertionReferences(template, witnesses).map(
        (violation) => violation.code
      )
    ).toContain("ANALYSIS_ASSERTION_SECTION_EMPTY");
  });

  it("admits the immutable prospective-enforcement marker", async () => {
    const validate = await compilesGovernanceSchema(
      "sir-remediation-pipeline.v1.schema.json"
    );
    const parsed = parsesAuthorityDocument(
      await readFile(
        path.join(
          repositoryRoot,
          "docs",
          "remediation-governance",
          "sir-remediation-pipeline.v1.json"
        )
      )
    );
    expect(parsed.outcome).toBe("parsed");
    if (parsed.outcome !== "parsed") return;
    expect(validate(parsed.document.value), JSON.stringify(validate.errors)).toBe(true);
  });
});

describe("@sir-package-006 Explicit analysis scenario-coverage policy", () => {
  it("derives coverage states and rejects no current policy edge", async () => {
    const { index, violations } = await buildsTraceabilityProjection();
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    expect(index).not.toBeNull();

    for (const analysis of index?.analyses ?? []) {
      if (analysis.scenarioCoveragePolicy === "scenario-required") {
        expect(analysis.scenarioIds.length, analysis.analysisId).toBeGreaterThan(0);
      } else {
        expect(analysis.scenarioIds, analysis.analysisId).toEqual([]);
        expect(analysis.earnedStates).toContain("FEATURE_NOT_REQUIRED");
      }
    }
  });
});

describe("@sir-package-007 Fail-before-write remediation generation", () => {
  it("leaves the canonical bytes unchanged when evaluation is RED", async () => {
    const sandbox = await mkdtemp(path.join(tmpdir(), "sir-remediation-generation-"));
    const indexPath = path.join(sandbox, "index.json");
    const sentinel = Buffer.from("canonical-before\n", "utf8");

    try {
      await writeFile(indexPath, sentinel);
      const result = await generatesRemediationIndex({
        indexPath,
        evaluate: async () => ({
          index: null,
          violations: [{ code: "TEST_INVALID", message: "deliberately invalid" }]
        })
      });

      expect(result.written).toBe(false);
      expect(await readFile(indexPath)).toEqual(sentinel);
      expect(await readdir(sandbox)).toEqual(["index.json"]);

      const invalidCandidate = await generatesRemediationIndex({
        indexPath,
        evaluate: async () => ({
          index: {} as RemediationIndex,
          violations: []
        })
      });
      expect(invalidCandidate.written).toBe(false);
      expect(invalidCandidate.violations[0]?.code).toBe(
        "REMEDIATION_INDEX_CANDIDATE_INVALID"
      );
      expect(await readFile(indexPath)).toEqual(sentinel);
      expect(await readdir(sandbox)).toEqual(["index.json"]);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });
});

describe("@sir-package-008 Executed scenario testimony", () => {
  const testimony = (
    overrides: Partial<ScenarioExecutionTestimony> = {}
  ): ScenarioExecutionTestimony => ({
    testExecutionTestimonyType: "sir-scenario-test-execution.v1",
    scenarioId: "@sir-package-008",
    testIdentity: {
      file: "tests/remediation-governance.test.ts",
      suite: "executed scenario testimony",
      name: "example"
    },
    registered: true,
    selected: true,
    executed: true,
    passed: true,
    skipped: false,
    filtered: false,
    ...overrides
  });

  it.each([
    ["skipped", { skipped: true, selected: false, executed: false, passed: false }],
    ["filtered", { filtered: true, selected: false, executed: false, passed: false }],
    ["failed", { passed: false }]
  ])("does not count %s testimony as coverage", (_label, overrides) => {
    const evaluation = evaluatesScenarioExecution(
      ["@sir-package-008"],
      [testimony(overrides)]
    );

    expect(evaluation.violations.map((violation) => violation.code)).toContain(
      "SCENARIO_WITHOUT_EXECUTED_PASSING_TESTIMONY"
    );
  });

  it("counts exact executed passing testimony and rejects unknown IDs", () => {
    expect(
      evaluatesScenarioExecution(["@sir-package-008"], [testimony()]).violations
    ).toEqual([]);

    const unknown = testimony({ scenarioId: "@sir-package-999" });
    expect(
      evaluatesScenarioExecution(["@sir-package-008"], [unknown]).violations.map(
        (violation) => violation.code
      )
    ).toEqual([
      "UNKNOWN_TEST_SCENARIO_ID",
      "SCENARIO_WITHOUT_EXECUTED_PASSING_TESTIMONY"
    ]);
  });
});

describe("@sir-package-009 Feature-authority history checkpoint", () => {
  it("uses one projection-binding rule for authoring and historical proof", async () => {
    const { index, violations } = await buildsTraceabilityProjection();
    expect(violations).toEqual([]);
    if (index === null) {
      throw new Error("The remediation projection is unavailable.");
    }

    const selection = {
      checkpointId: "SIR-RC-001",
      analysisIds: ["SIR-RA-002", "SIR-RA-032"],
      planIds: ["SIR-RP-100"],
      scenarioIds: ["@sir-package-009"],
      authorityFiles: [
        { path: "features/prove-source-integrity-registry-package.feature" }
      ]
    };
    expect(checksCheckpointProjectionBinding(index, selection)).toEqual([]);
    expect(
      checksCheckpointProjectionBinding(index, {
        ...selection,
        authorityFiles: []
      }).map((violation) => violation.code)
    ).toEqual(["CHECKPOINT_SCENARIO_FEATURE_NOT_BOUND"]);
  });

  it("uses a closed checkpoint and scopes every governed implementation path", async () => {
    const validate = await compilesGovernanceSchema(
      "sir-remediation-authority-checkpoint.v1.schema.json"
    );
    const checkpoint = {
      checkpointType: "sir-remediation-authority-checkpoint.v1",
      checkpointId: "SIR-RC-001",
      authorityCommit: "a".repeat(40),
      analysisIds: ["SIR-RA-025"],
      planIds: ["SIR-RP-100"],
      scenarioIds: ["@sir-package-009"],
      authorityFiles: [
        {
          path: "docs/source-integrity-registry-remediation-analysis.md",
          sha256: `sha256:${"b".repeat(64)}`
        },
        {
          path: "docs/source-integrity-registry-remediation.md",
          sha256: `sha256:${"c".repeat(64)}`
        },
        {
          path: "docs/generated/source-integrity-registry-remediation-analysis-index.v1.json",
          sha256: `sha256:${"e".repeat(64)}`
        },
        {
          path: "features/prove-source-integrity-registry-package.feature",
          sha256: `sha256:${"d".repeat(64)}`
        }
      ],
      implementationScopes: ["src/catalog/", "scripts/remediation/"]
    } as const;

    expect(validate(checkpoint), JSON.stringify(validate.errors)).toBe(true);
    expect(
      validate({ ...checkpoint, state: "FEATURE_AUTHORIZED" })
    ).toBe(false);
    expect(checksCheckpointCoverage(checkpoint, ["src/catalog/schema-catalog.ts"])).toEqual(
      []
    );
    expect(checksCheckpointRequiredAuthorityFiles(checkpoint)).toEqual([]);
    expect(
      checksCheckpointRequiredAuthorityFiles({
        ...checkpoint,
        authorityFiles: checkpoint.authorityFiles.slice(3)
      }).map((violation) => violation.code)
    ).toEqual([
      "CHECKPOINT_REQUIRED_AUTHORITY_FILE_MISSING",
      "CHECKPOINT_REQUIRED_AUTHORITY_FILE_MISSING",
      "CHECKPOINT_REQUIRED_AUTHORITY_FILE_MISSING"
    ]);
    expect(
      checksCheckpointCoverage(checkpoint, ["src/authority/parse-authority-document.ts"])[0]
        ?.code
    ).toBe("IMPLEMENTATION_PATH_OUTSIDE_CHECKPOINT_SCOPE");
  });

  it("recognizes governed paths and explicit checkpoint references", () => {
    expect(isImplementationPath("src/catalog/schema-catalog.ts")).toBe(true);
    expect(
      isImplementationPath(
        "docs/remediation-governance/sir-remediation-analysis.v1.schema.json"
      )
    ).toBe(true);
    expect(isImplementationPath("docs/source-integrity-registry-remediation.md")).toBe(
      false
    );
    expect(extractsCheckpointIds("Implement SIR-RC-002 after SIR-RC-001")).toEqual([
      "SIR-RC-001",
      "SIR-RC-002"
    ]);
    expect(checksPipelineMarkerContinuity(true, false, false)[0]?.code).toBe(
      "REMEDIATION_PIPELINE_MARKER_REMOVED"
    );
    expect(checksPipelineMarkerContinuity(true, true, true)[0]?.code).toBe(
      "REMEDIATION_PIPELINE_MARKER_CHANGED"
    );

    expect(
      parsesCheckpointArguments([
        "--checkpoint",
        "SIR-RC-001",
        "--analysis",
        "SIR-RA-025",
        "--plan",
        "SIR-RP-100",
        "--scenario",
        "@sir-package-009",
        "--feature",
        "features/prove-source-integrity-registry-package.feature",
        "--scope",
        "scripts/remediation/"
      ])
    ).toMatchObject({
      checkpointId: "SIR-RC-001",
      analysisIds: ["SIR-RA-025"],
      scenarioIds: ["@sir-package-009"]
    });
  });
});
