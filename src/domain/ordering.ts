/**
 * Compares strings by Unicode code point.
 *
 * `localeCompare` orders differently depending on the runtime's locale, so
 * equal authority inputs could otherwise produce differently ordered testimony
 * on different hosts. This comparator depends on nothing but the strings.
 *
 * JavaScript's `<` compares UTF-16 code units, which mis-orders supplementary
 * characters against those in U+E000..U+FFFF; iterating code points avoids
 * that without needing a surrogate-range correction.
 */
export function comparesByCodePoint(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const leftPoints = Array.from(left);
  const rightPoints = Array.from(right);
  const shared = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < shared; index += 1) {
    const leftPoint = (leftPoints[index] as string).codePointAt(0) ?? 0;
    const rightPoint = (rightPoints[index] as string).codePointAt(0) ?? 0;

    if (leftPoint !== rightPoint) {
      return leftPoint < rightPoint ? -1 : 1;
    }
  }

  if (leftPoints.length === rightPoints.length) {
    return 0;
  }

  return leftPoints.length < rightPoints.length ? -1 : 1;
}

/**
 * Builds an object whose members are inserted in code-point key order.
 *
 * Keyed testimony would otherwise retain input insertion order, making equal
 * inputs serialize differently.
 */
export function ordersRecordByKey<T>(entries: readonly (readonly [string, T])[]): Record<string, T> {
  const sorted = [...entries].sort(([left], [right]) => comparesByCodePoint(left, right));
  const result: Record<string, T> = {};

  for (const [key, value] of sorted) {
    result[key] = value;
  }

  return result;
}
