const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function inBounds(grid, x, y) {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

function isFloor(grid, x, y) {
  return inBounds(grid, x, y) && grid.tiles[y * grid.width + x] === 1;
}

export function neighbors(grid, x, y) {
  const result = [];
  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (isFloor(grid, nx, ny)) result.push({ x: nx, y: ny });
  }
  return result;
}

/**
 * Breadth-first search over the collision grid from `start`.
 * Returns a Map of tile index -> step distance for every reachable floor tile.
 */
export function floodReachable(grid, start) {
  const distances = new Map();
  if (!isFloor(grid, start.x, start.y)) return distances;

  const startIndex = start.y * grid.width + start.x;
  distances.set(startIndex, 0);
  const queue = [startIndex];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const cx = current % grid.width;
    const cy = Math.floor(current / grid.width);
    const currentDistance = distances.get(current);

    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isFloor(grid, nx, ny)) continue;
      const ni = ny * grid.width + nx;
      if (distances.has(ni)) continue;
      distances.set(ni, currentDistance + 1);
      queue.push(ni);
    }
  }

  return distances;
}

export function isReachable(grid, from, to) {
  const distances = floodReachable(grid, from);
  return distances.has(to.y * grid.width + to.x);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * A* pathfinding with Manhattan-distance heuristic over 4-directional
 * movement. Returns a waypoint list from start to goal inclusive, or an
 * empty array when no route exists (including when start === goal, which
 * returns a single-point path).
 */
export function findPath(grid, start, goal) {
  if (!isFloor(grid, start.x, start.y) || !isFloor(grid, goal.x, goal.y)) return [];

  const startIndex = start.y * grid.width + start.x;
  const goalIndex = goal.y * grid.width + goal.x;

  if (startIndex === goalIndex) return [{ x: start.x, y: start.y }];

  const open = new MinHeap();
  const gScore = new Map([[startIndex, 0]]);
  const cameFrom = new Map();
  const closed = new Set();

  open.push({ index: startIndex, x: start.x, y: start.y, priority: manhattan(start.x, start.y, goal.x, goal.y) });

  while (open.size > 0) {
    const current = open.pop();
    if (closed.has(current.index)) continue;
    if (current.index === goalIndex) {
      const path = [{ x: current.x, y: current.y }];
      let cursor = current.index;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor);
        const cx = cursor % grid.width;
        const cy = Math.floor(cursor / grid.width);
        path.push({ x: cx, y: cy });
      }
      path.reverse();
      return path;
    }
    closed.add(current.index);

    for (const next of neighbors(grid, current.x, current.y)) {
      const nextIndex = next.y * grid.width + next.x;
      if (closed.has(nextIndex)) continue;
      const tentativeG = gScore.get(current.index) + 1;
      if (tentativeG < (gScore.get(nextIndex) ?? Infinity)) {
        gScore.set(nextIndex, tentativeG);
        cameFrom.set(nextIndex, current.index);
        open.push({
          index: nextIndex,
          x: next.x,
          y: next.y,
          priority: tentativeG + manhattan(next.x, next.y, goal.x, goal.y),
        });
      }
    }
  }

  return [];
}

