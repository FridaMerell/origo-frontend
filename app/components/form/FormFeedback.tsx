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
  className = "mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end",
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
        <Button type="button" variant="ghost" size={size} onClick={onCancel} className="w-full justify-center sm:w-auto">
          Avbryt
        </Button>
      ) : null}
      <Button type="submit" variant="primary" size={size} disabled={isSubmitting} className="w-full justify-center sm:w-auto">
        {isSubmitting ? pendingLabel : submitLabel}
      </Button>
    </div>
  );
}
