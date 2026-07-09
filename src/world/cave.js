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

export function generateCave(opts = {}) {
  const {
    seed = 20281,
    targetNodes = 44,
    nicheTarget = 250,
    minSpace = 38,
    tunnelW = 7,
    maxRadius = 195,
    gateZ = 62,
  } = opts;

  const rng = makeRng(seed);
  const nodes = [{ id: 0, x: 0, z: 0, r: 15, hub: true }];
  const edges = [];
  const edgeSet = new Set();
  const addEdge = (a, b) => {
    const k = KEY(a, b);
    if (a === b || edgeSet.has(k)) return;
    edgeSet.add(k);
    edges.push({ a, b });
  };

  // grow the network outward from the hub with Poisson-ish spacing
  let guard = 0;
  while (nodes.length < targetNodes && guard++ < 9000) {
    const parent = nodes[Math.floor(rng() * nodes.length)];
    const ang = rng() * Math.PI * 2;
    const dist = minSpace + rng() * 22;
    const x = parent.x + Math.cos(ang) * dist;
    const z = parent.z + Math.sin(ang) * dist;
    if (z > 10) continue; // keep the +Z sector clear for the entrance corridor
    if (Math.hypot(x, z) > maxRadius) continue;
    if (nodes.some((n) => Math.hypot(n.x - x, n.z - z) < minSpace)) continue;
    nodes.push({ id: nodes.length, x, z, r: 10 + rng() * 5, hub: false });
    addEdge(parent.id, nodes.length - 1);
  }

  // extra loop edges between nearby chambers => interconnected routes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
      if (d < minSpace + 16 && !edgeSet.has(KEY(i, j)) && rng() < 0.4) addEdge(i, j);
    }
  }

  const entrance = { x0: -6, x1: 6, z0: 12, z1: gateZ, gateZ };

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
  return { nodes, edges, niches, entrance, tunnelW, gateZ, seed };
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
