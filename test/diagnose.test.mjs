
  it("allows public program id", () => {
    assert.doesNotThrow(() => assertNoSecrets(OFFICIAL_PROGRAM_ID));
  });
});

describe("repo scan", () => {
  it("flags wrong bonding-curve program id in sample tree", () => {
    const sample = join(root, "test", "sample-repo");
    const d = diagnoseRepo(sample);
    assert.ok(
      d.findings.some((f) => f.id.includes("bonding-curve") || f.id.includes("programId")),
    );
  });
});
