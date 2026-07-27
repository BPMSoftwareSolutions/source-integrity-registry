import { describe, expect, it } from "vitest";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.js";
import { digestsBytes } from "../src/domain/digest.js";

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
  });
});
