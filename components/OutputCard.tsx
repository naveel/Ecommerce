"use client";

import { ProcessedImage } from "@/lib/types";

interface OutputCardProps {
  image: ProcessedImage;
}

export function OutputCard({ image }: OutputCardProps) {
  const webpUrl = `data:image/webp;base64,${image.webp}`;
  const jpegUrl = `data:image/jpeg;base64,${image.jpeg}`;

  const handleDownload = (format: "webp" | "jpeg") => {
    const link = document.createElement("a");
    link.href = format === "webp" ? webpUrl : jpegUrl;
    link.download = image.filenames[format];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{image.sizeKey}</span>
        <span>
          {image.dimensions.width}×{image.dimensions.height}
        </span>
      </div>
      <img
        src={webpUrl}
        alt={image.altText}
        className="h-64 w-full rounded-lg object-contain bg-slate-100"
      />
      <p className="text-sm text-slate-600">{image.altText}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDownload("webp")}
          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Download WEBP
        </button>
        <button
          onClick={() => handleDownload("jpeg")}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Download JPEG
        </button>
      </div>
    </article>
  );
}
