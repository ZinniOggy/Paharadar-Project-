export type Severity = "pass" | "info" | "warn" | "critical";
export type Category = "transport" | "headers" | "exposure" | "email" | "sessions" | "process";

export interface Finding {
  id: string;
  title: string;
  category: Category;
  severity: Severity;
  found: string;
  why: string;
  header?: { name: string; value: string };   // used by the Fix kit
  fix?: { label: string; code: string }[];
  learn?: string;                             // slug of a /learn guide
  docs?: string;
}