import { digestsBytes, type Sha256Digest } from "../domain/digest.js";

/**
 * Successful parse of an authority document.
 *
 * `rawBytes` is an owned defensive copy. TypeScript `readonly` does not make
 * typed-array elements immutable, so the parser never hands back a view onto a
 * buffer a caller could still mutate after digesting.
 */
export type ParsedAuthorityDocument = Readonly<{
  rawBytes: Uint8Array;
  value: unknown;
  byteDigest: Sha256Digest;
}>;

export type AuthorityParseFailureKind =
  | "INVALID_UTF8"
  | "FORBIDDEN_BOM"
  | "INVALID_JSON_GRAMMAR"
  | "TRAILING_INPUT"
  | "DUPLICATE_MEMBER";

/**
 * Document-neutral parse failure.
 *
 * The parser never names a registry, catalog, or schema: callers translate this
 * into their own stable SIR finding codes, so one parser can serve every
 * authority document without inventing a disposition of its own.
 */
export interface AuthorityParseFailure {
  readonly kind: AuthorityParseFailureKind;
  readonly message: string;
  /** RFC 6901 pointer to the object containing the fault, when known. */
  readonly pointer?: string;
  /** Duplicated member name, for DUPLICATE_MEMBER. */
  readonly memberName?: string;
  /** Byte offset, when reliably available. */
  readonly byteOffset?: number;
}

export type AuthorityParseResult =
  | { readonly outcome: "parsed"; readonly document: ParsedAuthorityDocument }
  | {
      readonly outcome: "failed";
      readonly failure: AuthorityParseFailure;
      /**
       * Digest of the exact bytes received. Available even on failure because
       * digesting precedes decoding, so a receipt can still name the subject
       * it refused.
       */
      readonly byteDigest: Sha256Digest;
    };

/** Escapes a member name for use in an RFC 6901 pointer. */
export function escapesJsonPointerToken(token: string): string {
  return token.replace(/~/gu, "~0").replace(/\//gu, "~1");
}

export function joinsJsonPointer(parent: string, token: string): string {
  return `${parent}/${escapesJsonPointerToken(token)}`;
}

/**
 * Parses authority bytes, preserving evidence that ordinary parsing destroys.
 *
 * `JSON.parse` silently keeps the last of several duplicate members, so a
 * document can carry two conflicting declarations while presenting one. SIR
 * must witness that, which requires walking the grammar directly. There is no
 * fallback to `JSON.parse`, no regular-expression parsing, and no repair.
 */
export function parsesAuthorityDocument(bytes: Uint8Array): AuthorityParseResult {
  // Digest the exact bytes received, before any decoding or reserialization.
  const rawBytes = Uint8Array.prototype.slice.call(bytes);
  const byteDigest = digestsBytes(rawBytes);

  const refuses = (failure: AuthorityParseFailure): AuthorityParseResult => ({
    outcome: "failed",
    failure,
    byteDigest
  });

  if (rawBytes[0] === 0xef && rawBytes[1] === 0xbb && rawBytes[2] === 0xbf) {
    return refuses({
      kind: "FORBIDDEN_BOM",
      message: "Authority bytes begin with a UTF-8 BOM, which is not admitted.",
      byteOffset: 0
    });
  }

  let text: string;
  try {
    // Fatal decoding: a lone surrogate or invalid sequence must not be
    // silently replaced with U+FFFD, which would change the parsed meaning.
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(rawBytes);
  } catch (cause) {
    return refuses({
      kind: "INVALID_UTF8",
      message: `Authority bytes are not valid UTF-8: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    });
  }

  const reader = new AuthorityReader(text);

  let value: unknown;
  try {
    reader.skipWhitespace();
    value = reader.readValue("");
    reader.skipWhitespace();

    if (!reader.atEnd()) {
      return refuses({
        kind: "TRAILING_INPUT",
        message: `Unexpected non-whitespace input after the JSON document at offset ${reader.offset}.`,
        byteOffset: reader.offset
      });
    }
  } catch (cause) {
    if (cause instanceof AuthorityParseError) {
      return refuses(cause.failure);
    }
    throw cause;
  }

  return { outcome: "parsed", document: { rawBytes, value, byteDigest } };
}

class AuthorityParseError extends Error {
  public constructor(public readonly failure: AuthorityParseFailure) {
    super(failure.message);
    this.name = "AuthorityParseError";
  }
}

/**
 * A minimal, strict RFC 8259 reader.
 *
 * It differs from `JSON.parse` in exactly one respect that matters here: a
 * repeated member name is an error carrying its location rather than a silent
 * overwrite.
 */
class AuthorityReader {
  public offset = 0;

  public constructor(private readonly text: string) {}

  public atEnd(): boolean {
    return this.offset >= this.text.length;
  }

  public skipWhitespace(): void {
    while (this.offset < this.text.length) {
      const code = this.text.charCodeAt(this.offset);
      // Space, tab, line feed, carriage return only. JSON admits no others.
      if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
        this.offset += 1;
        continue;
      }
      break;
    }
  }

  public readValue(pointer: string): unknown {
    if (this.atEnd()) {
      this.fail("INVALID_JSON_GRAMMAR", "Unexpected end of input where a value was expected.", pointer);
    }

    const character = this.text[this.offset];

    switch (character) {
      case "{":
        return this.readObject(pointer);
      case "[":
        return this.readArray(pointer);
      case '"':
        return this.readString(pointer);
      case "t":
        return this.readLiteral("true", true, pointer);
      case "f":
        return this.readLiteral("false", false, pointer);
      case "n":
        return this.readLiteral("null", null, pointer);
      default:
        return this.readNumber(pointer);
    }
  }

  private readObject(pointer: string): Record<string, unknown> {
    this.expect("{", pointer);
    // An ordinary prototype, not Object.create(null). Prototype pollution is
    // already prevented below by defining members with defineProperty, which
    // never invokes a "__proto__" setter. A null-prototype object additionally
    // lacks valueOf, and JSON Schema comparison keywords such as uniqueItems
    // over objects call it unconditionally, so parsed authority would throw
    // during validation instead of being validated.
    const result: Record<string, unknown> = {};
    const seen = new Set<string>();

    this.skipWhitespace();
    if (this.peek() === "}") {
      this.offset += 1;
      return result;
    }

    for (;;) {
      this.skipWhitespace();

      if (this.peek() !== '"') {
        this.fail("INVALID_JSON_GRAMMAR", "Expected a member name string.", pointer);
      }

      const nameOffset = this.offset;
      const name = this.readString(pointer);

      if (seen.has(name)) {
        throw new AuthorityParseError({
          kind: "DUPLICATE_MEMBER",
          message: `Duplicate member name ${JSON.stringify(name)} in the object at ${
            pointer === "" ? "the document root" : pointer
          }.`,
          pointer: pointer === "" ? "" : pointer,
          memberName: name,
          byteOffset: nameOffset
        });
      }
      seen.add(name);

      this.skipWhitespace();
      this.expect(":", pointer);
      this.skipWhitespace();

      const memberPointer = joinsJsonPointer(pointer, name);
      const value = this.readValue(memberPointer);

      // Defined via defineProperty so a member literally named "__proto__"
      // becomes an ordinary own property instead of touching the prototype.
      Object.defineProperty(result, name, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });

      this.skipWhitespace();
      const next = this.peek();

      if (next === ",") {
        this.offset += 1;
        continue;
      }
      if (next === "}") {
        this.offset += 1;
        return result;
      }

      this.fail("INVALID_JSON_GRAMMAR", "Expected \",\" or \"}\" in object.", pointer);
    }
  }

  private readArray(pointer: string): unknown[] {
    this.expect("[", pointer);
    const result: unknown[] = [];

    this.skipWhitespace();
    if (this.peek() === "]") {
      this.offset += 1;
      return result;
    }

    for (let index = 0; ; index += 1) {
      this.skipWhitespace();
      result.push(this.readValue(`${pointer}/${index}`));
      this.skipWhitespace();

      const next = this.peek();
      if (next === ",") {
        this.offset += 1;
        continue;
      }
      if (next === "]") {
        this.offset += 1;
        return result;
      }

      this.fail("INVALID_JSON_GRAMMAR", "Expected \",\" or \"]\" in array.", pointer);
    }
  }

  private readString(pointer: string): string {
    this.expect('"', pointer);
    let result = "";

    for (;;) {
      if (this.atEnd()) {
        this.fail("INVALID_JSON_GRAMMAR", "Unterminated string.", pointer);
      }

      const character = this.text[this.offset] as string;
      const code = character.charCodeAt(0);

      if (character === '"') {
        this.offset += 1;
        return result;
      }

      if (character === "\\") {
        this.offset += 1;
        result += this.readEscape(pointer);
        continue;
      }

      // RFC 8259 forbids unescaped control characters inside strings.
      if (code < 0x20) {
        this.fail(
          "INVALID_JSON_GRAMMAR",
          `Unescaped control character U+${code.toString(16).padStart(4, "0").toUpperCase()} in string.`,
          pointer
        );
      }

      result += character;
      this.offset += 1;
    }
  }

  private readEscape(pointer: string): string {
    if (this.atEnd()) {
      this.fail("INVALID_JSON_GRAMMAR", "Unterminated escape sequence.", pointer);
    }

    const character = this.text[this.offset] as string;
    this.offset += 1;

    switch (character) {
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u": {
        const hex = this.text.slice(this.offset, this.offset + 4);
        if (!/^[0-9a-fA-F]{4}$/u.test(hex)) {
          this.fail("INVALID_JSON_GRAMMAR", `Invalid \\u escape sequence "${hex}".`, pointer);
        }
        this.offset += 4;
        return String.fromCharCode(Number.parseInt(hex, 16));
      }
      default:
        this.fail("INVALID_JSON_GRAMMAR", `Invalid escape character "\\${character}".`, pointer);
    }
  }

  private readNumber(pointer: string): number {
    const start = this.offset;

    if (this.peek() === "-") {
      this.offset += 1;
    }

    // Leading zeros are not admitted by the JSON grammar.
    if (this.peek() === "0") {
      this.offset += 1;
    } else if (this.isDigit(this.peek())) {
      while (this.isDigit(this.peek())) {
        this.offset += 1;
      }
    } else {
      this.fail("INVALID_JSON_GRAMMAR", "Invalid number literal.", pointer);
    }

    if (this.peek() === ".") {
      this.offset += 1;
      if (!this.isDigit(this.peek())) {
        this.fail("INVALID_JSON_GRAMMAR", "Expected a digit after the decimal point.", pointer);
      }
      while (this.isDigit(this.peek())) {
        this.offset += 1;
      }
    }

    const exponent = this.peek();
    if (exponent === "e" || exponent === "E") {
      this.offset += 1;
      const sign = this.peek();
      if (sign === "+" || sign === "-") {
        this.offset += 1;
      }
      if (!this.isDigit(this.peek())) {
        this.fail("INVALID_JSON_GRAMMAR", "Expected a digit in the exponent.", pointer);
      }
      while (this.isDigit(this.peek())) {
        this.offset += 1;
      }
    }

    const literal = this.text.slice(start, this.offset);
    const value = Number(literal);

    if (!Number.isFinite(value)) {
      this.fail("INVALID_JSON_GRAMMAR", `Number literal "${literal}" is not finite.`, pointer);
    }

    return value;
  }

  private readLiteral<T>(literal: string, value: T, pointer: string): T {
    if (this.text.startsWith(literal, this.offset)) {
      this.offset += literal.length;
      return value;
    }
    this.fail("INVALID_JSON_GRAMMAR", `Expected literal "${literal}".`, pointer);
  }

  private isDigit(character: string | undefined): boolean {
    return character !== undefined && character >= "0" && character <= "9";
  }

  private peek(): string | undefined {
    return this.text[this.offset];
  }

  private expect(character: string, pointer: string): void {
    if (this.peek() !== character) {
      this.fail("INVALID_JSON_GRAMMAR", `Expected "${character}" at offset ${this.offset}.`, pointer);
    }
    this.offset += 1;
  }

  private fail(kind: AuthorityParseFailureKind, message: string, pointer: string): never {
    throw new AuthorityParseError({
      kind,
      message,
      pointer,
      byteOffset: this.offset
    });
  }
}
