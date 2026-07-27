import { describe, expect, it } from "vitest";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.js";
import { digestsBytes } from "../src/domain/digest.js";
import { createsSirSchemaValidator, validatesGuarded } from "../src/validation/ajv-factory.js";

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * Governing scenarios: @sir-admit-002, @sir-admit-010, @sir-admit-012.
 *
 * The parser is document-neutral, so these prove the primitive itself; the
 * registry, catalog, and schema translations are proven at their own callers.
 */
describe("Duplicate-aware authority parser", () => {
  it("@sir-admit-002 rejects a duplicate member at the document root", () => {
    const result = parsesAuthorityDocument(encode('{"registryId":"a","registryId":"b"}'));

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.kind).toBe("DUPLICATE_MEMBER");
    expect(result.failure.memberName).toBe("registryId");
    expect(result.failure.pointer).toBe("");
  });

  it("@sir-admit-002 rejects a duplicate member at any nesting depth", () => {
    const result = parsesAuthorityDocument(
      encode('{"entries":{"body":{"source":{"hash":"a","hash":"b"}}}}')
    );

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.kind).toBe("DUPLICATE_MEMBER");
    expect(result.failure.memberName).toBe("hash");
    expect(result.failure.pointer).toBe("/entries/body/source");
  });

  it("@sir-admit-002 reports duplicates inside arrays with an indexed pointer", () => {
    const result = parsesAuthorityDocument(encode('{"entries":[{"a":1,"a":2}]}'));

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.pointer).toBe("/entries/0");
  });

  it("@sir-admit-002 escapes RFC 6901 pointer tokens containing ~ and /", () => {
    const result = parsesAuthorityDocument(encode('{"a/b":{"c~d":{"x":1,"x":2}}}'));

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.pointer).toBe("/a~1b/c~0d");
  });

  it("@sir-admit-012 preserves the exact bytes it digested", () => {
    const bytes = encode('{"registryId":"sir-main"}');
    const result = parsesAuthorityDocument(bytes);

    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    expect(result.document.byteDigest).toBe(digestsBytes(bytes));
    expect([...result.document.rawBytes]).toEqual([...bytes]);
  });

  it("@sir-admit-012 returns an owned copy that callers cannot use to alter the digest", () => {
    const bytes = encode('{"a":1}');
    const result = parsesAuthorityDocument(bytes);

    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    const digestBefore = result.document.byteDigest;
    // Mutating the caller's buffer must not retroactively change testimony.
    bytes[2] = 0x62;

    expect(result.document.byteDigest).toBe(digestBefore);
    expect(result.document.rawBytes[2]).not.toBe(0x62);
  });

  it("@sir-admit-002 reports a byte digest even when the parse fails", () => {
    const bytes = encode('{"a":1,"a":2}');
    const result = parsesAuthorityDocument(bytes);

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.byteDigest).toBe(digestsBytes(bytes));
  });

  it("@sir-admit-002 rejects a UTF-8 BOM", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encode('{"a":1}')]);
    const result = parsesAuthorityDocument(bytes);

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.kind).toBe("FORBIDDEN_BOM");
  });

  it("@sir-admit-002 rejects invalid UTF-8 rather than substituting U+FFFD", () => {
    // 0x80 is a continuation byte with no lead byte.
    const result = parsesAuthorityDocument(new Uint8Array([0x7b, 0x80, 0x7d]));

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.kind).toBe("INVALID_UTF8");
  });

  it("@sir-admit-002 rejects trailing non-whitespace input", () => {
    const result = parsesAuthorityDocument(encode('{"a":1} trailing'));

    expect(result.outcome).toBe("failed");
    if (result.outcome !== "failed") return;

    expect(result.failure.kind).toBe("TRAILING_INPUT");
  });

  it("@sir-admit-002 accepts surrounding whitespace", () => {
    expect(parsesAuthorityDocument(encode(' \n\t{"a":1}\n ')).outcome).toBe("parsed");
  });

  it.each([
    ["unterminated object", "{"],
    ["unterminated string", '{"a":"b'],
    ["trailing comma", '{"a":1,}'],
    ["single quotes", "{'a':1}"],
    ["leading zero", '{"a":01}'],
    ["bare NaN", '{"a":NaN}'],
    ["missing colon", '{"a" 1}'],
    ["unescaped control character", '{"a":""}'],
    ["invalid escape", '{"a":"\\q"}'],
    ["empty input", ""]
  ])("@sir-admit-002 rejects invalid JSON grammar: %s", (_label, text) => {
    const result = parsesAuthorityDocument(encode(text));
    expect(result.outcome).toBe("failed");
  });

  it("@sir-admit-012 parses ordinary documents equivalently to JSON.parse", () => {
    const text =
      '{"s":"x","n":-1.5e3,"t":true,"f":false,"z":null,"a":[1,2,{"b":3}],"u":"\\u00e9"}';
    const result = parsesAuthorityDocument(encode(text));

    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    expect(JSON.parse(JSON.stringify(result.document.value))).toEqual(JSON.parse(text));
  });

  it("@sir-admit-012 treats __proto__ as an ordinary member", () => {
    const result = parsesAuthorityDocument(encode('{"__proto__":{"polluted":true}}'));

    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    expect(
      Object.prototype.hasOwnProperty.call(result.document.value as object, "__proto__")
    ).toBe(true);
    // The member is an own data property, which is what prevents pollution.
    // It is defineProperty that establishes this, not a null prototype.
    expect((result.document.value as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("@sir-admit-012 yields objects JSON Schema comparison keywords can evaluate", () => {
    const result = parsesAuthorityDocument(
      encode('{"items":[{"path":"a","sha256":"x"},{"path":"b","sha256":"y"}]}')
    );

    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    // A null-prototype object has no valueOf, and the deep-equality helper
    // behind uniqueItems/const/enum calls it unconditionally. Parsed authority
    // would then throw during validation instead of producing a verdict, so a
    // schema could never witness a defect in the document it was given.
    const validate = createsSirSchemaValidator().compile({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        items: { type: "array", uniqueItems: true, items: { type: "object" } }
      }
    });

    expect(() => validate(result.document.value)).not.toThrow();
    expect(validate(result.document.value)).toBe(true);
  });

  it("@sir-admit-012 turns an unvalidatable document into RED rather than a crash", () => {
    // JSON may define its own "valueOf" member, shadowing the inherited method
    // with a non-callable value. An ordinary prototype does not help here, and
    // enumerating every such shape would be an open-ended guess. What must hold
    // is that the validation boundary always yields a verdict: a checker that
    // throws returns no result at all and cannot refuse bad authority.
    const result = parsesAuthorityDocument(
      encode('{"items":[{"valueOf":1},{"valueOf":2}]}')
    );
    expect(result.outcome).toBe("parsed");
    if (result.outcome !== "parsed") return;

    const validate = createsSirSchemaValidator().compile({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { items: { type: "array", uniqueItems: true } }
    });

    // Unguarded, AJV's deep-equality helper throws on this input.
    expect(() => validate(result.document.value)).toThrow();

    // Guarded, the same input is refused instead of escaping as an exception.
    const verdict = validatesGuarded(validate, result.document.value);
    expect(verdict.outcome).toBe("invalid");
  });
});
