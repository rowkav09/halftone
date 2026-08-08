import { createDeterministicRandom } from "@/lib/renderer/blueNoise";

export const applyGrain = (values: Float32Array, amount: number, seed: number) => {
  if (amount <= 0) return values;
  const output = new Float32Array(values);
  const random = createDeterministicRandom(seed);
  const amplitude = Math.min(0.5, amount * 0.35);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Math.min(1, Math.max(0, output[index] + (random() * 2 - 1) * amplitude));
  }
  return output;
};
