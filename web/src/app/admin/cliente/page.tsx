import type { Metadata } from "next";
import { CustomerDetailView } from "@/components/admin/CustomerDetailView";

export const metadata: Metadata = { title: "Cliente" };

export default function Page() {
  return <CustomerDetailView />;
}
