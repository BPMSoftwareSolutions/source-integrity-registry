Feature: Admit a Source Integrity Registry contract
  Before SIR governs source bodies, SIR proves the contract by which source
  bodies may be governed.

  Authority admission precedes contract evaluation, and contract evaluation
  precedes physical observation. No later layer may turn an earlier layer's RED
  result GREEN.

  @sir-admit-001
  Scenario: Give each declared body a structurally unique coordinate
    Given a registry payload declaring two bodies under one body identity
    When the registry contract is validated
    Then the two declarations cannot occupy one parsed coordinate
    And the receipt disposition is REGISTRY_CONTRACT_INVALID

  @sir-admit-002
  Scenario: Reject a duplicate member name in registry authority
    Given a registry payload whose raw JSON repeats a member name
    When the registry authority is parsed
    Then the duplicate member is reported with its containing pointer
    And the receipt disposition is REGISTRY_CONTRACT_INVALID

  @sir-admit-003
  Scenario: Admit a registry governed by an accepted schema
    Given a registry payload declaring an exact accepted schema identity
    When the registry contract is validated
    Then the payload conforms to the declared schema
    And the validation receipt disposition is REGISTRY_CONTRACT_VALID

  @sir-admit-004
  Scenario: Reject an unknown schema identity
    Given a registry payload declaring a schema absent from the trusted catalog
    When the registry contract is validated
    Then validation stops before payload evaluation
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-005
  Scenario: Admit the catalog contract before consulting catalog entries
    Given a caller catalog that violates the packaged catalog contract
    When the schema catalog is admitted
    Then no catalog entry is consulted
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-006
  Scenario: Reject duplicate catalog authority
    Given a caller catalog repeating a member name or a schema identity
    When the schema catalog is admitted
    Then catalog admission fails before entry lookup
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-007
  Scenario: Reject schema bytes that disagree with the admitted digest
    Given an accepted schema identity whose observed bytes do not match its catalog digest
    When the schema is resolved
    Then schema admission is rejected
    And the receipt disposition is SCHEMA_DIGEST_MISMATCH

  @sir-admit-008
  Scenario: Bind the loaded schema identity to the admitted identity
    Given a catalog entry whose digest matches schema bytes declaring a different identity
    When the schema is resolved
    Then the requested, catalog, and loaded identities are required to agree
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-009
  Scenario: Bind the loaded schema dialect, family, and version
    Given an admitted schema whose dialect, family, or version contradicts its catalog entry
    When the schema is resolved
    Then the contradiction is reported as an identity disagreement
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-010
  Scenario: Reject a duplicate member name in loaded schema authority
    Given an admitted schema whose raw JSON repeats a member name
    When the schema authority is parsed
    Then the schema is not compiled
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-011
  Scenario: Reject a structurally invalid registry
    Given a registry payload governed by an accepted schema
    When the registry contract is validated
    Then canonical validation findings identify the invalid instance paths
    And the receipt disposition is REGISTRY_CONTRACT_INVALID

  @sir-admit-012
  Scenario: Preserve the exact authority bytes that were validated
    Given a registry payload governed by an accepted schema
    When the registry contract is validated
    Then no default is inserted, no value is coerced, and no member is renamed
    And the payload bytes are unchanged

  @sir-admit-013
  Scenario: Require schema coordinates to resolve inside the real contracts root
    Given a catalog entry whose path resolves outside the real contracts root
    When the schema is resolved
    Then schema admission is rejected
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  @sir-admit-014
  Scenario: Require source coordinates to resolve inside the real workspace root
    Given a declared body whose path resolves outside the real workspace root
    When the declared source bodies are observed
    Then the body reports a containment failure rather than a digest comparison
    And the receipt disposition is SOURCE_BODY_DRIFT

  @sir-admit-015
  Scenario: Observe one conforming whole-file source body
    Given a declared body whose observed bytes match its declared digest
    When the declared source bodies are observed
    Then the body conformance is BODY_CONFORMS
    And the receipt disposition is REGISTRY_CONTRACT_VALID

  @sir-admit-016
  Scenario: Observe one changed whole-file source body
    Given a declared body whose observed bytes differ from its declared digest
    When the declared source bodies are observed
    Then the body conformance is BODY_HASH_MISMATCH
    And the receipt disposition is SOURCE_BODY_DRIFT

  @sir-admit-017
  Scenario: Aggregate nonconforming bodies deterministically
    Given several declared bodies that do not conform
    When the declared source bodies are observed
    Then every nonconforming body is reported in code-point order
    And the receipt disposition is SOURCE_BODY_DRIFT
