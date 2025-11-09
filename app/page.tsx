"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { CategorySelect } from "@/components/CategorySelect";
import { BeforeAfter } from "@/components/BeforeAfter";
import { OutputCard } from "@/components/OutputCard";
import { useToast } from "@/lib/hooks/use-toast";
import { Category, ProcessedImage } from "@/lib/types";

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

export default function HomePage() {
  const { push } = useToast();
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category | "">("");
  const [errors, setErrors] = useState<{ model?: string; product?: string; category?: string }>({});
  const [isProcessing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [modelPreview, setModelPreview] = useState<string | undefined>();

  useEffect(() => {
    if (!modelFile) return;
    const objectUrl = URL.createObjectURL(modelFile);
    setModelPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [modelFile]);

  useEffect(() => {
    if (!modelFile || !productFile) {
      setPreviewUrl(undefined);
      return;
    }

    const modelUrl = URL.createObjectURL(modelFile);
    const productUrl = URL.createObjectURL(productFile);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const modelImg = new Image();
    const productImg = new Image();

    let revoked = false;

    modelImg.onload = () => {
      canvas.width = modelImg.width;
      canvas.height = modelImg.height;
      ctx.drawImage(modelImg, 0, 0);

      productImg.onload = () => {
        const productWidth = modelImg.width * (category === "Jewelry" ? 0.35 : 0.6) * scaleFactor;
        const productHeight = (productWidth / productImg.width) * productImg.height;
        const left = modelImg.width / 2 - productWidth / 2;
        const top = category === "Jewelry" ? modelImg.height * 0.25 : modelImg.height * 0.3;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(productImg, left, top, productWidth, productHeight);
        ctx.globalAlpha = 1;
        const url = canvas.toDataURL("image/png");
        setPreviewUrl(url);
        if (!revoked) {
          URL.revokeObjectURL(modelUrl);
          URL.revokeObjectURL(productUrl);
          revoked = true;
        }
      };

      productImg.src = productUrl;
    };

    modelImg.src = modelUrl;

    return () => {
      if (!revoked) {
        URL.revokeObjectURL(modelUrl);
        URL.revokeObjectURL(productUrl);
      }
    };
  }, [modelFile, productFile, category, scaleFactor]);

  const canSubmit = useMemo(() => {
    return Boolean(modelFile && productFile && category && !isProcessing);
  }, [modelFile, productFile, category, isProcessing]);

  const resetErrors = () => setErrors({});

  const handleProcess = async () => {
    resetErrors();
    if (!modelFile) {
      setErrors((prev) => ({ ...prev, model: "Upload a model image." }));
    }
    if (!productFile) {
      setErrors((prev) => ({ ...prev, product: "Upload a product image." }));
    }
    if (!category) {
      setErrors((prev) => ({ ...prev, category: "Select a category." }));
    }
    if (!modelFile || !productFile || !category) {
      push({ title: "Missing information", description: "Please complete the required fields." });
      return;
    }

    try {
      setProcessing(true);
      setResults([]);
      setZipBase64(null);
      const formData = new FormData();
      formData.append("category", category);
      formData.append("model", modelFile);
      formData.append("product", productFile);
      formData.append("scaleFactor", scaleFactor.toString());

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unable to process images." }));
        throw new Error(error.message || "Unable to process images.");
      }

      const payload = (await response.json()) as { results: ProcessedImage[]; zipBase64: string };
      setResults(payload.results);
      setZipBase64(payload.zipBase64);
      push({ title: "Images ready", description: "Your composites are ready to download." });
    } catch (error) {
      console.error(error);
      push({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unexpected error occurred."
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleZipDownload = () => {
    if (!zipBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/zip;base64,${zipBase64}`;
    link.download = `composite-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          E-commerce composite generator
        </h1>
        <p className="text-base text-slate-600">
          Upload a mannequin and product image to create polished storefront-ready visuals in seconds.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <FileDrop
          id="model"
          label="Model / Mannequin"
          description="Upload the bust or mannequin image"
          value={modelFile}
          onFile={setModelFile}
          accept={ACCEPTED_TYPES}
          error={errors.model}
        />
        <FileDrop
          id="product"
          label="Product"
          description="Upload the jewelry or clothing image"
          value={productFile}
          onFile={setProductFile}
          accept={ACCEPTED_TYPES}
          error={errors.product}
        />
      </section>

      <section className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-3">
        <CategorySelect value={category} onChange={(value) => setCategory(value)} />
        <div className="flex flex-col gap-2">
          <label htmlFor="scale" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Scale tweak
          </label>
          <input
            type="range"
            id="scale"
            min="0.8"
            max="1.2"
            step="0.01"
            value={scaleFactor}
            onChange={(event) => setScaleFactor(parseFloat(event.target.value))}
            className="accent-slate-900"
            aria-describedby="scale-help"
          />
          <p id="scale-help" className="text-sm text-slate-500">
            {category === "Jewelry"
              ? "Adjust to nudge the product fit before processing."
              : "Scale tweak is optimized for jewelry. Clothing adjustments are auto-tuned."}
          </p>
        </div>
        <div className="flex flex-col justify-end gap-3">
          {errors.category ? <p className="text-sm text-red-500">{errors.category}</p> : null}
          <button
            onClick={handleProcess}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isProcessing ? "Processing…" : "Process images"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <BeforeAfter beforeUrl={modelPreview} afterUrl={results[0] ? `data:image/webp;base64,${results[0].webp}` : previewUrl} />
        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li>1. We isolate both subjects and normalize lighting.</li>
            <li>2. Jewelry aligns near the neckline; clothing scales to torso.</li>
            <li>3. The background is refreshed with a neutral studio tone.</li>
            <li>4. Outputs arrive in 1:1, 4:5, and 3:4 ratios with WEBP &amp; JPEG.</li>
          </ol>
        </aside>
      </section>

      {results.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Outputs</h2>
            <button
              onClick={handleZipDownload}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Download all as ZIP
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {results.map((image) => (
              <OutputCard key={image.sizeKey} image={image} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
