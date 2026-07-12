// Global page likes — "light a diya for this page" — backed by Firebase
// Firestore's free tier via plain REST (no SDK, ~0 bytes of dependency).
//
// Degrades gracefully by design: if likesConfig is empty or the network/rules
// reject us, callers get null / false and the UI simply doesn't render counts.
// The game itself never depends on this.
//
// One like per device per page, enforced locally (localStorage) and softly
// server-side (rules only allow ±1 steps). Unlike is allowed.
import { likesConfig } from "../content/likes-config.js";

const LIKED_KEY = "pv28-liked";

export function likesEnabled() {
  return Boolean(likesConfig.projectId && likesConfig.apiKey);
}

const docUrl = (pageId) =>
  `https://firestore.googleapis.com/v1/projects/${likesConfig.projectId}` +
  `/databases/(default)/documents/likes/${encodeURIComponent(pageId)}?key=${likesConfig.apiKey}`;
const commitUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${likesConfig.projectId}` +
  `/databases/(default)/documents:commit?key=${likesConfig.apiKey}`;

function timeoutSignal(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function myLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY)) || []); } catch { return new Set(); }
}
function saveMyLikes(set) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...set])); } catch {}
}

export function hasLiked(pageId) {
  return myLikes().has(pageId);
}

// current diya count for a page, or null when unavailable
export async function getLikes(pageId) {
  if (!likesEnabled()) return null;
  try {
    const res = await fetch(docUrl(pageId), { signal: timeoutSignal(5000) });
    if (res.status === 404) return 0; // nobody has lit one yet
    if (!res.ok) return null;
    const doc = await res.json();
    return parseInt(doc.fields?.count?.integerValue ?? "0", 10);
  } catch { return null; }
}

// toggle my like; returns the delta applied (+1 / -1) or 0 on failure
export async function toggleLike(pageId) {
  if (!likesEnabled()) return 0;
  const mine = myLikes();
  const delta = mine.has(pageId) ? -1 : 1;
  try {
    const body = {
      writes: [{
        update: {
          name: `projects/${likesConfig.projectId}/databases/(default)/documents/likes/${pageId}`,
          fields: {},
        },
        // empty mask = patch nothing, so the increment applies to the REAL
        // stored count (without it the write would replace the doc first and
        // every like after the first would violate the ±1 rules)
        updateMask: { fieldPaths: [] },
        updateTransforms: [{ fieldPath: "count", increment: { integerValue: String(delta) } }],
      }],
    };
    const res = await fetch(commitUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeoutSignal(6000),
    });
    if (!res.ok) return 0;
    if (delta > 0) mine.add(pageId); else mine.delete(pageId);
    saveMyLikes(mine);
    return delta;
  } catch { return 0; }
}
