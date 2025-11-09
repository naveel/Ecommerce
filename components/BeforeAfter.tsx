"use client";

interface BeforeAfterProps {
  beforeUrl?: string;
  afterUrl?: string;
}

export function BeforeAfter({ beforeUrl, afterUrl }: BeforeAfterProps) {
  return (
    <section aria-label="Before and after preview" className="grid gap-4 sm:grid-cols-2">
      <figure className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <figcaption className="mb-2 text-sm font-semibold text-slate-600">Before</figcaption>
        {beforeUrl ? (
          <img src={beforeUrl} alt="Uploaded model preview" className="h-full w-full rounded-lg object-contain" />
        ) : (
          <p className="text-sm text-slate-500">Upload images to preview your composite.</p>
        )}
      </figure>
      <figure className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <figcaption className="mb-2 text-sm font-semibold text-slate-600">After</figcaption>
        {afterUrl ? (
          <img src={afterUrl} alt="Composite preview" className="h-full w-full rounded-lg object-contain" />
        ) : (
          <p className="text-sm text-slate-500">Processed results appear here once ready.</p>
        )}
      </figure>
    </section>
  );
}
