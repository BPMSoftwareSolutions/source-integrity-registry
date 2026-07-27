import ajv2020Module from "ajv/dist/2020.js";
import ajvFormatsModule from "ajv-formats";

/**
 * AJV and ajv-formats ship as CommonJS with `export =`. Under NodeNext the
 * imported binding is the module namespace, so the callable value lives on
 * `.default` at runtime while older bundlers hand back the callable directly.
 * Normalizing here keeps that interop detail out of every call site.
 */
type Ajv2020Constructor = typeof import("ajv/dist/2020.js").default;

const Ajv2020 = ((ajv2020Module as unknown as { default?: Ajv2020Constructor }).default ??
  ajv2020Module) as Ajv2020Constructor;

type AddFormats = typeof import("ajv-formats").default;

const addFormats = ((ajvFormatsModule as unknown as { default?: AddFormats }).default ??
  ajvFormatsModule) as AddFormats;

export type SirValidator = InstanceType<Ajv2020Constructor>;

/**
 * Builds the AJV instance used for every SIR validation.
 *
 * Draft 2020-12 only. AJV's 2020 class is not intended to share an instance
 * with earlier drafts, and admitting a second dialect would mean a payload's
 * meaning depended on which validator happened to compile it.
 */
export function createsSirSchemaValidator(): SirValidator {
  const ajv = new Ajv2020({
    strict: true,
    validateSchema: true,
    allErrors: true,

    // Validation must never mutate authority payloads.
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,

    // Ignore inherited object properties.
    ownProperties: true,

    // A URI-shaped $id is an identity, not a retrieval instruction. Refusing
    // to load unknown references keeps validation offline and deterministic.
    loadSchema: async (uri: string) => {
      throw new Error(
        `SIR never retrieves schemas from the network. Unresolved reference: ${uri}`
      );
    }
  });

  addFormats(ajv);
  return ajv;
}

/** A validation verdict that a thrown exception cannot escape. */
export type GuardedValidation =
  | { readonly outcome: "valid" }
  | { readonly outcome: "invalid"; readonly errors: string };

/**
 * Applies a compiled validator so that a thrown exception becomes RED.
 *
 * A validator that throws is strictly worse than one returning `false`: the
 * caller gets no verdict at all, and a checker whose purpose is to refuse bad
 * authority instead crashes. AJV reaches that state on inputs it cannot
 * compare — `uniqueItems`, `const`, and `enum` delegate to a deep-equality
 * helper that calls `valueOf()` on its operands, and JSON may legitimately
 * define its own `"valueOf"` member, shadowing the inherited method with a
 * non-callable value.
 *
 * Enumerating every such shape would be an open-ended guess, and stripping
 * them would change the document's JSON meaning. Converting the exception into
 * an explicit invalid verdict is closed and preserves the fail-closed
 * property: unvalidatable authority is never admitted.
 */
export function validatesGuarded(
  validate: (value: unknown) => boolean,
  value: unknown
): GuardedValidation {
  let valid: boolean;
  try {
    valid = validate(value);
  } catch (cause) {
    return {
      outcome: "invalid",
      errors: `Validation could not produce a verdict for this document: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    };
  }

  if (valid) {
    return { outcome: "valid" };
  }

  const errors = (validate as { errors?: unknown }).errors;
  return { outcome: "invalid", errors: JSON.stringify(errors) };
}
