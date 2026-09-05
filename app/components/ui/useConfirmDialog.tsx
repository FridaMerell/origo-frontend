"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type ConfirmRequest = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Imperative replacement for `window.confirm`, styled to match the app instead of
 * the browser. Call `requestConfirm({ ... })` from an event handler, and render
 * `dialog` once somewhere in the component's returned JSX.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const requestConfirm = (options: ConfirmRequest) => setRequest(options);

  const dialog = request ? (
    <ConfirmDialog
      open
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      destructive={request.destructive}
      onConfirm={() => {
        setRequest(null);
        request.onConfirm();
      }}
      onCancel={() => setRequest(null)}
    />
  ) : null;

  return { requestConfirm, dialog };
}
