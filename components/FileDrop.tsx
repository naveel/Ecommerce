"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";

interface FileDropProps {
  id: string;
  label: string;
  description: string;
  value?: File | null;
  onFile: (file: File | null) => void;
  accept: string;
  error?: string;
}

export function FileDrop({ id, label, description, value, onFile, accept, error }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        onFile(null);
        return;
      }
      onFile(files[0]);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex h-full cursor-pointer flex-col justify-between rounded-xl border-2 border-dashed p-6 transition",
        isDragging ? "border-slate-500 bg-slate-100" : "border-slate-300 bg-white",
        error ? "border-red-400" : ""
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">{label}</span>
        <p className="text-base font-medium text-slate-900">{value ? value.name : description}</p>
        <p className="text-sm text-slate-500">
          PNG, JPG, or WebP up to 10&nbsp;MB. Minimum longest edge 800px.
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>Drag &amp; drop or click to browse</span>
        {value ? <span className="rounded-full bg-slate-100 px-3 py-1">Selected</span> : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        accept={accept}
        onChange={(event) => handleFiles(event.currentTarget.files)}
        className="sr-only"
      />
      {error ? <p className="mt-4 text-sm text-red-500" role="alert">{error}</p> : null}
    </label>
  );
}
