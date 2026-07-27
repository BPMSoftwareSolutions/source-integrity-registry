Feature: Prove the Source Integrity Registry package
  Package mechanics are a separate authority from registry admission. This
  feature governs how the repository proves that its source, generated
  authority, and shipped artifact agree.

  A separate feature is not a weaker gate. Completion requires every applicable
  feature to be GREEN.

  @sir-package-001
  Scenario: Prove the repository without mutating tracked authority
    Given a clean input workspace
    When the operator runs the sole pre-release proof command
    Then the documented default test command passes unmodified
    And the proof completes without package lifecycle recursion
    And tracked content after the proof equals tracked content before it

  @sir-package-002
  Scenario: Fail on stale generated authority rather than repairing it
    Given a committed catalog or generated declaration that no longer matches its source
    When the generated authority is checked
    Then the check reports the stale artifact
    And no generated artifact is rewritten during proof

  @sir-package-003
  Scenario: Prove the packed consumer surface
    Given a freshly packed tarball installed into a temporary consumer
    When the consumer imports the library, invokes the CLI, and resolves the packaged catalog
    Then every catalog-referenced schema is present in the installed package
    And the consumer never falls back to repository source

  @sir-package-004
  Scenario: Prove the remediation traceability graph
    Given the analysis ledger, the remediation plan, and the feature scenario tags
    When the remediation traceability projection is checked
    Then every analysis, plan, and scenario coordinate resolves with a permitted role
    And the committed projection matches deterministic regeneration

  @sir-package-005
  Scenario: Admit only integrity-complete remediation analyses
    Given an analysis proposed as remediation authority
    When remediation admission is evaluated
    Then evidence, direction, integrity gain, non-degradation guards, proof limits, and coverage policy are structurally required
    And an incomplete analysis cannot become plan authority

  @sir-package-006
  Scenario: Enforce declared analysis-to-scenario coverage
    Given adopted analyses with explicit scenario coverage policies
    When the remediation graph is evaluated
    Then every scenario-required analysis has an explicit scenario edge
    And a plan-only analysis is not assigned a manufactured scenario edge

  @sir-package-007
  Scenario: Preserve the canonical projection when remediation governance is invalid
    Given schema-invalid, graph-invalid, or projection-contract-invalid remediation input
    When explicit remediation-index generation is requested
    Then diagnostics are reported before any canonical projection is written
    And the existing committed projection remains byte-for-byte unchanged

  @sir-package-008
  Scenario: Prove scenario coverage from executed tests
    Given the current feature scenario identities
    When the default test command completes
    Then every scenario has registered, selected, executed, passing testimony
    And skipped, filtered, failed, or source-only references do not satisfy coverage

  @sir-package-009
  Scenario: Require feature authority before implementation
    Given an implementation change governed by remediation analyses and feature scenarios
    When repository history is evaluated
    Then a valid authority checkpoint exists in a parent commit
    And the checkpoint binds the analyses, plans, scenarios, feature bytes, validated projection, and implementation scope

  @sir-package-010
  Scenario: Preserve exact admitted documentation origin bytes
    Given a supplied document admitted under an immutable origin snapshot identity
    When repository proof verifies the origin snapshot
    Then the exact supplied byte sequence remains retrievable
    And its raw byte length and digest match the admitted identity
    And text normalization cannot silently replace the admitted bytes
    And changed source bytes require a new snapshot identity

  @sir-package-011
  Scenario: Reproduce a derived document from admitted origin and transformation
    Given immutable origin bytes and a closed documentation derivation declaration
    When repository proof reconstructs the derived document in temporary storage
    Then the declared transformation consumes the admitted origin bytes
    And the reconstructed output matches the declared derived digest
    And proof does not rewrite the origin, transformation, or derived authority
    And missing or mismatched derivation evidence fails closed

  @sir-package-012
  Scenario: Admit an exact remediation proof surface before implementation
    Given a schema-valid remediation proof surface committed with its governing authority
    When a remediation authority checkpoint is created
    Then the checkpoint binds the proof-surface identity, path, and exact digest
    And governed implementation must descend from that checkpoint
    And a missing, unknown, changed, or unbound proof surface cannot authorize implementation

  @sir-package-013
  Scenario: Earn remediation closure for an exact proof subject
    Given an admitted proof surface bound by an ancestor remediation authority checkpoint
    And an implementation subject matching the checkpoint scope
    When deterministic remediation proof is executed
    Then every required observation retains its GREEN, RED, or NO_VERDICT raw outcome
    And every expected outcome, finding code, and cardinality is evaluated separately
    And closure is earned only from complete satisfied testimony for the exact subject
    And a changed subject requires reproof without invalidating historical testimony
