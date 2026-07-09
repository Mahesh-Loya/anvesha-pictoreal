import { describe, it, expect } from "vitest";
import { generateCave, isWalkable, slideMove, makeRng } from "../src/world/cave.js";

describe("cave generator", () => {
  const cave = generateCave();

  it("is deterministic for a given seed", () => {
    const a = generateCave({ seed: 123 });
    const b = generateCave({ seed: 123 });
    expect(a.nodes.length).toBe(b.nodes.length);
    expect(a.nodes[5]).toEqual(b.nodes[5]);
    expect(a.edges.length).toBe(b.edges.length);
  });

  it("places the hub at the origin", () => {
    expect(cave.nodes[0]).toMatchObject({ x: 0, z: 0, hub: true });
  });

  it("keeps chambers spaced apart", () => {
    for (let i = 0; i < cave.nodes.length; i++) {
      for (let j = i + 1; j < cave.nodes.length; j++) {
        const d = Math.hypot(cave.nodes[i].x - cave.nodes[j].x, cave.nodes[i].z - cave.nodes[j].z);
        expect(d).toBeGreaterThan(30);
      }
    }
  });

  it("has more edges than a bare tree (interconnected loops)", () => {
    expect(cave.edges.length).toBeGreaterThan(cave.nodes.length - 1);
  });

  it("keeps the +Z entrance sector clear of chambers", () => {
    for (const n of cave.nodes) if (!n.hub) expect(n.z).toBeLessThanOrEqual(10);
  });

  it("produces the full niche skeleton", () => {
    expect(cave.niches.length).toBe(250);
  });

  it("the whole graph is connected (reachable from the hub)", () => {
    const adj = cave.nodes.map(() => []);
    for (const e of cave.edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const n = stack.pop();
      for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); stack.push(m); }
    }
    expect(seen.size).toBe(cave.nodes.length);
  });

  it("marks the hub centre and entrance walkable, deep rock not", () => {
    expect(isWalkable(cave, 0, 0)).toBe(true);
    expect(isWalkable(cave, 0, cave.gateZ - 2)).toBe(true); // entrance corridor
    expect(isWalkable(cave, 9999, 9999)).toBe(false);
  });

  it("every niche is reachable — the floor in front of it is walkable", () => {
    for (const nz of cave.niches) {
      const fx = nz.x + Math.sin(nz.angle) * 2.2;
      const fz = nz.z + Math.cos(nz.angle) * 2.2;
      expect(isWalkable(cave, fx, fz, 0)).toBe(true);
    }
  });

  it("slideMove refuses to cross a wall but slides along it", () => {
    // from the hub centre, a huge step into rock should be blocked
    const blocked = slideMove(cave, 0, 0, 500, 500, 0.9);
    expect(blocked.x === 0 && blocked.z === 0).toBe(true);
    // a small step within the hub is allowed
    const ok = slideMove(cave, 0, 0, 1, 0, 0.9);
    expect(ok.x).toBeCloseTo(1);
  });

  it("makeRng is reproducible", () => {
    const r1 = makeRng(9), r2 = makeRng(9);
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
  });
});
