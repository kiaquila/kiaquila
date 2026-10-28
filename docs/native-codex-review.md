# Native Codex review gate

Approval requires a trusted owner/member/collaborator request for the full current HEAD and a complete native Codex clean verdict. A reviewed-commit annotation, an empty formal review, a reaction, or lifecycle-only state cannot approve a PR.

The gate reuses the observed response catalog and closed structured-state parser. Reviewer identity includes GitHub Bot type; request timing, code/security completion clocks, stale edits, historical findings and unresolved native threads remain authoritative. Review lists, thread lists and issue comments are paginated; incomplete thread-comment pages block approval. A second full evidence read and final live HEAD check guard the success path.

Local tests cover the full observed response corpus and adversarial authors, SHA, footers, extra findings, machine state and thread pagination. Merge requires all existing checks green, all threads resolved and a 120-second unchanged-evidence window. The gate uses read-only GitHub credentials and preserves protection settings.

A running security review remains pending while the CLI keeps polling. It cannot
approve the PR, and a code receipt cannot finish it; only a later canonical clean
security completion clears that pending state. Actual findings remain failures.

A later lifecycle-only summary with null verdict flags keeps its veto. An older
receipt inside that mutable summary's lifetime cannot prove the later review;
only later valid native verdict evidence can grant approval.
