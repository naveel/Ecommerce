import { PassThrough } from "stream";
import archiver from "archiver";
import sharp, { type Metadata, type Stats } from "sharp";
import { Category, ProcessResponse, ProcessedImage } from "@/lib/types";
import { buildAltText } from "@/lib/utils/alt-text";

export const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MIN_DIMENSION = 800;

export const OUTPUT_SPECS: Record<string, { width: number; height: number }> = {
  "1x1": { width: 2048, height: 2048 },
  "4x5": { width: 2000, height: 2500 },
  "3x4": { width: 1800, height: 2400 }
};

export type Placement = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function validateImage(buffer: Buffer): Promise<void> {
  const metadata = await sharp(buffer, { failOn: "none" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions");
  }
  if (Math.max(metadata.width, metadata.height) < MIN_DIMENSION) {
    throw new Error("Image is too small. Minimum longest side is 800px.");
  }
}

async function standardize(buffer: Buffer): Promise<{ normalized: Buffer; metadata: Metadata }> {
  const instance = sharp(buffer, { failOn: "none" }).toColorspace("srgb");
  const metadata = await instance.metadata();
  const normalized = await instance.withMetadata({ exif: undefined }).toBuffer();
  return { normalized, metadata };
}

async function createSubjectMask(buffer: Buffer, metadata: Metadata): Promise<Buffer> {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) {
    throw new Error("Invalid image dimensions");
  }

  const { data } = await sharp(buffer)
    .removeAlpha()
    .greyscale()
    .gamma()
    .normalize()
    .blur(12)
    .threshold(170)
    .toBuffer({ resolveWithObject: true });

  return sharp(data, {
    raw: { width, height, channels: 1 }
  })
    .blur(4)
    .toColourspace("b-w")
    .png()
    .toBuffer();
}

async function applyMask(buffer: Buffer, mask: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .ensureAlpha()
    .composite([
      {
        input: mask,
        blend: "dest-in"
      }
    ])
    .toBuffer();
}

export function calculatePlacement(
  category: Category,
  modelMeta: Metadata,
  productMeta: Metadata,
  scaleFactor: number
): Placement {
  const width = modelMeta.width ?? 2048;
  const height = modelMeta.height ?? 2048;
  const productWidth = productMeta.width ?? 800;
  const productHeight = productMeta.height ?? 800;

  const ratio = productWidth / Math.max(productHeight, 1);
  const baseScale = category === "Jewelry" ? 0.34 : 0.62;
  const placementWidth = Math.round(width * baseScale * scaleFactor);
  const placementHeight = Math.round(placementWidth / ratio);
  const top = Math.round(
    category === "Jewelry" ? height * 0.28 - placementHeight / 2 : height * 0.24
  );
  const left = Math.round(width / 2 - placementWidth / 2);

  return {
    width: Math.max(placementWidth, 1),
    height: Math.max(placementHeight, 1),
    top: Math.max(top, 0),
    left: Math.max(left, 0)
  };
}

async function createShadow(width: number, height: number): Promise<Buffer> {
  const shadowWidth = Math.max(1, Math.round(width * 0.85));
  const shadowHeight = Math.max(1, Math.round(height * 0.18));
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: shadowWidth,
            height: shadowHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0.35 }
          }
        })
          .blur(18)
          .toBuffer(),
        top: Math.min(height - shadowHeight, Math.round(height * 0.78)),
        left: Math.round((width - shadowWidth) / 2)
      }
    ])
    .toBuffer();
}

async function colorCorrect(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .modulate({ brightness: 1.03, saturation: 1.05 })
    .linear(1.03, -6)
    .clahe({ width: 32, height: 32, maxSlope: 10 })
    .gamma()
    .toBuffer();
}

async function enhanceClothing(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .modulate({ brightness: 1.04, saturation: 1.02 })
    .linear(1.05, -5)
    .toBuffer();
}

async function exportVariants(
  base: Buffer,
  category: Category,
  timestamp: number,
  altText: string
): Promise<ProcessedImage[]> {
  const entries: ProcessedImage[] = [];

  for (const [key, spec] of Object.entries(OUTPUT_SPECS)) {
    const padding = Math.round(Math.min(spec.width, spec.height) * 0.05);
    const resized = await sharp(base)
      .resize({
        width: spec.width - padding * 2,
        height: spec.height - padding * 2,
        fit: "inside",
        background: "#f7f7f7"
      })
      .png()
      .toBuffer({ resolveWithObject: true });

    const canvas = sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 4,
        background: "#f7f7f7"
      }
    });

    const left = Math.round((spec.width - resized.info.width) / 2);
    const top = Math.round((spec.height - resized.info.height) / 2);
    const composite = await canvas
      .composite([
        {
          input: resized.data,
          top,
          left
        }
      ])
      .toBuffer();

    const webp = await sharp(composite).webp({ lossless: true }).toBuffer();
    const jpeg = await sharp(composite).jpeg({ quality: 88 }).toBuffer();

    entries.push({
      sizeKey: key as ProcessedImage["sizeKey"],
      dimensions: spec,
      jpeg: jpeg.toString("base64"),
      webp: webp.toString("base64"),
      filenames: {
        jpeg: `${category.toLowerCase()}-${timestamp}-${spec.width}x${spec.height}.jpg`,
        webp: `${category.toLowerCase()}-${timestamp}-${spec.width}x${spec.height}.webp`
      },
      altText
    });
  }

  return entries;
}

function getDominantColors(stats: Stats): string[] {
  const dominant = stats.dominant;
  const palette: { r: number; g: number; b: number }[] = [dominant];
  const secondaryChannel = stats.channels.sort((a, b) => b.mean - a.mean)[1];
  if (secondaryChannel) {
    palette.push({ r: secondaryChannel.mean, g: secondaryChannel.mean, b: secondaryChannel.mean });
  }
  return palette.map(mapColorToName);
}

function mapColorToName({ r, g, b }: { r: number; g: number; b: number }): string {
  const max = Math.max(r, g, b);
  if (max < 40) return "charcoal";
  if (r > 200 && g > 200 && b > 200) return "white";
  if (r > 170 && g > 150 && b < 120) return "gold";
  if (max === r) return "crimson";
  if (max === g) return "emerald";
  if (max === b) return "sapphire";
  return "neutral";
}

async function createZip(results: ProcessedImage[]): Promise<string> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  for (const result of results) {
    archive.append(Buffer.from(result.jpeg, "base64"), {
      name: result.filenames.jpeg
    });
    archive.append(Buffer.from(result.webp, "base64"), {
      name: result.filenames.webp
    });
  }

  await archive.finalize();
  const zipBuffer = await streamToBuffer(passthrough);
  return zipBuffer.toString("base64");
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
}

export async function processImages(options: {
  model: Buffer;
  product: Buffer;
  category: Category;
  scaleFactor: number;
}): Promise<ProcessResponse> {
  const { category, model, product, scaleFactor } = options;

  await Promise.all([validateImage(model), validateImage(product)]);

  const [modelStandard, productStandard] = await Promise.all([
    standardize(model),
    standardize(product)
  ]);

  const [modelMask, productMask] = await Promise.all([
    createSubjectMask(modelStandard.normalized, modelStandard.metadata),
    createSubjectMask(productStandard.normalized, productStandard.metadata)
  ]);

  const [modelIsolated, productIsolated] = await Promise.all([
    applyMask(modelStandard.normalized, modelMask),
    applyMask(productStandard.normalized, productMask)
  ]);

  const placement = calculatePlacement(
    category,
    modelStandard.metadata,
    productStandard.metadata,
    scaleFactor
  );

  const resizedProduct = await sharp(productIsolated)
    .resize({
      width: placement.width,
      height: placement.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const shadow = await createShadow(placement.width, placement.height);

  const compositeModel = await sharp(modelIsolated)
    .ensureAlpha()
    .composite([
      {
        input: shadow,
        blend: "over",
        top: placement.top + Math.round(placement.height * 0.75),
        left: placement.left
      },
      {
        input: resizedProduct,
        blend: "over",
        top: placement.top,
        left: placement.left
      }
    ])
    .toBuffer();

  let polished = await colorCorrect(compositeModel);
  if (category === "Clothing") {
    polished = await enhanceClothing(polished);
  }

  const polishedOnBackground = await sharp({
    create: {
      width: modelStandard.metadata.width ?? 2048,
      height: modelStandard.metadata.height ?? 2048,
      channels: 4,
      background: "#f7f7f7"
    }
  })
    .composite([
      {
        input: polished,
        top: 0,
        left: 0
      }
    ])
    .toBuffer();

  const stats = await sharp(polished).stats();
  const dominantColors = getDominantColors(stats).filter((color, index, arr) => arr.indexOf(color) === index);
  const descriptors = category === "Jewelry" ? ["elegant", "refined"] : ["tailored", "modern"];
  const altText = buildAltText({ category, dominantColors, descriptors });

  const timestamp = Date.now();
  const results = await exportVariants(polishedOnBackground, category, timestamp, altText);
  const zipBase64 = await createZip(results);

  return { results, zipBase64 };
}
