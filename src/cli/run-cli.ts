import path from "node:path";
import { fileURLToPath } from "node:url";

import { CatalogIntegrityError, describesCause } from "../catalog/schema-catalog.js";
import {
  EXIT_CODE,
  resolvesExitCodeForDisposition,
  type ExitCode
} from "../domain/dispositions.js";
import {
  validatesSourceIntegrityRegistry,
  ValidationExecutionError,
  type ValidationReceipt
} from "../validation/validate-registry.js";

export interface CliResult {
  readonly exitCode: ExitCode;
  readonly stdout: string;
  readonly stderr: string;
}

const USAGE = `sir — Source Integrity Registry

Usage:
  sir validate <registry-path> [--catalog <catalog-path>] [--workspace <root>] [--format text|json]

Options:
  --catalog <path>    Trusted schema catalog. Defaults to the packaged catalog.
  --workspace <path>  Workspace root for physical body observation.
                      Omit to run the contract check only.
  --format <format>   Output format: text (default) or json.
  -h, --help          Show this message.

Exit codes:
  0  registry valid
  2  invalid command or arguments
  3  schema not admitted
  4  schema digest mismatch
  5  registry contract invalid
  6  execution failure
`;

/**
 * Runs the CLI and returns its result rather than exiting.
 *
 * Keeping process control at the entrypoint lets tests drive the real command
 * surface, exit codes included, without spawning a child process.
 */
export async function runsCli(argv: readonly string[]): Promise<CliResult> {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { exitCode: EXIT_CODE.INVALID_ARGUMENTS, stdout: USAGE, stderr: "" };
  }

  const [command, ...rest] = argv;
  if (command !== "validate") {
    return {
      exitCode: EXIT_CODE.INVALID_ARGUMENTS,
      stdout: "",
      stderr: `Unknown command "${String(command)}".\n\n${USAGE}`
    };
  }

  let parsed: ParsedArguments;
  try {
    parsed = parsesValidateArguments(rest);
  } catch (cause) {
    return {
      exitCode: EXIT_CODE.INVALID_ARGUMENTS,
      stdout: "",
      stderr: `${describesCause(cause)}\n\n${USAGE}`
    };
  }

  let receipt: ValidationReceipt;
  try {
    receipt = await validatesSourceIntegrityRegistry({
      registryPath: parsed.registryPath,
      schemaCatalogPath: parsed.catalogPath,
      ...(parsed.workspaceRoot === undefined ? {} : { workspaceRoot: parsed.workspaceRoot })
    });
  } catch (cause) {
    // A circuit that cannot reach a verdict must not report one.
    const prefix =
      cause instanceof CatalogIntegrityError || cause instanceof ValidationExecutionError
        ? "SIR execution failure"
        : "Unexpected SIR execution failure";
    return {
      exitCode: EXIT_CODE.EXECUTION_FAILURE,
      stdout: "",
      stderr: `${prefix}: ${describesCause(cause)}\n`
    };
  }

  return {
    exitCode: resolvesExitCodeForDisposition(receipt.disposition),
    stdout:
      parsed.format === "json"
        ? `${JSON.stringify(receipt, null, 2)}\n`
        : rendersReceiptText(receipt),
    stderr: ""
  };
}

interface ParsedArguments {
  readonly registryPath: string;
  readonly catalogPath: string;
  readonly workspaceRoot?: string;
  readonly format: "text" | "json";
}

function parsesValidateArguments(argv: readonly string[]): ParsedArguments {
  let registryPath: string | undefined;
  let catalogPath: string | undefined;
  let workspaceRoot: string | undefined;
  let format: "text" | "json" = "text";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }

    switch (token) {
      case "--catalog":
      case "--workspace":
      case "--format": {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith("--")) {
          throw new Error(`Option ${token} requires a value.`);
        }
        index += 1;

        if (token === "--catalog") {
          catalogPath = value;
        } else if (token === "--workspace") {
          workspaceRoot = value;
        } else {
          if (value !== "text" && value !== "json") {
            throw new Error(`Unsupported --format value "${value}". Use text or json.`);
          }
          format = value;
        }
        break;
      }
      default: {
        if (token.startsWith("--")) {
          throw new Error(`Unknown option "${token}".`);
        }
        if (registryPath !== undefined) {
          throw new Error(`Unexpected extra argument "${token}".`);
        }
        registryPath = token;
      }
    }
  }

  if (registryPath === undefined) {
    throw new Error("A registry path is required.");
  }

  return {
    registryPath,
    catalogPath: catalogPath ?? resolvesPackagedCatalogPath(),
    ...(workspaceRoot === undefined ? {} : { workspaceRoot }),
    format
  };
}

/** Locates the catalog shipped with the package, relative to this module. */
export function resolvesPackagedCatalogPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "contracts", "catalog", "sir-schema-catalog.v1.json");
}

function rendersReceiptText(receipt: ValidationReceipt): string {
  const lines: string[] = [];
  lines.push(`disposition: ${receipt.disposition}`);
  lines.push(`registry:    ${receipt.subject.registryPath}`);
  lines.push(`digest:      ${receipt.subject.registryDigest}`);

  if (receipt.schemaAdmission.declaredSchemaId !== undefined) {
    lines.push(`schema:      ${receipt.schemaAdmission.declaredSchemaId}`);
  }
  lines.push(`admitted:    ${String(receipt.schemaAdmission.admitted)}`);

  if (receipt.observation !== undefined) {
    const conforming = receipt.observation.entries.filter(
      (entry) => entry.conformance === "BODY_CONFORMS"
    ).length;
    lines.push(`observed:    ${conforming}/${receipt.observation.entries.length} bodies conform`);
  }

  if (receipt.findings.length > 0) {
    lines.push("");
    lines.push(`findings (${receipt.findings.length}):`);
    for (const finding of receipt.findings) {
      const location = finding.instancePath === "" ? "(root)" : finding.instancePath;
      lines.push(`  ${finding.code} at ${location}: ${finding.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
