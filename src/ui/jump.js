// Shared "jump the Sutradhar to a page" handler, registered once by the 3D
// scene and used by both the Index (contents) and the Collection (journal).
let handler = null;
export function setJumpHandler(fn) { handler = fn; }
export function jumpToPage(pageId) { if (handler) handler(pageId); }
