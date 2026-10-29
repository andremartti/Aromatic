import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel AROMATIC" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** Panel administrativo. La autorización real ocurre en el servidor (función `admin`). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
