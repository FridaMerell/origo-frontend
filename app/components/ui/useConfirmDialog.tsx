"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type ConfirmOptions = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  onConfirm: () => void;
  onCancel?: () => void;
};

/**
 * Imperative replacement for `window.confirm`, styled to match the app instead of
 * the browser. Call `requestConfirm({ ... })` from an event handler, or
 * `await askToConfirm({ ... })` for a yes/no answer, and render `dialog` once
 * somewhere in the component's returned JSX.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const requestConfirm = (options: ConfirmRequest) => setRequest(options);

  /** Resolves true when the user confirms, false when they cancel. */
  const askToConfirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) =>
      setRequest({ ...options, onConfirm: () => resolve(true), onCancel: () => resolve(false) }),
    );

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
      onCancel={() => {
        setRequest(null);
        request.onCancel?.();
      }}
    />
  ) : null;

  return { requestConfirm, askToConfirm, dialog };
}
