#!/usr/bin/env node
import { runsCli } from "./run-cli.js";
import { EXIT_CODE } from "../domain/dispositions.js";

const result = await runsCli(process.argv.slice(2)).catch((cause: unknown) => ({
  exitCode: EXIT_CODE.EXECUTION_FAILURE,
  stdout: "",
  stderr: `Unexpected SIR execution failure: ${
    cause instanceof Error ? cause.message : String(cause)
  }\n`
}));

if (result.stdout !== "") {
  process.stdout.write(result.stdout);
}
if (result.stderr !== "") {
  process.stderr.write(result.stderr);
}

process.exitCode = result.exitCode;
