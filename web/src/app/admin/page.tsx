import type { Metadata } from "next";
import { SummaryView } from "@/components/admin/SummaryView";

export const metadata: Metadata = { title: "Resumen" };

export default function AdminHome() {
  return <SummaryView />;
}
