import { comparesByCodePoint } from "../../src/domain/ordering.ts";

export interface ScenarioExecutionTestimony {
  readonly testExecutionTestimonyType: "sir-scenario-test-execution.v1";
  readonly scenarioId: string;
  readonly testIdentity: Readonly<{
    file: string;
    suite: string;
    name: string;
  }>;
  readonly registered: true;
  readonly selected: boolean;
  readonly executed: boolean;
  readonly passed: boolean;
  readonly skipped: boolean;
  readonly filtered: boolean;
}

export interface ScenarioExecutionViolation {
  readonly code:
    | "UNKNOWN_TEST_SCENARIO_ID"
    | "SCENARIO_WITHOUT_EXECUTED_PASSING_TESTIMONY";
  readonly message: string;
}

export interface ScenarioExecutionEvaluation {
  readonly testimony: readonly ScenarioExecutionTestimony[];
  readonly violations: readonly ScenarioExecutionViolation[];
}

/**
 * Evaluates runner testimony, never test source text.
 *
 * A scenario is covered only by a registered, selected, executed, passing,
 * non-skipped, non-filtered test. The result establishes execution coverage;
 * it deliberately makes no claim about semantic sufficiency.
 */
export function evaluatesScenarioExecution(
  requiredScenarioIds: readonly string[],
  testimony: readonly ScenarioExecutionTestimony[]
): ScenarioExecutionEvaluation {
  const required = new Set(requiredScenarioIds);
  const violations: ScenarioExecutionViolation[] = [];

  for (const observation of testimony) {
    if (!required.has(observation.scenarioId)) {
      violations.push({
        code: "UNKNOWN_TEST_SCENARIO_ID",
        message: `${observation.testIdentity.file} cites unknown scenario ${observation.scenarioId}.`
      });
    }
  }

  for (const scenarioId of [...required].sort(comparesByCodePoint)) {
    const covered = testimony.some(
      (observation) =>
        observation.scenarioId === scenarioId &&
        observation.registered &&
        observation.selected &&
        observation.executed &&
        observation.passed &&
        !observation.skipped &&
        !observation.filtered
    );
    if (!covered) {
      violations.push({
        code: "SCENARIO_WITHOUT_EXECUTED_PASSING_TESTIMONY",
        message: `${scenarioId} has no registered, selected, executed, passing test testimony.`
      });
    }
  }

  return {
    testimony: [...testimony].sort(
      (left, right) =>
        comparesByCodePoint(left.scenarioId, right.scenarioId) ||
        comparesByCodePoint(left.testIdentity.file, right.testIdentity.file) ||
        comparesByCodePoint(left.testIdentity.suite, right.testIdentity.suite) ||
        comparesByCodePoint(left.testIdentity.name, right.testIdentity.name)
    ),
    violations
  };
}
