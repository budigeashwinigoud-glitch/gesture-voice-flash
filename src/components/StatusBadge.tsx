import type { DetectionStatus } from "@/hooks/useHandDetection";

const config: Record<DetectionStatus, { label: string; className: string }> = {
  idle: { label: "Standby", className: "status-no-hand" },
  detecting: { label: "Detecting", className: "status-detecting" },
  recognized: { label: "Recognized", className: "status-recognized" },
  "no-hand": { label: "No Hand", className: "status-no-hand" },
};

export function StatusBadge({ status }: { status: DetectionStatus }) {
  const { label, className } = config[status];
  return (
    <div className={`status-badge ${className}`}>
      <span className="pulse-dot" style={{ backgroundColor: "currentColor" }} />
      {label}
    </div>
  );
}
