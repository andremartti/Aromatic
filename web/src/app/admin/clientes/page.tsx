import type { Metadata } from "next";
import { CustomersView } from "@/components/admin/CustomersView";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <CustomersView />;
}
