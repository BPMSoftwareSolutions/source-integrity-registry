import { describe, expect, it } from "vitest";

import { extractsTypedBlocks } from "../scripts/remediation/extract-traceability.ts";
import {
  buildsTraceabilityProjection,
  checksTraceCoordinateUniqueness,
  type RemediationIndex
} from "../scripts/remediation/build-index.ts";

async function buildsConformantIndex(): Promise<RemediationIndex> {
  const { index, violations } = await buildsTraceabilityProjection();
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  if (index === null) {
    throw new Error("Conformant remediation governance produced no projection.");
  }
  return index;
}

/**
 * Governing scenario: @sir-package-004.
 *
 * The checker is itself a trust boundary: if it silently accepted prose or
 * ignored a bad edge, the traceability gate would be decorative.
 */
describe("@sir-package-004 Remediation traceability projection", () => {
  it("resolves every coordinate with a permitted role", async () => {
    const { violations } = await buildsTraceabilityProjection();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it("projects analyses, plans, and scenarios in code-point order", async () => {
    const index = await buildsConformantIndex();

    const analysisIds = index.analyses.map((entry) => entry.analysisId);
    expect(analysisIds).toEqual([...analysisIds].sort());

    const planIds = index.plans.map((entry) => entry.planId);
    expect(planIds).toEqual([...planIds].sort());

    const scenarioIds = index.scenarios.map((entry) => entry.scenarioId);
    expect(scenarioIds).toEqual([...scenarioIds].sort());
  });

  it("gives every scenario at least one analysis decision", async () => {
    const index = await buildsConformantIndex();

    for (const scenario of index.scenarios) {
      expect(scenario.analysisIds.length, `${scenario.scenarioId} has no analysis`).toBeGreaterThan(
        0
      );
    }
  });

  it("never cites a non-adopted decision as authority", async () => {
    const index = await buildsConformantIndex();
    const adopted = new Set(["VALID", "VALID_WITH_REFINEMENT", "ALREADY_SATISFIED"]);

    for (const analysis of index.analyses) {
      if (adopted.has(analysis.status)) {
        continue;
      }
      const asAuthority = analysis.planReferences.filter(
        (reference) => reference.role === "authority"
      );
      expect(asAuthority, `${analysis.analysisId} is ${analysis.status}`).toEqual([]);
    }
  });

  it("records the rejected decision as a guard rather than dropping it", async () => {
    const index = await buildsConformantIndex();
    const rejected = index.analyses.find((entry) => entry.analysisId === "SIR-RA-005");

    expect(rejected?.status).toBe("NOT_ADOPTED");
    // A rejected decision still constrains the plan; it must remain visible.
    expect(rejected?.planReferences.some((reference) => reference.role === "guard")).toBe(true);
  });

  it("ignores ordinary JSON examples nested in documentation fences", () => {
    // The example below is inside a four-backtick markdown fence, exactly as
    // the ledger documents the block format. A Markdown parser must treat it
    // as content; a regular expression would wrongly admit it as metadata.
    const markdown = [
      "# Example",
      "",
      "````markdown",
      "```sir-analysis",
      '{ "analysisId": "SIR-RA-999" }',
      "```",
      "````",
      "",
      "```sir-analysis",
      '{ "analysisId": "SIR-RA-001" }',
      "```",
      ""
    ].join("\n");

    const blocks = extractsTypedBlocks(markdown, "sir-analysis") as { analysisId: string }[];

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.analysisId).toBe("SIR-RA-001");
  });

  it("refuses a typed block that is not admissible authority", () => {
    const markdown = ["```sir-analysis", '{ "a":1, "a":2 }', "```"].join("\n");

    expect(() => extractsTypedBlocks(markdown, "sir-analysis")).toThrow(/duplicate member/iu);
  });

  it("does not treat a differently-tagged block as metadata", () => {
    const markdown = ["```json", '{ "analysisId": "SIR-RA-999" }', "```"].join("\n");

    expect(extractsTypedBlocks(markdown, "sir-analysis")).toEqual([]);
  });

  it("rejects duplicate IDs even when repeated references use different roles", () => {
    const violations = checksTraceCoordinateUniqueness({
      traceabilityType: "sir-remediation-trace.v1",
      planId: "SIR-RP-100",
      planReferences: [
        { analysisId: "SIR-RA-002", role: "authority" },
        { analysisId: "SIR-RA-002", role: "context" }
      ],
      scenarioMappings: [
        {
          scenarioId: "@sir-package-009",
          analysisReferences: [
            { analysisId: "SIR-RA-002", role: "authority" },
            { analysisId: "SIR-RA-002", role: "context" }
          ]
        },
        {
          scenarioId: "@sir-package-009",
          analysisReferences: [
            { analysisId: "SIR-RA-032", role: "authority" }
          ]
        }
      ]
    });

    expect(violations.map((violation) => violation.code)).toEqual([
      "DUPLICATE_PLAN_ANALYSIS_REFERENCE",
      "DUPLICATE_SCENARIO_ANALYSIS_REFERENCE",
      "DUPLICATE_PLAN_SCENARIO_MAPPING"
    ]);
  });

});
