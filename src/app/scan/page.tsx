import type { Metadata } from "next";
import { ScanView } from "@/components/ScanView";

export const metadata: Metadata = { title: "Scanner" };

export default function Page() {
  return <ScanView />;
}