Feature: Establish Source Integrity Registry release provenance
  Internal consistency is not independent authorization. Catalog and schema
  digests prove that the repository agrees with itself; they do not prove who
  authorized the trusted bytes.

  This authority is deferred until external release. A signature can never turn
  a failed contract or package proof GREEN.

  @sir-provenance-001
  Scenario: Bind an authenticated release to the proven bytes
    Given a signed annotated tag naming an exact commit
    When release provenance is established
    Then the packed tarball digest, catalog digest, and schema digest inventory are recorded
    And the release provenance receipt is separate from any registry validation receipt
    And an unsigned or mismatched release is refused
