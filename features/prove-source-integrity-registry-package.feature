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
