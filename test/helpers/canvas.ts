export type Pixel = readonly [number, number, number, number];

type MockContext = {
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
  font: string;
  textBaseline: CanvasTextBaseline;
  fillStyle: string | CanvasGradient | CanvasPattern;
  drawImage: () => void;
  fillText: () => void;
  getImageData: () => ImageData;
  fillRect: () => void;
  clearRect: () => void;
  createLinearGradient: () => CanvasGradient;
  createRadialGradient: () => CanvasGradient;
};

export const installCanvasMock = (pixel: Pixel = [32, 96, 160, 255]) => {
  const createCanvas = () => {
    const dummyGrad = {
      addColorStop: () => undefined,
    } as unknown as CanvasGradient;

    const context: MockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      font: "",
      textBaseline: "alphabetic",
      fillStyle: "#000000",
      drawImage: () => undefined,
      fillText: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(pixel) } as ImageData),
      fillRect: () => undefined,
      clearRect: () => undefined,
      createLinearGradient: () => dummyGrad,
      createRadialGradient: () => dummyGrad,
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
