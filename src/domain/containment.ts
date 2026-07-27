import { realpath, stat } from "node:fs/promises";
import path from "node:path";

/** Identity facts compared before and after a read. */
export interface TargetIdentity {
  readonly realPath: string;
  readonly ino: string;
  readonly dev: string;
  readonly size: number;
  readonly mtimeMs: number;
}

export type ContainmentOutcome =
  | {
      readonly outcome: "contained";
      readonly realPath: string;
      readonly identity: TargetIdentity;
    }
  | { readonly outcome: "not-contained"; readonly reason: string }
  | { readonly outcome: "absent"; readonly reason: string };

/**
 * Rejects a relative path on its text alone, before touching the filesystem.
 *
 * This is the first of two layers. It is retained exactly as it was so the
 * real-path layer can only narrow what is accepted, never broaden it.
 */
export function resolvesContainedPath(root: string, relativePath: string): string | undefined {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.includes("\0")) {
    return undefined;
  }

  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, candidate);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  return candidate;
}

/**
 * Resolves a coordinate to a real filesystem target contained by a real root.
 *
 * Lexical containment alone binds a string to a string. A symbolic link or
 * Windows junction inside the root can still resolve to bytes outside it, so
 * containment is re-checked after the target's real identity is known.
 *
 * `realRoot` must already be a resolved real path; the caller establishes the
 * trust root once rather than per coordinate.
 */
export async function resolvesRealContainedPath(
  realRoot: string,
  relativePath: string,
  expected: "file" | "directory"
): Promise<ContainmentOutcome> {
  const lexical = resolvesContainedPath(realRoot, relativePath);
  if (lexical === undefined) {
    return {
      outcome: "not-contained",
      reason: `Declared path "${relativePath}" is rejected by lexical containment rules.`
    };
  }

  let realTarget: string;
  try {
    realTarget = await realpath(lexical);
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return {
        outcome: "absent",
        reason: `Declared path "${relativePath}" does not exist.`
      };
    }
    return {
      outcome: "not-contained",
      reason: `Declared path "${relativePath}" could not be resolved to a real target: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    };
  }

  if (!isContainedBy(realRoot, realTarget)) {
    return {
      outcome: "not-contained",
      reason: `Declared path "${relativePath}" resolves to ${realTarget}, which is outside the real root ${realRoot}.`
    };
  }

  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(realTarget);
  } catch (cause) {
    return {
      outcome: "absent",
      reason: `Declared path "${relativePath}" could not be examined: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    };
  }

  // A directory where a regular file is required is a coordinate error, not a
  // readable body: reject it rather than letting the read fail ambiguously.
  if (expected === "file" && !stats.isFile()) {
    return {
      outcome: "not-contained",
      reason: `Declared path "${relativePath}" is not a regular file.`
    };
  }
  if (expected === "directory" && !stats.isDirectory()) {
    return {
      outcome: "not-contained",
      reason: `Declared path "${relativePath}" is not a directory.`
    };
  }

  return {
    outcome: "contained",
    realPath: realTarget,
    identity: {
      realPath: realTarget,
      ino: String(stats.ino),
      dev: String(stats.dev),
      size: stats.size,
      mtimeMs: stats.mtimeMs
    }
  };
}

/**
 * Reports whether a real target sits under a real root.
 *
 * Comparison goes through `path.relative` rather than string prefixing so that
 * a sibling directory sharing a name prefix is not mistaken for a child.
 */
export function isContainedBy(realRoot: string, realTarget: string): boolean {
  const relative = path.relative(realRoot, realTarget);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** Resolves a root to its real identity, failing closed when it is unusable. */
export async function resolvesRealRoot(root: string): Promise<string | undefined> {
  try {
    const real = await realpath(path.resolve(root));
    const stats = await stat(real);
    return stats.isDirectory() ? real : undefined;
  } catch {
    return undefined;
  }
}
