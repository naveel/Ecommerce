import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { calculatePlacement, processImages } from "@/lib/utils/image";
import type { Metadata } from "sharp";

function mockMetadata(width: number, height: number): Metadata {
  return { width, height } as Metadata;
}

describe("calculatePlacement", () => {
  it("scales jewelry toward neckline", () => {
    const placement = calculatePlacement(
      "Jewelry",
      mockMetadata(2000, 2500),
      mockMetadata(800, 600),
      1
    );
    expect(placement.width).toBeGreaterThan(0);
    expect(placement.left).toBeCloseTo((2000 - placement.width) / 2, 0);
  });

  it("expands clothing placement", () => {
    const jewelry = calculatePlacement(
      "Jewelry",
      mockMetadata(2000, 2600),
      mockMetadata(900, 900),
      1
    );
    const clothing = calculatePlacement(
      "Clothing",
      mockMetadata(2000, 2600),
      mockMetadata(900, 900),
      1
    );
    expect(clothing.width).toBeGreaterThan(jewelry.width);
    expect(clothing.top).toBeGreaterThanOrEqual(0);
  });
});

describe("processImages", () => {
  async function createModel(): Promise<Buffer> {
    const base = sharp({
      create: {
        width: 1600,
        height: 2000,
        channels: 4,
        background: { r: 235, g: 235, b: 235, alpha: 1 }
      }
    });

    const torso = await sharp({
      create: {
        width: 900,
        height: 1200,
        channels: 4,
        background: { r: 140, g: 140, b: 140, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    return base
      .composite([
        {
          input: torso,
          top: 400,
          left: 350
        }
      ])
      .png()
      .toBuffer();
  }

  async function createProduct(): Promise<Buffer> {
    return sharp({
      create: {
        width: 900,
        height: 700,
        channels: 4,
        background: { r: 210, g: 160, b: 60, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
  }

  it("returns three export sizes and alt text", async () => {
    const payload = await processImages({
      category: "Jewelry",
      model: await createModel(),
      product: await createProduct(),
      scaleFactor: 1
    });

    expect(payload.results).toHaveLength(3);
    const sizeKeys = payload.results.map((result) => result.sizeKey).sort();
    expect(sizeKeys).toEqual(["1x1", "3x4", "4x5"].sort());
    for (const result of payload.results) {
      expect(result.altText.length).toBeGreaterThan(10);
      expect(Buffer.from(result.webp, "base64").length).toBeGreaterThan(0);
      expect(Buffer.from(result.jpeg, "base64").length).toBeGreaterThan(0);
    }
    expect(payload.zipBase64.length).toBeGreaterThan(0);
  }, 20000);
});
