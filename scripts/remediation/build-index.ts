import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createsSirSchemaValidator } from "../../src/validation/ajv-factory.ts";
import { comparesByCodePoint } from "../../src/domain/ordering.ts";
import { parsesAuthorityDocument } from "../../src/authority/parse-authority-document.ts";
import {
  readsAnalysisBlocks,
  readsFeatureScenarios,
  readsTraceBlocks,
  type AnalysisBlock,
  type AnalysisReference,
  type FeatureScenario,
  type TraceBlock
} from "./extract-traceability.ts";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export const LEDGER_PATH = path.join(
  repositoryRoot,
  "docs",
  "source-integrity-registry-remediation-analysis.md"
);
export const PLAN_PATH = path.join(
  repositoryRoot,
  "docs",
  "source-integrity-registry-remediation.md"
);
export const INDEX_PATH = path.join(
  repositoryRoot,
  "docs",
  "generated",
  "source-integrity-registry-remediation-analysis-index.v1.json"
);

const FEATURE_PATHS = [
  path.join(repositoryRoot, "features", "admit-source-integrity-registry.feature"),
  path.join(repositoryRoot, "features", "prove-source-integrity-registry-package.feature"),
  path.join(
    repositoryRoot,
    "features",
    "establish-source-integrity-registry-release-provenance.feature"
  )
];

/**
 * Statuses that may be cited as current implementation authority.
 *
 * A rejected or deferred decision may still constrain the plan as a guard or
 * appear as context, but it must never present as the reason something is
 * implemented the way it is.
 */
const ADOPTED_STATUSES = new Set(["VALID", "VALID_WITH_REFINEMENT", "ALREADY_SATISFIED"]);

export interface TraceabilityViolation {
  readonly code: string;
  readonly message: string;
}

export interface RemediationIndex {
  readonly analysisLedgerType: "sir-remediation-analysis-index.v1";
  readonly analyses: readonly {
    readonly analysisId: string;
    readonly status: string;
    readonly supersededBy: string | null;
    readonly planReferences: readonly { readonly planId: string; readonly role: string }[];
    readonly scenarioIds: readonly string[];
  }[];
  readonly plans: readonly {
    readonly planId: string;
    readonly analysisIds: readonly string[];
    readonly scenarioIds: readonly string[];
  }[];
  readonly scenarios: readonly {
    readonly scenarioId: string;
    readonly feature: string;
    readonly analysisIds: readonly string[];
  }[];
}

export interface TraceabilityProjection {
  readonly index: RemediationIndex;
  readonly violations: readonly TraceabilityViolation[];
}

async function compilesGovernanceValidator(fileName: string) {
  const schemaPath = path.join(repositoryRoot, "docs", "remediation-governance", fileName);
  const parsed = parsesAuthorityDocument(await readFile(schemaPath));
  if (parsed.outcome === "failed") {
    throw new Error(`Governance schema ${fileName} is not admissible: ${parsed.failure.message}`);
  }
  return createsSirSchemaValidator().compile(parsed.document.value as object);
}

/**
 * Projects the remediation graph and reports every conformance violation.
 *
 * The projection is derived only from validated typed blocks and parsed
 * feature tags. It never becomes an independent authority, and this function
 * never repairs what it finds.
 */
export async function buildsTraceabilityProjection(): Promise<TraceabilityProjection> {
  const violations: TraceabilityViolation[] = [];

  const validateAnalysis = await compilesGovernanceValidator(
    "sir-remediation-analysis.v1.schema.json"
  );
  const validateTrace = await compilesGovernanceValidator("sir-remediation-trace.v1.schema.json");

  const analysisBlocks = await readsAnalysisBlocks(LEDGER_PATH);
  const traceBlocks = await readsTraceBlocks(PLAN_PATH);
  const scenarios = await readsFeatureScenarios(FEATURE_PATHS);

  // Every typed block must satisfy its closed governance schema.
  for (const block of analysisBlocks) {
    if (!validateAnalysis(block)) {
      violations.push({
        code: "ANALYSIS_BLOCK_SCHEMA_INVALID",
        message: `sir-analysis block ${String(
          (block as AnalysisBlock).analysisId
        )} is schema-invalid: ${JSON.stringify(validateAnalysis.errors)}`
      });
    }
  }
  for (const block of traceBlocks) {
    if (!validateTrace(block)) {
      violations.push({
        code: "TRACE_BLOCK_SCHEMA_INVALID",
        message: `sir-trace block ${String(
          (block as TraceBlock).planId
        )} is schema-invalid: ${JSON.stringify(validateTrace.errors)}`
      });
    }
  }

  // Coordinates must be uniquely defined.
  const analysisById = new Map<string, AnalysisBlock>();
  for (const block of analysisBlocks) {
    if (analysisById.has(block.analysisId)) {
      violations.push({
        code: "DUPLICATE_ANALYSIS_ID",
        message: `Analysis coordinate ${block.analysisId} is defined more than once.`
      });
      continue;
    }
    analysisById.set(block.analysisId, block);
  }

  const traceByPlanId = new Map<string, TraceBlock>();
  for (const block of traceBlocks) {
    if (traceByPlanId.has(block.planId)) {
      violations.push({
        code: "DUPLICATE_PLAN_ID",
        message: `Plan coordinate ${block.planId} carries more than one trace block.`
      });
      continue;
    }
    traceByPlanId.set(block.planId, block);
  }

  const scenarioById = new Map<string, FeatureScenario>();
  for (const scenario of scenarios) {
    if (scenarioById.has(scenario.scenarioId)) {
      violations.push({
        code: "DUPLICATE_SCENARIO_ID",
        message: `Scenario coordinate ${scenario.scenarioId} is declared more than once.`
      });
      continue;
    }
    scenarioById.set(scenario.scenarioId, scenario);
  }

  // Every plan heading must carry exactly one trace block.
  const planHeadings = await readsPlanHeadings();
  for (const planId of planHeadings) {
    if (!traceByPlanId.has(planId)) {
      violations.push({
        code: "PLAN_COORDINATE_WITHOUT_TRACE_BLOCK",
        message: `Plan coordinate ${planId} has no sir-trace block.`
      });
    }
  }
  for (const planId of traceByPlanId.keys()) {
    if (!planHeadings.includes(planId)) {
      violations.push({
        code: "UNKNOWN_PLAN_ID",
        message: `Trace block declares plan coordinate ${planId}, which is not a plan heading.`
      });
    }
  }

  // Every ledger entry heading must carry exactly one analysis block.
  const analysisHeadings = await readsAnalysisHeadings();
  for (const analysisId of analysisHeadings) {
    if (!analysisById.has(analysisId)) {
      violations.push({
        code: "ANALYSIS_COORDINATE_WITHOUT_BLOCK",
        message: `Analysis coordinate ${analysisId} has no sir-analysis block.`
      });
    }
  }
  for (const analysisId of analysisById.keys()) {
    if (!analysisHeadings.includes(analysisId)) {
      violations.push({
        code: "UNKNOWN_ANALYSIS_ID",
        message: `Analysis block declares ${analysisId}, which is not a ledger entry heading.`
      });
    }
  }

  const citedScenarioIds = new Set<string>();
  const analysisPlanReferences = new Map<
    string,
    { planId: string; role: string }[]
  >();
  const analysisScenarioIds = new Map<string, Set<string>>();

  for (const trace of traceByPlanId.values()) {
    const admittedRoles = new Map<string, Set<string>>();

    for (const reference of trace.planReferences) {
      if (!analysisById.has(reference.analysisId)) {
        violations.push({
          code: "UNRESOLVED_ANALYSIS_CITATION",
          message: `${trace.planId} cites unknown analysis ${reference.analysisId}.`
        });
        continue;
      }

      recordsRole(admittedRoles, reference);
      violations.push(...checksRolePermission(trace.planId, reference, analysisById));

      const list = analysisPlanReferences.get(reference.analysisId) ?? [];
      list.push({ planId: trace.planId, role: reference.role });
      analysisPlanReferences.set(reference.analysisId, list);
    }

    for (const mapping of trace.scenarioMappings) {
      if (!scenarioById.has(mapping.scenarioId)) {
        violations.push({
          code: "UNRESOLVED_SCENARIO_CITATION",
          message: `${trace.planId} maps unknown scenario ${mapping.scenarioId}.`
        });
        continue;
      }
      citedScenarioIds.add(mapping.scenarioId);

      for (const reference of mapping.analysisReferences) {
        if (!analysisById.has(reference.analysisId)) {
          violations.push({
            code: "UNRESOLVED_ANALYSIS_CITATION",
            message: `${trace.planId} scenario ${mapping.scenarioId} cites unknown analysis ${reference.analysisId}.`
          });
          continue;
        }

        // A scenario edge must be admitted by its containing plan, with the
        // same role: otherwise a scenario could quietly claim an authority the
        // plan never granted.
        const roles = admittedRoles.get(reference.analysisId);
        if (roles === undefined) {
          violations.push({
            code: "SCENARIO_REFERENCE_NOT_IN_PLAN",
            message: `${trace.planId} scenario ${mapping.scenarioId} cites ${reference.analysisId}, which is absent from that plan's planReferences.`
          });
        } else if (!roles.has(reference.role)) {
          violations.push({
            code: "SCENARIO_REFERENCE_ROLE_NOT_ADMITTED",
            message: `${trace.planId} scenario ${mapping.scenarioId} cites ${reference.analysisId} as "${reference.role}", which its plan does not admit.`
          });
        }

        violations.push(...checksRolePermission(trace.planId, reference, analysisById));

        const set = analysisScenarioIds.get(reference.analysisId) ?? new Set<string>();
        set.add(mapping.scenarioId);
        analysisScenarioIds.set(reference.analysisId, set);
      }
    }
  }

  // Supersession targets must exist and form no cycles.
  for (const block of analysisById.values()) {
    if (block.supersededBy === null) {
      continue;
    }
    if (!analysisById.has(block.supersededBy)) {
      violations.push({
        code: "UNRESOLVED_SUPERSESSION_TARGET",
        message: `${block.analysisId} is superseded by unknown analysis ${block.supersededBy}.`
      });
      continue;
    }

    const seen = new Set<string>([block.analysisId]);
    let cursor: string | null = block.supersededBy;
    while (cursor !== null) {
      if (seen.has(cursor)) {
        violations.push({
          code: "SUPERSESSION_CYCLE",
          message: `Supersession from ${block.analysisId} forms a cycle at ${cursor}.`
        });
        break;
      }
      seen.add(cursor);
      cursor = analysisById.get(cursor)?.supersededBy ?? null;
    }
  }

  // Every scenario must resolve to at least one analysis decision.
  for (const scenarioId of scenarioById.keys()) {
    if (!citedScenarioIds.has(scenarioId)) {
      violations.push({
        code: "SCENARIO_WITHOUT_ANALYSIS_AUTHORITY",
        message: `Scenario ${scenarioId} has no analysis authority in any plan coordinate.`
      });
    }
  }

  // Every active adopted decision must be referenced somewhere.
  for (const block of analysisById.values()) {
    if (block.supersededBy !== null) {
      continue;
    }
    if (!analysisPlanReferences.has(block.analysisId)) {
      violations.push({
        code: "ORPHANED_ACTIVE_ANALYSIS",
        message: `Active analysis ${block.analysisId} is not referenced by any plan coordinate.`
      });
    }
  }

  const index: RemediationIndex = {
    analysisLedgerType: "sir-remediation-analysis-index.v1",
    analyses: [...analysisById.values()]
      .sort((left, right) => comparesByCodePoint(left.analysisId, right.analysisId))
      .map((block) => ({
        analysisId: block.analysisId,
        status: block.status,
        supersededBy: block.supersededBy,
        planReferences: (analysisPlanReferences.get(block.analysisId) ?? [])
          .slice()
          .sort(
            (left, right) =>
              comparesByCodePoint(left.planId, right.planId) ||
              comparesByCodePoint(left.role, right.role)
          ),
        scenarioIds: [...(analysisScenarioIds.get(block.analysisId) ?? [])].sort(
          comparesByCodePoint
        )
      })),
    plans: [...traceByPlanId.values()]
      .sort((left, right) => comparesByCodePoint(left.planId, right.planId))
      .map((trace) => ({
        planId: trace.planId,
        analysisIds: [...new Set(trace.planReferences.map((r) => r.analysisId))].sort(
          comparesByCodePoint
        ),
        scenarioIds: [...new Set(trace.scenarioMappings.map((m) => m.scenarioId))].sort(
          comparesByCodePoint
        )
      })),
    scenarios: [...scenarioById.values()]
      .sort((left, right) => comparesByCodePoint(left.scenarioId, right.scenarioId))
      .map((scenario) => ({
        scenarioId: scenario.scenarioId,
        feature: path.relative(repositoryRoot, scenario.featurePath).split(path.sep).join("/"),
        analysisIds: [...analysisScenarioIds.entries()]
          .filter(([, scenarioIds]) => scenarioIds.has(scenario.scenarioId))
          .map(([analysisId]) => analysisId)
          .sort(comparesByCodePoint)
      }))
  };

  return { index, violations };
}

function recordsRole(
  admitted: Map<string, Set<string>>,
  reference: AnalysisReference
): void {
  const roles = admitted.get(reference.analysisId) ?? new Set<string>();
  roles.add(reference.role);
  admitted.set(reference.analysisId, roles);
}

/** A non-adopted decision may never be cited as current authority. */
function checksRolePermission(
  planId: string,
  reference: AnalysisReference,
  analysisById: ReadonlyMap<string, AnalysisBlock>
): TraceabilityViolation[] {
  const block = analysisById.get(reference.analysisId);
  if (block === undefined || reference.role !== "authority") {
    return [];
  }

  if (!ADOPTED_STATUSES.has(block.status)) {
    return [
      {
        code: "NON_ADOPTED_DECISION_USED_AS_AUTHORITY",
        message: `${planId} cites ${block.analysisId} as authority, but its status is ${block.status}.`
      }
    ];
  }

  if (block.supersededBy !== null) {
    return [
      {
        code: "SUPERSEDED_DECISION_USED_AS_AUTHORITY",
        message: `${planId} cites superseded analysis ${block.analysisId} as authority.`
      }
    ];
  }

  return [];
}

/** Reads plan coordinates from Markdown headings via the Markdown parser. */
async function readsPlanHeadings(): Promise<string[]> {
  const { marked } = await import("marked");
  const markdown = (await readFile(PLAN_PATH)).toString("utf8");
  const ids: string[] = [];

  for (const token of marked.lexer(markdown)) {
    const heading = token as { type?: string; depth?: number; text?: string };
    if (heading.type !== "heading" || heading.depth !== 2) {
      continue;
    }
    const match = /^(SIR-RP-\d{3})\b/u.exec(heading.text ?? "");
    if (match?.[1] !== undefined) {
      ids.push(match[1]);
    }
  }

  return ids;
}

/** Reads analysis coordinates from ledger entry headings. */
async function readsAnalysisHeadings(): Promise<string[]> {
  const { marked } = await import("marked");
  const markdown = (await readFile(LEDGER_PATH)).toString("utf8");
  const ids: string[] = [];

  for (const token of marked.lexer(markdown)) {
    const heading = token as { type?: string; depth?: number; text?: string };
    if (heading.type !== "heading" || heading.depth !== 3) {
      continue;
    }
    const match = /^(SIR-RA-\d{3})\b/u.exec(heading.text ?? "");
    if (match?.[1] !== undefined) {
      ids.push(match[1]);
    }
  }

  return ids;
}

export function rendersIndexDocument(index: RemediationIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}
