import type { RemediationIndex } from "./build-index.ts";

export interface CheckpointProjectionSelection {
  readonly checkpointId: string;
  readonly analysisIds: readonly string[];
  readonly planIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly authorityFiles: readonly { readonly path: string }[];
}

export interface CheckpointProjectionViolation {
  readonly code: string;
  readonly message: string;
}

/**
 * Checks checkpoint coordinates against the validated static projection.
 *
 * This is shared by checkpoint authoring and historical proof so the authoring
 * command cannot emit an artifact that the enforcement gate later rejects.
 */
export function checksCheckpointProjectionBinding(
  index: RemediationIndex,
  checkpoint: CheckpointProjectionSelection
): CheckpointProjectionViolation[] {
  const violations: CheckpointProjectionViolation[] = [];

  for (const analysisId of checkpoint.analysisIds) {
    const analysis = index.analyses.find(
      (candidate) => candidate.analysisId === analysisId
    );
    if (analysis === undefined) {
      violations.push({
        code: "CHECKPOINT_ANALYSIS_NOT_IN_INDEX",
        message: `${analysisId} is absent from the checkpointed remediation index.`
      });
      continue;
    }
    if (
      !analysis.earnedStates.includes("PLAN_BOUND") ||
      !(
        analysis.earnedStates.includes("FEATURE_AUTHORIZED") ||
        analysis.earnedStates.includes("FEATURE_NOT_REQUIRED")
      )
    ) {
      violations.push({
        code: "CHECKPOINT_ANALYSIS_NOT_STATICALLY_AUTHORIZED",
        message: `${analysisId} has not earned plan and feature authority in the checkpointed index.`
      });
    }
    if (
      !analysis.planReferences.some(
        (reference) =>
          reference.role === "authority" &&
          checkpoint.planIds.includes(reference.planId)
      )
    ) {
      violations.push({
        code: "CHECKPOINT_ANALYSIS_NOT_BOUND_TO_SELECTED_PLAN",
        message: `${analysisId} is not authority in a selected checkpoint plan.`
      });
    }
    if (
      analysis.scenarioCoveragePolicy === "scenario-required" &&
      !analysis.scenarioIds.some((scenarioId) =>
        checkpoint.scenarioIds.includes(scenarioId)
      )
    ) {
      violations.push({
        code: "CHECKPOINT_ANALYSIS_NOT_BOUND_TO_SELECTED_SCENARIO",
        message: `${analysisId} is not bound to a selected checkpoint scenario.`
      });
    }
  }

  for (const planId of checkpoint.planIds) {
    const plan = index.plans.find((candidate) => candidate.planId === planId);
    if (
      plan === undefined ||
      !plan.analysisIds.some((analysisId) =>
        checkpoint.analysisIds.includes(analysisId)
      )
    ) {
      violations.push({
        code: "CHECKPOINT_PLAN_NOT_BOUND_TO_SELECTED_ANALYSIS",
        message: `${planId} is absent from the checkpointed index or binds no selected analysis.`
      });
    }
  }

  for (const scenarioId of checkpoint.scenarioIds) {
    const scenario = index.scenarios.find(
      (candidate) => candidate.scenarioId === scenarioId
    );
    if (
      scenario === undefined ||
      !scenario.analysisIds.some((analysisId) =>
        checkpoint.analysisIds.includes(analysisId)
      )
    ) {
      violations.push({
        code: "CHECKPOINT_SCENARIO_NOT_BOUND_TO_SELECTED_ANALYSIS",
        message: `${scenarioId} is absent from the checkpointed index or binds no selected analysis.`
      });
    } else if (
      !checkpoint.authorityFiles.some(
        (authorityFile) => authorityFile.path === scenario.feature
      )
    ) {
      violations.push({
        code: "CHECKPOINT_SCENARIO_FEATURE_NOT_BOUND",
        message: `${scenarioId}'s feature ${scenario.feature} is not bound by the checkpoint.`
      });
    }
  }

  return violations;
}
