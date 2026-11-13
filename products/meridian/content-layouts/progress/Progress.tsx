import { Steps } from "../../catalog";

export type StageStatus = "done" | "current" | "pending" | "error";

export type Stage = {
  readonly label: string;
  readonly status: StageStatus;
  /** What a screen reader hears for the stage's status, when the status name alone would mislead. */
  readonly statusLabel?: string;
};

export type ProgressProps = {
  /** Names the steps for a screen reader, such as "Invoice progress". */
  readonly label: string;
  readonly stages: readonly Stage[];
};

/** Progress content layout: the stages a record moves through, and where it is now. */
export function Progress({ label, stages }: ProgressProps) {
  return (
    <Steps.Root aria-label={label} variant="progress">
      {stages.map((stage) => (
        <Steps.Item key={stage.label} status={stage.status} statusLabel={stage.statusLabel}>
          {stage.label}
        </Steps.Item>
      ))}
    </Steps.Root>
  );
}
