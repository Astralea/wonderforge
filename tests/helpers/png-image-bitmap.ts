import { PNG } from 'pngjs';

// CPU asset-contract tests decode the actual embedded PNG. This is not a
// WebGL/ImageBitmap rendering emulation; real texture upload/filtering is
// verified separately in Chromium. Keep it out of production and jsdom.
if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'self', {value: globalThis, configurable:true});
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable:true,
    value: async (blob: Blob) => {
      const png = PNG.sync.read(Buffer.from(await blob.arrayBuffer()));
      return {width:png.width,height:png.height,data:png.data,close() {}};
    },
  });
}
