import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateNativeEvidence } from "../scripts/native-codex-policy.mjs";

// Native GitHub output observed on PR #18, including its nested help footer.
const { head, comment } = JSON.parse(readFileSync(new URL(
  "./fixtures/native-codex-collapsible-summary.json", import.meta.url,
)));
const owner = {
  id: 1, user: { login: "owner", type: "User" }, author_association: "OWNER",
  body: `@codex review ${head}`, created_at: "2026-11-18T23:09:01Z",
};
const evaluate = (body = comment.body, overrides = {}) => evaluateNativeEvidence({
  head, comments: [owner, { ...comment, body, ...overrides }],
});

test("accepts the native collapsible summary with complete current-head evidence", () => {
  assert.equal(evaluate().reviewed, true);
  assert.equal(evaluate(comment.body, {
    createdAt: "2026-11-18T23:09:01Z", updatedAt: "2026-11-18T23:10:06Z",
  }).reviewed, true);
});

test("collapsible presentation preserves identity, schema, clocks, and findings checks", () => {
  const invalid = [
    comment.body.replaceAll(head, "f".repeat(40)),
    comment.body.replace('"has_any_findings":false', '"has_any_findings":true'),
    comment.body.replace('"has_unresolved_findings":false', '"has_unresolved_findings":null'),
    comment.body.replace('"status":"completed"', '"status":"running"'),
    comment.body.replace("✅ Completed</summary>", "🔄 Running</summary>"),
    comment.body.replaceAll("2026-11-18T23:10:06.711067Z", "2099-11-18T23:10:06.711067Z"),
    comment.body.replace("</summary>\n\nThis comment", "</summary>\n\nCredentials leak.\n\nThis comment"),
    comment.body.replace("</details>", "Credentials leak.</details>"),
    comment.body + "\nCredentials leak.",
    "    " + comment.body,
  ];
  for (const body of invalid) assert.equal(evaluate(body).reviewed, false, body);
  assert.equal(evaluate(comment.body, {
    author: { login: "untrusted", __typename: "User" },
  }).reviewed, false);
});
