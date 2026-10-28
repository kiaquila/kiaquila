import { classifyCodexSummaryComment, pickAuthoritativeCodexSkipModeComment } from "./codex-comment-evidence.mjs";
import { hasCodexNegativeHistory, hasCodexPendingSecurityHistory } from "./codex-review-state.mjs";

const bot = entry => entry?.user?.login === "chatgpt-codex-connector[bot]" && entry.user.type === "Bot";
const stamp = entry => Date.parse(entry.created_at || "");
export const normalizeNativeEntry = entry => ({ ...entry,
  id: entry.databaseId ?? entry.id,
  user: entry.user || { login: entry.author?.login === "chatgpt-codex-connector" ? "chatgpt-codex-connector[bot]" : entry.author?.login, type: entry.author?.__typename },
  author_association: entry.author_association || entry.authorAssociation,
  created_at: entry.created_at || entry.createdAt,
  updated_at: entry.updated_at || entry.updatedAt || entry.created_at || entry.createdAt,
});

export function isNativeCleanComment(entry, head) {
  const comment = normalizeNativeEntry(entry);
  return bot(comment) && classifyCodexSummaryComment(comment, head).outcome === "pass";
}

export function evaluateNativeEvidence({ head, comments = [], reviews = [], threads = [] }) {
  const blocking = [];
  if (!/^[a-f0-9]{40}$/.test(head || "")) return { head, reviewed: false, blocking: ["Invalid expected head"] };
  const normalized = comments.map(normalizeNativeEntry);
  const requests = normalized.filter(entry => entry.user?.type === "User" &&
    ["OWNER", "MEMBER", "COLLABORATOR"].includes(entry.author_association) &&
    new RegExp(`^@codex\\s+review\\s+${head}$`, "i").test(String(entry.body || "").trim()) && Number.isFinite(stamp(entry)));
  const request = requests.sort((a,b) => stamp(b)-stamp(a) || Number(b.id)-Number(a.id))[0];
  for (const thread of threads) {
    if (thread.comments?.pageInfo?.hasNextPage) blocking.push("Incomplete review thread comments");
    if (thread.isResolved === false) {
      const entries = (thread.comments?.nodes || []).map(normalizeNativeEntry);
      if (entries.some(entry => bot(entry) || /\bP[0-2]\b/.test(entry.body || "")))
        blocking.push(entries.map(entry => `${entry.path || "review"}: ${String(entry.body || "").split("\n")[0]}`).join("; "));
    }
  }
  const nativeReviews = reviews.map(normalizeNativeEntry).filter(bot);
  for (const review of nativeReviews) {
    if ((review.commit_id || review.commit?.oid) === head &&
        (review.state === "CHANGES_REQUESTED" || (review.state !== "DISMISSED" && /\bP[0-2]\b/.test(review.body || ""))))
      blocking.push("Current-head native review still requests changes");
  }
  if (!request) return { head, reviewed: false, blocking };
  // Formal and comment verdicts share one ordered evidence stream. A full
  // later approval can supersede an older comment, while later unknown or
  // negative evidence still vetoes it. Review state alone never grants approval.
  const formalApprovals = nativeReviews.filter(review => review.state === "APPROVED" &&
    (review.commit_id || review.commit?.oid) === head).map(review => ({...review,
      id: `review-${review.id}`, nativeFormalApproval: true,
      created_at: review.submitted_at || review.submittedAt,
      updated_at: review.submitted_at || review.submittedAt,
    }));
  const eligible = [...normalized.filter(entry => bot(entry) || entry === request), ...formalApprovals]
    .sort((a,b) => stamp(a)-stamp(b) || Number(a.id)-Number(b.id));
  const decision = pickAuthoritativeCodexSkipModeComment({ headSha: head,
    // Separate API connections do not prove same-second cross-type order.
    // Formal evidence stays outside the issue-comment timeline; its missing
    // timeline position makes mixed ties retain every unknown/negative veto.
    timelineEvents: [{ event: "committed", sha: head, created_at: request.created_at }, ...eligible.filter(entry => !entry.nativeFormalApproval)],
    issueComments: eligible.filter(bot),
  });
  if (hasCodexNegativeHistory(eligible, head, bot)) blocking.push("Native findings history is not cleared by a newer valid completion");
  const pendingSecurity = hasCodexPendingSecurityHistory(eligible, head, bot);
  const reviewed = decision?.classification.outcome === "pass";
  return { head, reviewed: reviewed && blocking.length === 0 && !pendingSecurity, blocking, pendingSecurity };
}
