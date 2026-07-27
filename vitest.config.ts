import { defineConfig } from "vitest/config";

import { ScenarioExecutionReporter } from "./scripts/remediation/scenario-execution-reporter.ts";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    reporters: ["default", new ScenarioExecutionReporter()],

    /**
     * Bounded workers, committed as authority.
     *
     * Unbounded pool sizing fails with `spawn UNKNOWN` on high-core Windows
     * hosts, which would make the documented proof command differ from the
     * command that actually establishes GREEN. This changes scheduling only:
     * it does not narrow discovery or weaken any assertion.
     */
    minWorkers: 1,
    maxWorkers: 1
  }
});
