import path from "node:path";

import type { Reporter } from "vitest/reporters";

import { FEATURE_PATHS, repositoryRoot } from "./build-index.ts";
import { readsFeatureScenarios } from "./extract-traceability.ts";
import {
  evaluatesScenarioExecution,
  type ScenarioExecutionTestimony
} from "./scenario-execution.ts";

const SCENARIO_ID_PATTERN = /@sir-(?:admit|package|provenance)-\d{3}/gu;

interface VitestTask {
  readonly type: "suite" | "test" | "custom";
  readonly name: string;
  readonly mode: "run" | "skip" | "only" | "todo";
  readonly pending?: boolean;
  readonly result?: {
    readonly state: "run" | "skip" | "only" | "todo" | "pass" | "fail";
  };
  readonly tasks?: readonly VitestTask[];
}

interface VitestFile extends VitestTask {
  readonly type: "suite";
  readonly filepath: string;
  readonly tasks: readonly VitestTask[];
}

/** Vitest reporter that turns completed task state into scenario testimony. */
export class ScenarioExecutionReporter implements Reporter {
  public async onFinished(files: unknown[]): Promise<void> {
    const testimony = (files as VitestFile[]).flatMap((file) => collectsTestimony(file));
    const required = (await readsFeatureScenarios(FEATURE_PATHS)).map(
      (scenario) => scenario.scenarioId
    );
    const evaluation = evaluatesScenarioExecution(required, testimony);

    if (evaluation.violations.length > 0) {
      throw new Error(
        `Scenario execution coverage is RED:\n${evaluation.violations
          .map((violation) => `  ${violation.code}: ${violation.message}`)
          .join("\n")}`
      );
    }

    process.stdout.write(
      `Scenario execution coverage is GREEN: ${required.length} scenarios have executed passing testimony.\n`
    );
  }
}

function collectsTestimony(file: VitestFile): ScenarioExecutionTestimony[] {
  const testimony: ScenarioExecutionTestimony[] = [];
  const relativeFile = path
    .relative(repositoryRoot, file.filepath)
    .split(path.sep)
    .join("/");

  const visits = (task: VitestTask, ancestors: readonly string[]): void => {
    if (task.type === "suite") {
      const nextAncestors =
        task === file || task.name === "" ? ancestors : [...ancestors, task.name];
      for (const child of task.tasks ?? []) {
        visits(child, nextAncestors);
      }
      return;
    }

    if (task.type !== "test") {
      return;
    }

    const fullIdentity = [...ancestors, task.name].join(" ");
    const scenarioIds = [...new Set(fullIdentity.match(SCENARIO_ID_PATTERN) ?? [])];
    const state = task.result?.state;
    const executed = state === "pass" || state === "fail";
    const skipped = task.mode === "skip" || task.mode === "todo" || task.pending === true;
    const filtered = !executed && !skipped;

    for (const scenarioId of scenarioIds) {
      testimony.push({
        testExecutionTestimonyType: "sir-scenario-test-execution.v1",
        scenarioId,
        testIdentity: {
          file: relativeFile,
          suite: ancestors.join(" > "),
          name: task.name
        },
        registered: true,
        selected: executed,
        executed,
        passed: state === "pass",
        skipped,
        filtered
      });
    }
  };

  visits(file, []);
  return testimony;
}
