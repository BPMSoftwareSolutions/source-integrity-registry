Feature: Admit a Source Integrity Registry contract
  Before SIR governs source bodies, SIR proves the contract by which source
  bodies may be governed.

  Scenario: Admit a registry governed by an accepted schema
    Given a registry payload declaring an exact accepted schema identity
    When the registry contract is validated
    Then the payload conforms to the declared schema
    And the validation receipt disposition is REGISTRY_CONTRACT_VALID

  Scenario: Reject an unknown schema identity
    Given a registry payload declaring a schema absent from the trusted catalog
    When the registry contract is validated
    Then validation stops before payload evaluation
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  Scenario: Reject a mutated historical schema
    Given an accepted schema identity whose observed bytes do not match its catalog digest
    When the schema is resolved
    Then schema admission is rejected
    And the receipt disposition is SCHEMA_DIGEST_MISMATCH

  Scenario: Reject a structurally invalid registry
    Given a registry payload governed by an accepted schema
    When the registry contract is validated
    Then canonical validation findings identify the invalid instance paths
    And the receipt disposition is REGISTRY_CONTRACT_INVALID

  Scenario: Report drift between declared and observed source bodies
    Given a structurally valid registry payload and a workspace root
    When the declared source bodies are observed
    Then each body reports its own conformance
    And the receipt disposition is SOURCE_BODY_DRIFT
