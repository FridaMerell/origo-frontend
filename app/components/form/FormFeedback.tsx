import { Button } from "@/app/components/ui/Button";

export function FormRootError({ error }: { error?: { message?: string } }) {
  if (!error) return null;

  return (
    <p role="alert" aria-live="polite" className="text-sm text-danger">
      {error.message}
    </p>
  );
}

export function FormActions({
  isSubmitting,
  submitLabel = "Spara",
  pendingLabel = "Sparar...",
  onCancel,
  size = "sm",
  className = "mt-2 flex justify-end gap-2.5",
}: {
  isSubmitting: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  onCancel?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={className}>
      {onCancel ? (
        <Button type="button" variant="ghost" size={size} onClick={onCancel}>
          Avbryt
        </Button>
      ) : null}
      <Button type="submit" variant="primary" size={size} disabled={isSubmitting}>
        {isSubmitting ? pendingLabel : submitLabel}
      </Button>
    </div>
  );
}
