"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ok, setOk] = useState(pathname === "/admin");
  const [checked, setChecked] = useState(pathname === "/admin");

  useEffect(() => {
    if (pathname === "/admin") return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/admin/stats");
        if (!cancelled) { setOk(true); setChecked(true); }
      } catch {
        if (!cancelled) { setOk(false); setChecked(true); router.replace("/admin"); }
      }
    })();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (pathname === "/admin") return <>{children}</>;

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
        Checking session...
      </div>
    );
  }

  if (!ok) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-8 overflow-auto">{children}</div>
    </div>
  );
}
