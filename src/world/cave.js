// ---------------------------------------------------------------------------
// Procedural organic cave network for the Anvesha descent.
//
// Pure module (no THREE / DOM) so it can be unit-tested. It produces:
//   - nodes:   chambers (circles) — node 0 is the central logo hub
//   - edges:   tunnels connecting chambers (a spanning tree + extra loop edges
//              so routes interconnect and you never have to backtrack to centre)
//   - niches:  a flat list of page-slot transforms along tunnel walls and
//              chamber perimeters (target ~250)
//   - entrance: the surface-gate -> hub descent corridor (walkable + ramped)
//
// Collision is analytic against this graph (isWalkable / slideMove): a point is
// walkable if it is inside any chamber circle, near any tunnel segment, or in
// the entrance corridor. No per-wall collision meshes needed.
// ---------------------------------------------------------------------------

// deterministic PRNG (mulberry32) so the cave is identical every reload
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEY = (i, j) => (i < j ? i + "-" + j : j + "-" + i);
const dist0 = (n) => Math.hypot(n.x, n.z);

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const L2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// The route network is shaped like the Pictoreal mandala-eye logo, so the
// minimap literally draws the crest. Deterministic (no RNG): a central iris
// HALL (the emblem), a ring of mandala petals around it, an almond eye-outline
// corridor, eyelash spokes fanning up-and-right, a lotus crown chamber, and an
// outer circular border ring. +Z (positive z) is "down toward the entrance".
export function generateCave(opts = {}) {
  const { nicheTarget = 250, tunnelW = 7, gateZ = 70 } = opts;

  const nodes = [];
  const edges = [];
  const edgeSet = new Set();
  const add = (x, z, r, extra = {}) => {
    nodes.push({ id: nodes.length, x, z, r, hub: false, ...extra });
    return nodes.length - 1;
  };
  // does the tunnel between two nodes cut across the entrance mouth column?
  const crossesEntrance = (a, b) => {
    const A = nodes[a], B = nodes[b];
    for (let t = 0; t <= 1; t += 0.04) {
      const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t;
      if (Math.abs(x) < 11 && z > 26) return true;
    }
    return false;
  };
  const addEdge = (a, b) => {
    const k = KEY(a, b);
    if (a === b || edgeSet.has(k)) return;
    if (crossesEntrance(a, b)) return; // keep the descent into the hall clear
    edgeSet.add(k);
    edges.push({ a, b });
  };
  const nearestByAngle = (list, a) => {
    let best = list[0], bd = Infinity;
    for (const q of list) {
      let d = Math.abs(q.a - a); if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  };

  // --- iris: the large central hall with the emblem ---
  const hub = add(0, 0, 30, { hub: true });
  const ENTRY_A = Math.PI / 2; // entrance direction (+Z)

  // --- mandala petals: alcoves ringing the iris (gap left toward the entrance) ---
  const petals = [];
  const NP = 12;
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2;
    let da = Math.abs(a - ENTRY_A); if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < 0.62) continue; // wide gap so no petal spoke crosses the entrance mouth
    const id = add(Math.cos(a) * 46, Math.sin(a) * 46, 8, { petal: true });
    petals.push({ id, a });
    addEdge(hub, id);
  }
  for (let i = 0; i < petals.length; i++) {
    const j = (i + 1) % petals.length;
    let da = Math.abs(petals[i].a - petals[j].a); if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < 1.1) addEdge(petals[i].id, petals[j].id); // ring them, but not across the gap
  }

  // --- eye almond: the eye-outline corridor loop ---
  const almond = [];
  const NA = 18, RX = 86, RZ = 44;
  for (let i = 0; i < NA; i++) {
    const a = (i / NA) * Math.PI * 2;
    almond.push({ id: add(Math.cos(a) * RX, Math.sin(a) * RZ, 8), a });
  }
  for (let i = 0; i < NA; i++) addEdge(almond[i].id, almond[(i + 1) % NA].id);
  // radial spokes (mandala rays) from every other petal out to the almond
  for (let i = 0; i < petals.length; i += 2) {
    addEdge(petals[i].id, nearestByAngle(almond, petals[i].a).id);
  }

  // --- eyelashes: spokes fanning outward up-and-right (a in (-π/2 .. 0)) ---
  const lashAngles = [-0.28, -0.62, -0.96, -1.3];
  for (const a of lashAngles) {
    const base = nearestByAngle(almond, (a + Math.PI * 2) % (Math.PI * 2));
    const id = add(Math.cos(a) * (RX + 26), Math.sin(a) * (RZ + 30), 7, { lash: true });
    addEdge(base.id, id);
  }

  // --- lotus crown: a far chamber above the eye (-Z) ---
  const topAlmond = nearestByAngle(almond, -Math.PI / 2 + Math.PI * 2);
  const lotus = add(0, -RZ - 26, 12, { lotus: true });
  addEdge(topAlmond.id, lotus);

  // --- outer border ring (the logo's circular frame) ---
  const outer = [];
  const NB = 16, ORX = 116, ORZ = 78;
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2;
    let da = Math.abs(a - ENTRY_A); if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < 0.3) continue; // gap toward the entrance
    outer.push({ id: add(Math.cos(a) * ORX, Math.sin(a) * ORZ, 8), a });
  }
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    let da = Math.abs(outer[i].a - outer[j].a); if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < 0.7) addEdge(outer[i].id, outer[j].id);
  }
  // tie the outer ring in: eye corners, lotus, and a couple of lash chambers
  addEdge(nearestByAngle(almond, 0).id, nearestByAngle(outer, 0).id);
  addEdge(nearestByAngle(almond, Math.PI).id, nearestByAngle(outer, Math.PI).id);
  addEdge(lotus, nearestByAngle(outer, -Math.PI / 2 + Math.PI * 2).id);
  for (const n of nodes.filter((n) => n.lash)) {
    const a = Math.atan2(n.z, n.x);
    addEdge(n.id, nearestByAngle(outer, (a + Math.PI * 2) % (Math.PI * 2)).id);
  }

  const entrance = { x0: -7, x1: 7, z0: 12, z1: gateZ, gateZ };

  // ---- niches: page slots along tunnel walls, then chamber perimeters ----
  const niches = [];
  const push = (x, z, angle, host) => niches.push({ x, z, angle, host });

  // hub-outward order so the first niches (real pages) sit near the start
  const orderedEdges = [...edges].sort(
    (e1, e2) =>
      Math.min(dist0(nodes[e1.a]), dist0(nodes[e1.b])) -
      Math.min(dist0(nodes[e2.a]), dist0(nodes[e2.b]))
  );
  for (const e of orderedEdges) {
    const a = nodes[e.a], b = nodes[e.b];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len; // along the tunnel
    const px = -uz, pz = ux; // perpendicular (points to a wall)
    const usable = len - a.r - b.r; // stay out of the chambers
    if (usable < 9) continue;
    const count = Math.max(1, Math.floor(usable / 8));
    for (let k = 1; k <= count; k++) {
      const s = a.r + (usable * k) / (count + 1);
      const cx = a.x + ux * s, cz = a.z + uz * s;
      const side = k % 2 ? 1 : -1;
      const off = tunnelW - 0.5;
      push(cx + px * off * side, cz + pz * off * side, Math.atan2(-px * side, -pz * side), "tunnel");
      if (niches.length >= nicheTarget) break;
    }
    if (niches.length >= nicheTarget) break;
  }

  // fill the rest around chamber perimeters (skip the hub)
  const perNode = 6;
  for (let round = 0; round < perNode && niches.length < nicheTarget; round++) {
    for (let ni = 1; ni < nodes.length && niches.length < nicheTarget; ni++) {
      const n = nodes[ni];
      const ang = (round / perNode) * Math.PI * 2 + n.id * 0.6;
      const rr = n.r - 1.3;
      push(n.x + Math.cos(ang) * rr, n.z + Math.sin(ang) * rr, Math.atan2(-Math.cos(ang), -Math.sin(ang)), "chamber");
    }
  }

  niches.length = Math.min(niches.length, nicheTarget);
  return { nodes, edges, niches, entrance, tunnelW, gateZ };
}

export function isWalkable(cave, x, z, pad = 0) {
  for (const n of cave.nodes) if (Math.hypot(n.x - x, n.z - z) < n.r - pad) return true;
  for (const e of cave.edges) {
    const a = cave.nodes[e.a], b = cave.nodes[e.b];
    if (distToSeg(x, z, a.x, a.z, b.x, b.z) < cave.tunnelW - pad) return true;
  }
  const en = cave.entrance;
  if (x > en.x0 - pad && x < en.x1 + pad && z > en.z0 - pad && z < en.z1 + 5) return true;
  return false;
}

// move (dx,dz) from (x,z), sliding along walls instead of stopping dead
export function slideMove(cave, x, z, dx, dz, pad = 0.9) {
  if (isWalkable(cave, x + dx, z + dz, pad)) return { x: x + dx, z: z + dz };
  if (isWalkable(cave, x + dx, z, pad)) return { x: x + dx, z };
  if (isWalkable(cave, x, z + dz, pad)) return { x, z: z + dz };
  return { x, z };
}
