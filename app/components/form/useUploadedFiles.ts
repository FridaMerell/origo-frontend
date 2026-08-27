"use client";

import { useState } from "react";
import type { UploadedFile } from "@/app/components/ui/FileUpload";

export function uploadedFilesFromUrls(urls: string[] = []): UploadedFile[] {
  return urls.map((url) => ({ url, name: url.split("/").pop() ?? url }));
}

/**
 * Owns the references returned by the direct Next -> Vercel Blob upload.
 * Django only receives `urls` when the surrounding model form is submitted.
 */
export function useUploadedFiles(sourceUrls: string[] = [], resetKey?: string | number | null) {
  const [state, setState] = useState(() => ({
    resetKey,
    files: uploadedFilesFromUrls(sourceUrls),
  }));

  if (state.resetKey !== resetKey) {
    setState({ resetKey, files: uploadedFilesFromUrls(sourceUrls) });
  }

  const files = state.resetKey === resetKey ? state.files : uploadedFilesFromUrls(sourceUrls);
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
    reset: () => setFiles(uploadedFilesFromUrls(sourceUrls)),
    clear: () => setFiles([]),
  };
}
