import { NextResponse } from "next/server";
import { z } from "zod";
import { ALLOWED_MIME, MAX_FILE_SIZE, fileToBuffer, processImages } from "@/lib/utils/image";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  category: z.enum(["Jewelry", "Clothing"]),
  scaleFactor: z.coerce.number().min(0.5).max(1.5)
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const model = formData.get("model");
    const product = formData.get("product");
    const categoryValue = formData.get("category");
    const scaleValue = formData.get("scaleFactor");

    if (!(model instanceof File) || !(product instanceof File)) {
      return NextResponse.json({ message: "Both images are required." }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(model.type) || !ALLOWED_MIME.has(product.type)) {
      return NextResponse.json({ message: "Unsupported file type." }, { status: 415 });
    }

    if (model.size > MAX_FILE_SIZE || product.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Files must be 10MB or smaller." }, { status: 413 });
    }

    const parsed = schema.safeParse({ category: categoryValue, scaleFactor: scaleValue });
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    const [modelBuffer, productBuffer] = await Promise.all([fileToBuffer(model), fileToBuffer(product)]);

    const payload = await processImages({
      category: parsed.data.category as Category,
      model: modelBuffer,
      product: productBuffer,
      scaleFactor: parsed.data.scaleFactor
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
