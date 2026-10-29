import type { Metadata } from "next";
import { ShipmentsView } from "@/components/admin/ShipmentsView";

export const metadata: Metadata = { title: "Envíos" };

export default function Page() {
  return <ShipmentsView />;
}
