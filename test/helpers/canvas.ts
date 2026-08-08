export type Pixel = readonly [number, number, number, number];

type MockContext = {
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
  font: string;
  textBaseline: CanvasTextBaseline;
  fillStyle: string;
  drawImage: (...args: unknown[]) => void;
  clearRect: () => void;
  fillText: () => void;
  getImageData: (x: number, y: number, width: number, height: number) => ImageData;
};

export const installCanvasMock = (pixels: Pixel | Pixel[] = [32, 96, 160, 255]) => {
  const createCanvas = () => {
    const context: MockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      font: "",
      textBaseline: "alphabetic",
      fillStyle: "#000000",
      drawImage: () => undefined,
      clearRect: () => undefined,
      fillText: () => undefined,
      getImageData: (_x, _y, width, height) => {
        const sourcePixels = Array.isArray(pixels[0]) ? pixels as Pixel[] : [pixels as Pixel];
        const data = new Uint8ClampedArray(width * height * 4);
        for (let index = 0; index < width * height; index += 1) {
          const pixel = sourcePixels[index % sourcePixels.length] ?? sourcePixels[0]!;
          data.set(pixel, index * 4);
        }
        return { data } as ImageData;
      },
    };
    return {
      width: 1,
      height: 1,
      getContext: () => context,
    };
  };

  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => createCanvas() },
  });

  return {
    source: { width: 8, height: 8, getContext: () => null } as unknown as HTMLCanvasElement,
    restore: () => Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument }),
  };
};
