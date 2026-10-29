import type { Metadata } from "next";
import { OrderDetailView } from "@/components/admin/OrderDetailView";

export const metadata: Metadata = { title: "Pedido" };

export default function Page() {
  return <OrderDetailView />;
}
