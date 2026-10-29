import type { Metadata } from "next";
import { ProductEditView } from "@/components/admin/ProductEditView";

export const metadata: Metadata = { title: "Producto" };

export default function Page() {
  return <ProductEditView />;
}
