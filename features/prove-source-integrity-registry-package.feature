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
