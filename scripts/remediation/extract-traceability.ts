import { readFile } from "node:fs/promises";

import { AstBuilder, Parser, GherkinClassicTokenMatcher } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";
import { marked } from "marked";

import { parsesAuthorityDocument } from "../../src/authority/parse-authority-document.ts";

export type AnalysisStatus =
  | "VALID"
  | "VALID_WITH_REFINEMENT"
  | "ALREADY_SATISFIED"
  | "DEFERRED"
  | "NOT_ADOPTED";

export type ReferenceRole = "authority" | "guard" | "context";

export interface LedgerAssertionReference {
  readonly reference: string;
}

export interface AnalysisBlock {
  readonly analysisMetadataType: "sir-remediation-analysis.v1";
  readonly analysisId: string;
  readonly status: AnalysisStatus;
  readonly supersededBy: string | null;
  readonly evidence: readonly {
    readonly evidenceId: string;
    readonly kind: "ledger-section";
    readonly reference: string;
  }[];
  readonly direction: LedgerAssertionReference;
  readonly integrityGain: LedgerAssertionReference;
  readonly nonDegradationGuards: readonly LedgerAssertionReference[];
  readonly proofBoundary: Readonly<{
    proves: readonly string[];
    doesNotProve: readonly string[];
  }>;
  readonly scenarioCoveragePolicy:
    | Readonly<{
        classification: "scenario-required";
        requiresScenarioCoverage: true;
        rationale: string;
      }>
    | Readonly<{
        classification: "plan-only";
        requiresScenarioCoverage: false;
        rationale: string;
      }>;
}

export interface AnalysisReference {
  readonly analysisId: string;
  readonly role: ReferenceRole;
}

export interface ScenarioMapping {
  readonly scenarioId: string;
  readonly analysisReferences: readonly AnalysisReference[];
}

export interface TraceBlock {
  readonly traceabilityType: "sir-remediation-trace.v1";
  readonly planId: string;
  readonly planReferences: readonly AnalysisReference[];
  readonly scenarioMappings: readonly ScenarioMapping[];
}

export interface FeatureScenario {
  readonly scenarioId: string;
  readonly featurePath: string;
  readonly name: string;
}

/**
 * Extracts typed blocks with the exact given info string.
 *
 * A Markdown parser is used rather than a regular expression so that an
 * ordinary example nested inside a four-backtick ```markdown fence is content,
 * not metadata. Scraping the text would admit documentation as authority.
 */
export function extractsTypedBlocks(markdown: string, infoString: string): unknown[] {
  const tokens = marked.lexer(markdown);
  const blocks: unknown[] = [];

  const visit = (nodes: readonly unknown[]): void => {
    for (const node of nodes) {
      const token = node as { type?: string; lang?: string; text?: string; tokens?: unknown[] };

      if (token.type === "code" && (token.lang ?? "").trim() === infoString) {
        const parsed = parsesAuthorityDocument(new TextEncoder().encode(token.text ?? ""));
        if (parsed.outcome === "failed") {
          throw new Error(
            `A ${infoString} block is not admissible authority: ${parsed.failure.message}`
          );
        }
        blocks.push(parsed.document.value);
        continue;
      }

      if (Array.isArray(token.tokens)) {
        visit(token.tokens);
      }
    }
  };

  visit(tokens);
  return blocks;
}

export async function readsAnalysisBlocks(ledgerPath: string): Promise<AnalysisBlock[]> {
  const markdown = (await readFile(ledgerPath)).toString("utf8");
  return extractsTypedBlocks(markdown, "sir-analysis") as AnalysisBlock[];
}

export async function readsTraceBlocks(planPath: string): Promise<TraceBlock[]> {
  const markdown = (await readFile(planPath)).toString("utf8");
  return extractsTypedBlocks(markdown, "sir-trace") as TraceBlock[];
}

/**
 * Reads scenario tags from feature syntax using a Gherkin parser.
 *
 * Feature text is never scraped: a tag inside a comment or description must
 * not be mistaken for a scenario coordinate.
 */
export async function readsFeatureScenarios(
  featurePaths: readonly string[]
): Promise<FeatureScenario[]> {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  const scenarios: FeatureScenario[] = [];

  for (const featurePath of featurePaths) {
    const source = (await readFile(featurePath)).toString("utf8");
    const document = parser.parse(source);

    for (const child of document.feature?.children ?? []) {
      const scenario = child.scenario;
      if (scenario === undefined) {
        continue;
      }

      for (const tag of scenario.tags) {
        if (/^@sir-(admit|package|provenance)-\d{3}$/u.test(tag.name)) {
          scenarios.push({
            scenarioId: tag.name,
            featurePath,
            name: scenario.name
          });
        }
      }
    }
  }

  return scenarios;
}
