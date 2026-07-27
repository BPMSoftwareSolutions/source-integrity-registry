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

export const FEATURE_PATHS = [
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
    readonly scenarioCoveragePolicy: "scenario-required" | "plan-only";
    readonly earnedStates: readonly (
      | "EVIDENCED"
      | "ANALYSIS_ADMITTED"
      | "PLAN_BOUND"
      | "FEATURE_AUTHORIZED"
      | "FEATURE_NOT_REQUIRED"
    )[];
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
  readonly index: RemediationIndex | null;
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

  // Every typed block must satisfy its closed governance schema before any
  // graph projection is constructed. Invalid blocks are diagnostics, never
  // candidate authority.
  let hasInvalidBlock = false;
  for (const block of analysisBlocks) {
    if (!validateAnalysis(block)) {
      hasInvalidBlock = true;
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
      hasInvalidBlock = true;
      violations.push({
        code: "TRACE_BLOCK_SCHEMA_INVALID",
        message: `sir-trace block ${String(
          (block as TraceBlock).planId
        )} is schema-invalid: ${JSON.stringify(validateTrace.errors)}`
      });
    }
  }

  if (hasInvalidBlock) {
    return { index: null, violations };
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

  const analysisSectionWitnesses = await readsAnalysisSectionWitnesses();
  for (const block of analysisById.values()) {
    violations.push(
      ...checksAnalysisAssertionReferences(
        block,
        analysisSectionWitnesses.get(block.analysisId) ?? new Map()
      )
    );
  }

  const citedScenarioIds = new Set<string>();
  const analysisPlanReferences = new Map<
    string,
    { planId: string; role: string }[]
  >();
  const analysisScenarioIds = new Map<string, Set<string>>();

  for (const trace of traceByPlanId.values()) {
    violations.push(...checksTraceCoordinateUniqueness(trace));
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

  // Scenario coverage is an explicit policy, never an inferred universal.
  // A plan-only decision must not acquire a manufactured scenario edge, while
  // a scenario-required decision cannot become statically authorized without
  // one.
  for (const block of analysisById.values()) {
    const scenarioIds = analysisScenarioIds.get(block.analysisId) ?? new Set<string>();
    if (
      block.scenarioCoveragePolicy.requiresScenarioCoverage &&
      scenarioIds.size === 0
    ) {
      violations.push({
        code: "REQUIRED_ANALYSIS_SCENARIO_COVERAGE_MISSING",
        message: `${block.analysisId} requires scenario coverage but has no explicit scenario edge.`
      });
    }
    if (
      !block.scenarioCoveragePolicy.requiresScenarioCoverage &&
      scenarioIds.size > 0
    ) {
      violations.push({
        code: "PLAN_ONLY_ANALYSIS_HAS_SCENARIO_EDGE",
        message: `${block.analysisId} is classified plan-only but has scenario coverage.`
      });
    }
  }

  if (violations.length > 0) {
    return { index: null, violations };
  }

  const index: RemediationIndex = {
    analysisLedgerType: "sir-remediation-analysis-index.v1",
    analyses: [...analysisById.values()]
      .sort((left, right) => comparesByCodePoint(left.analysisId, right.analysisId))
      .map((block) => ({
        analysisId: block.analysisId,
        status: block.status,
        supersededBy: block.supersededBy,
        scenarioCoveragePolicy: block.scenarioCoveragePolicy.classification,
        earnedStates: derivesStaticLifecycleStates(
          block,
          analysisPlanReferences.get(block.analysisId) ?? [],
          analysisScenarioIds.get(block.analysisId) ?? new Set<string>()
        ),
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

function derivesStaticLifecycleStates(
  block: AnalysisBlock,
  planReferences: readonly { readonly role: string }[],
  scenarioIds: ReadonlySet<string>
): RemediationIndex["analyses"][number]["earnedStates"] {
  const states: (
    | "EVIDENCED"
    | "ANALYSIS_ADMITTED"
    | "PLAN_BOUND"
    | "FEATURE_AUTHORIZED"
    | "FEATURE_NOT_REQUIRED"
  )[] = ["EVIDENCED"];

  const adopted =
    ADOPTED_STATUSES.has(block.status) && block.supersededBy === null;
  if (!adopted) {
    return states;
  }
  states.push("ANALYSIS_ADMITTED");

  if (!planReferences.some((reference) => reference.role === "authority")) {
    return states;
  }
  states.push("PLAN_BOUND");

  if (block.scenarioCoveragePolicy.requiresScenarioCoverage) {
    if (scenarioIds.size > 0) {
      states.push("FEATURE_AUTHORIZED");
    }
  } else {
    states.push("FEATURE_NOT_REQUIRED");
  }

  return states;
}

export function checksAnalysisAssertionReferences(
  block: AnalysisBlock,
  sectionWitnesses: ReadonlyMap<string, readonly string[]>
): TraceabilityViolation[] {
  const violations: TraceabilityViolation[] = [];
  const expects = (
    actual: string,
    suffix: string,
    code: string,
    description: string
  ): void => {
    const expected = `${block.analysisId}#${suffix}`;
    if (actual !== expected) {
      violations.push({
        code,
        message: `${block.analysisId} ${description} must reference ${expected}, not ${actual}.`
      });
    }
    const witnesses = sectionWitnesses.get(suffix) ?? [];
    if (witnesses.length === 0) {
      violations.push({
        code: "ANALYSIS_ASSERTION_SECTION_MISSING",
        message: `${block.analysisId} references a missing ${suffix} ledger section.`
      });
    } else {
      if (witnesses.length > 1) {
        violations.push({
          code: "ANALYSIS_ASSERTION_SECTION_DUPLICATE",
          message: `${block.analysisId} defines ${suffix} more than once.`
        });
      }
      if (witnesses.every((content) => content.trim() === "")) {
        violations.push({
          code: "ANALYSIS_ASSERTION_SECTION_EMPTY",
          message: `${block.analysisId} ${suffix} ledger section has no assertion content.`
        });
      }
    }
  };

  for (const evidence of block.evidence) {
    if (evidence.kind === "ledger-section") {
      expects(
        evidence.reference,
        "workspace-validation",
        "ANALYSIS_EVIDENCE_REFERENCE_INVALID",
        `evidence ${evidence.evidenceId}`
      );
    }
    if (!evidence.evidenceId.startsWith(`${block.analysisId}-E`)) {
      violations.push({
        code: "ANALYSIS_EVIDENCE_ID_NOT_SCOPED",
        message: `${evidence.evidenceId} is not scoped to ${block.analysisId}.`
      });
    }
  }

  expects(
    block.direction.reference,
    "direction",
    "ANALYSIS_DIRECTION_REFERENCE_INVALID",
    "direction"
  );
  expects(
    block.integrityGain.reference,
    "integrity-gain",
    "ANALYSIS_INTEGRITY_GAIN_REFERENCE_INVALID",
    "integrity gain"
  );
  for (const guard of block.nonDegradationGuards) {
    expects(
      guard.reference,
      "non-degradation-guard",
      "ANALYSIS_GUARD_REFERENCE_INVALID",
      "non-degradation guard"
    );
  }

  return violations;
}

function recordsRole(
  admitted: Map<string, Set<string>>,
  reference: AnalysisReference
): void {
  const roles = admitted.get(reference.analysisId) ?? new Set<string>();
  roles.add(reference.role);
  admitted.set(reference.analysisId, roles);
}

export function checksTraceCoordinateUniqueness(
  trace: TraceBlock
): TraceabilityViolation[] {
  const violations: TraceabilityViolation[] = [];
  const planAnalysisIds = new Set<string>();
  for (const reference of trace.planReferences) {
    if (planAnalysisIds.has(reference.analysisId)) {
      violations.push({
        code: "DUPLICATE_PLAN_ANALYSIS_REFERENCE",
        message: `${trace.planId} cites ${reference.analysisId} more than once in planReferences.`
      });
    }
    planAnalysisIds.add(reference.analysisId);
  }

  const scenarioIds = new Set<string>();
  for (const mapping of trace.scenarioMappings) {
    if (scenarioIds.has(mapping.scenarioId)) {
      violations.push({
        code: "DUPLICATE_PLAN_SCENARIO_MAPPING",
        message: `${trace.planId} maps ${mapping.scenarioId} more than once.`
      });
    }
    scenarioIds.add(mapping.scenarioId);

    const analysisIds = new Set<string>();
    for (const reference of mapping.analysisReferences) {
      if (analysisIds.has(reference.analysisId)) {
        violations.push({
          code: "DUPLICATE_SCENARIO_ANALYSIS_REFERENCE",
          message: `${trace.planId} scenario ${mapping.scenarioId} cites ${reference.analysisId} more than once.`
        });
      }
      analysisIds.add(reference.analysisId);
    }
  }
  return violations;
}

async function readsAnalysisSectionWitnesses(): Promise<
  Map<string, Map<string, string[]>>
> {
  const { marked } = await import("marked");
  const markdown = (await readFile(LEDGER_PATH)).toString("utf8");
  const witnesses = new Map<string, Map<string, string[]>>();
  let currentAnalysisId: string | undefined;

  for (const token of marked.lexer(markdown)) {
    const candidate = token as {
      type?: string;
      depth?: number;
      text?: string;
      tokens?: readonly {
        type?: string;
        text?: string;
        raw?: string;
      }[];
    };
    if (candidate.type === "heading") {
      const match = /^(SIR-RA-\d{3})\b/u.exec(candidate.text ?? "");
      currentAnalysisId = candidate.depth === 3 ? match?.[1] : undefined;
      if (currentAnalysisId !== undefined && !witnesses.has(currentAnalysisId)) {
        witnesses.set(currentAnalysisId, new Map<string, string[]>());
      }
      continue;
    }
    if (
      currentAnalysisId === undefined ||
      candidate.type !== "paragraph" ||
      candidate.tokens?.[0]?.type !== "strong"
    ) {
      continue;
    }

    const normalized = (candidate.tokens[0].text ?? "")
      .trim()
      .replace(/:$/u, "")
      .toLowerCase()
      .replace(/\s+/gu, "-");
    const content = candidate.tokens
      .slice(1)
      .map((child) => child.raw ?? child.text ?? "")
      .join("")
      .trim();
    const byLabel = witnesses.get(currentAnalysisId);
    const entries = byLabel?.get(normalized) ?? [];
    entries.push(content);
    byLabel?.set(normalized, entries);
  }

  return witnesses;
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
