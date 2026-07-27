import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reports whether a module is the process entrypoint.
 *
 * Compares resolved filesystem paths rather than URL strings: on Windows the
 * drive letter and separators make the naive `file://` + argv[1] comparison
 * silently false, which turns a generator into a no-op.
 */
export function isMainModule(moduleUrl: string): boolean {
  const entrypoint = process.argv[1];
  if (entrypoint === undefined) {
    return false;
  }

  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entrypoint);
}
