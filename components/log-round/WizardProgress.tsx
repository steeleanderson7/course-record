export function WizardProgress({ step, label }: { step: 1 | 2 | 3; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
              n <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Step {step} of 3 — {label}
      </p>
    </div>
  );
}
