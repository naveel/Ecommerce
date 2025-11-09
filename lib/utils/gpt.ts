import OpenAI from "openai";
import { Category, ProcessResponse } from "@/lib/types";
import { buildProcessResponseFromComposite, validateImage } from "@/lib/utils/image";

const DEFAULT_COMPOSITOR_MODEL = process.env.GPT_COMPOSITOR_MODEL ?? "gpt-4.1";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

export function isGptCompositorAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function buildGptCompositePrompt(options: { category: Category; scaleFactor: number }): string {
  const { category, scaleFactor } = options;
  const focus =
    category === "Jewelry"
      ? "Align the jewelry naturally around the mannequin's neckline and collarbone."
      : "Drape the clothing smoothly along the mannequin's shoulders and torso.";
  const styling =
    category === "Jewelry"
      ? "Preserve metallic highlights and ensure gemstones reflect the studio lighting."
      : "Respect realistic fabric folds and cast subtle shadows wherever the garment overlaps the mannequin.";

  return [
    "Blend the provided product image onto the mannequin reference to create a studio-quality ecommerce photo.",
    focus,
    styling,
    "Keep the mannequin pose, proportions, and lighting consistent with the reference photo.",
    `Apply the provided scale factor multiplier of ${scaleFactor.toFixed(2)} to keep the product size believable.`,
    "Return a polished PNG composite on a neutral light gray background that is ready for a storefront listing."
  ].join(" ");
}

function extractCompositePayload(response: any): { composite: string } {
  if (response && typeof response.output_text === "string" && response.output_text.trim()) {
    try {
      return JSON.parse(response.output_text) as { composite: string };
    } catch {
      // fall through to inspect structured output
    }
  }

  const output = Array.isArray(response?.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const entry of content) {
      if (entry?.type === "output_json" && entry.json) {
        return entry.json as { composite: string };
      }
      if (entry?.type === "text" && typeof entry.text === "string") {
        try {
          return JSON.parse(entry.text) as { composite: string };
        } catch {
          continue;
        }
      }
      if (entry?.type === "output_text" && typeof entry.text === "string") {
        try {
          return JSON.parse(entry.text) as { composite: string };
        } catch {
          continue;
        }
      }
    }
  }

  throw new Error("GPT compositor did not return a valid JSON payload.");
}

export async function processImagesWithGpt(options: {
  category: Category;
  model: Buffer;
  product: Buffer;
  scaleFactor: number;
}): Promise<ProcessResponse> {
  const { category, model, product, scaleFactor } = options;

  await Promise.all([validateImage(model), validateImage(product)]);

  const client = getClient();
  const prompt = buildGptCompositePrompt({ category, scaleFactor });

  const response = await client.responses.create({
    model: DEFAULT_COMPOSITOR_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text:
              "You are an ecommerce photo compositor. Combine the mannequin and product inputs into a realistic catalog-ready image. Respond strictly with JSON that matches the provided schema."
          }
        ]
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "input_image", image_base64: model.toString("base64") },
          { type: "input_image", image_base64: product.toString("base64") }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "composite_response",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            composite: {
              type: "string",
              description: "Base64 encoded PNG image of the mannequin wearing the provided product."
            },
            reasoning: {
              type: "string",
              description: "Optional summary of how the composite was produced."
            }
          },
          required: ["composite"]
        }
      }
    }
  });

  const payload = extractCompositePayload(response);
  const compositeBase64 = payload.composite;
  if (!compositeBase64 || typeof compositeBase64 !== "string") {
    throw new Error("GPT compositor did not provide an image result.");
  }

  const compositeBuffer = Buffer.from(compositeBase64, "base64");
  if (!compositeBuffer.length) {
    throw new Error("Received an empty composite image from GPT.");
  }

  await validateImage(compositeBuffer);

  return buildProcessResponseFromComposite({
    category,
    polished: compositeBuffer,
    compositeOnBackground: compositeBuffer
  });
}
