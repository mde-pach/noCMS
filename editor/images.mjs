/**
 * Images, processed in the browser before they are ever committed.
 *
 * §4.6: upload, place, and have them load fast "without thinking about formats or sizes".
 * So the owner picks a file and nothing else. A 12-megapixel phone photo is decoded,
 * capped on its long edge and re-encoded to WebP here, so what lands in the repository
 * is already sensible. EXIF is dropped as a side effect of re-encoding, which also
 * removes the location data a phone attaches.
 *
 * git keeps every version for ever, so this is the one chance to get the size right.
 */
const MAX_EDGE = 2560;
const QUALITY = 78;

/**
 * Decode, scale and re-encode with the platform. A WASM codec would compress a little
 * better, but it means shipping another multi-megabyte binary to every editor load —
 * a poor trade when the browser already encodes WebP well.
 */
async function process(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({
    type: "image/webp",
    quality: QUALITY / 100,
  });
  if (blob.type !== "image/webp") throw new Error("this browser cannot write WebP");
  return { buffer: await blob.arrayBuffer(), width, height };
}

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** A stable, readable filename. Collisions are resolved by the caller. */
export function fileNameFor(originalName) {
  const stem = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${stem || "image"}.webp`;
}

/**
 * @returns {{ path: string, content: string, encoding: "base64",
 *             width: number, height: number, bytes: number, src: string }}
 */
export async function prepareImage(file, existingPaths = []) {
  const { buffer, width, height } = await process(file);

  let name = fileNameFor(file.name);
  let n = 2;
  while (existingPaths.includes(`public/media/${name}`)) {
    name = fileNameFor(file.name).replace(/\.webp$/, `-${n++}.webp`);
  }

  return {
    path: `public/media/${name}`,
    src: `/media/${name}`,
    content: toBase64(buffer),
    encoding: "base64",
    width,
    height,
    bytes: buffer.byteLength,
  };
}

/** What the owner should be told about the space their site is using. */
export function describeBudget(totalBytes) {
  const mb = totalBytes / 1024 / 1024;
  // GitHub Pages publishes at most 1 GB and recommends repositories stay under 1 GB.
  const share = mb / 1024;
  return {
    used: mb < 1 ? `${Math.round(totalBytes / 1024)} KB` : `${mb.toFixed(1)} MB`,
    share,
    warn: share > 0.5,
  };
}
