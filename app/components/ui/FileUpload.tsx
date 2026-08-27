"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { fileProxyUrl } from "@/app/lib/files";

export type UploadFolder = "verso" | "flux" | "apsis";

export type UploadedFile = { url: string; name: string };

type FileUploadProps = {
  folder: UploadFolder;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  multiple?: boolean;
  accept?: string;
  uploadUrl?: string;
  className?: string;
};

export function FileUpload({
  folder,
  files,
  onChange,
  multiple = true,
  accept,
  uploadUrl = "/api/upload",
  className = "",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(fileList: FileList) {
    const selected = multiple ? Array.from(fileList) : Array.from(fileList).slice(0, 1);
    if (selected.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const body = new FormData();
          body.set("file", file);
          body.set("folder", folder);

          const response = await fetch(uploadUrl, { method: "POST", body });
          if (!response.ok) throw new Error("Upload failed");

          const blob = (await response.json()) as { url: string; pathname: string };
          return { url: blob.url, name: blob.pathname.split("/").pop() ?? blob.pathname };
        })
      );
      onChange(multiple ? [...files, ...uploaded] : uploaded);
    } catch {
      setError("Uppladdningen misslyckades. Försök igen.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(url: string) {
    onChange(files.filter((f) => f.url !== url));
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragOver ? "border-accent bg-accent-wash text-accent" : "border-border text-text-muted hover:border-accent-hover hover:text-text"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Icon name={uploading ? "loader" : "upload"} size={20} className={uploading ? "animate-spin" : ""} />
        <span>
          {uploading
            ? "Laddar upp..."
            : dragOver
              ? "Släpp filerna här"
              : "Dra och släpp filer här, eller klicka för att välja"}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li
              key={file.url}
              className="flex items-center justify-between gap-2 rounded border border-border bg-surface px-2.5 py-1.5 text-sm"
            >
              <a
                href={fileProxyUrl(file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-accent underline"
              >
                {file.name}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(file.url)}
                aria-label={`Ta bort ${file.name}`}
                className="shrink-0 text-text-muted hover:text-danger"
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
