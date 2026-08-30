"use client";

import { useState } from "react";
import type { UploadedFile } from "@/app/components/ui/FileUpload";
import { normalizeFileUrls, type FileLike } from "@/app/lib/files";

export function uploadedFilesFromUrls(files: FileLike[] = []): UploadedFile[] {
  return normalizeFileUrls(files).map((url) => ({ url, name: url.split("/").pop() ?? url }));
}

/**
 * Owns the references returned by the direct Next -> Vercel Blob upload.
 * Django only receives `urls` when the surrounding model form is submitted.
 */
export function useUploadedFiles(sourceFiles: FileLike[] = [], resetKey?: string | number | null) {
  const [state, setState] = useState(() => ({
    resetKey,
    files: uploadedFilesFromUrls(sourceFiles),
  }));

  if (state.resetKey !== resetKey) {
    setState({ resetKey, files: uploadedFilesFromUrls(sourceFiles) });
  }

  const files = state.resetKey === resetKey ? state.files : uploadedFilesFromUrls(sourceFiles);
  const setFiles = (next: UploadedFile[] | ((current: UploadedFile[]) => UploadedFile[])) => {
    setState((current) => ({
      resetKey,
      files: typeof next === "function" ? next(current.files) : next,
    }));
  };

  return {
    files,
    setFiles,
    urls: files.map((file) => file.url),
    reset: () => setFiles(uploadedFilesFromUrls(sourceFiles)),
    clear: () => setFiles([]),
  };
}
