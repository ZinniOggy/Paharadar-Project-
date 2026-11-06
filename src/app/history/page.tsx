import type { Metadata } from "next";
import { HistoryView } from "@/components/HistoryView";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <HistoryView />;
}