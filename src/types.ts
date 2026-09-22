export type Severity = "error" | "warn" | "info" | "ok";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix?: string;
  meta?: Record<string, unknown> | object;
}

export interface Diagnosis {
  ok: boolean;
  subject: string;
  command: string;
  findings: Finding[];
  errorCode?: string | number | null;
  errorName?: string | null;
  softCta: string;
  generatedAt: string;
}

export interface ErrorMapping {
  code: number | string;
  name: string;
  summary: string;
  humanFix: string;
  checklist: string[];
}
