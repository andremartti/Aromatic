import type { Metadata } from "next";
import { GuidesView } from "@/components/admin/GuidesView";

export const metadata: Metadata = { title: "Guías de envío" };

export default function Page() {
  return <GuidesView />;
}
