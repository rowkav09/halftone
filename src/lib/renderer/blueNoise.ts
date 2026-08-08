const DEFAULT_SIZE = 32;
const DEFAULT_SIGMA = 1.7;

type Random = () => number;

export const createDeterministicRandom = (seed: number): Random => {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
};

const gaussianKernel = (sigma: number) => {
  const radius = Math.ceil(sigma * 3);
  const kernel = new Float64Array(radius * 2 + 1);
  let total = 0;
  for (let index = -radius; index <= radius; index += 1) {
    const value = Math.exp(-(index * index) / (2 * sigma * sigma));
    kernel[index + radius] = value;
    total += value;
  }
  for (let index = 0; index < kernel.length; index += 1) {
    kernel[index] = (kernel[index] ?? 0) / total;
  }
  return { kernel, radius };
};

const createEnergy = (pattern: Uint8Array, size: number, kernel: Float64Array, radius: number) => {
  const energy = new Float64Array(pattern.length);
  const update = (index: number, amount: number) => {
    const sourceX = index % size;
    const sourceY = Math.floor(index / size);
    for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
      const y = (sourceY + yOffset + size) % size;
      const yWeight = kernel[yOffset + radius] ?? 0;
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        const x = (sourceX + xOffset + size) % size;
        energy[y * size + x] += amount * yWeight * (kernel[xOffset + radius] ?? 0);
      }
    }
  };
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === 1) update(index, 1);
  }
  return { energy, update };
};

const findExtreme = (pattern: Uint8Array, energy: Float64Array, occupied: boolean) => {
  let bestIndex = 0;
  let bestValue = occupied ? -Infinity : Infinity;
  for (let index = 0; index < pattern.length; index += 1) {
    const matches = occupied ? pattern[index] === 1 : pattern[index] === 0;
    if (!matches) continue;
    const value = energy[index] ?? 0;
    if ((occupied && value > bestValue) || (!occupied && value < bestValue)) {
      bestValue = value;
      bestIndex = index;
    }
  }
  return bestIndex;
};

/** Generates a deterministic Ulichney-style void-and-cluster rank tile. */
export const generateBlueNoiseRanks = (size = DEFAULT_SIZE, sigma = DEFAULT_SIGMA) => {
  const count = size * size;
  const random = createDeterministicRandom(0x6d2b79f5);
  const pattern = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    pattern[index] = random() < 0.5 ? 1 : 0;
  }
  let occupiedCount = pattern.reduce((total, value) => total + value, 0);
  while (occupiedCount < Math.floor(count / 2)) {
    const index = Math.floor(random() * count);
    if (pattern[index] === 0) {
      pattern[index] = 1;
      occupiedCount += 1;
    }
  }
  while (occupiedCount > Math.floor(count / 2)) {
    const index = Math.floor(random() * count);
    if (pattern[index] === 1) {
      pattern[index] = 0;
      occupiedCount -= 1;
    }
  }

  const { kernel, radius } = gaussianKernel(sigma);
  const energyState = createEnergy(pattern, size, kernel, radius);
  const ranks = new Uint16Array(count);
  let highRank = count - 1;
  while (occupiedCount > 0) {
    const cluster = findExtreme(pattern, energyState.energy, true);
    // Keep removed clusters marked as 2 so void filling cannot reuse them.
    pattern[cluster] = 2;
    energyState.update(cluster, -1);
    ranks[cluster] = highRank;
    highRank -= 1;
    occupiedCount -= 1;
  }

  let lowRank = 0;
  while (lowRank <= highRank) {
    const voidIndex = findExtreme(pattern, energyState.energy, false);
    pattern[voidIndex] = 1;
    energyState.update(voidIndex, 1);
    ranks[voidIndex] = lowRank;
    lowRank += 1;
  }
  return ranks;
};

let cachedRanks: Uint16Array | null = null;

export const getBlueNoiseRanks = () => {
  if (!cachedRanks) cachedRanks = generateBlueNoiseRanks();
  return cachedRanks;
};

export const BLUE_NOISE_SIZE = DEFAULT_SIZE;
