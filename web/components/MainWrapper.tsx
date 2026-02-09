"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  // Admin routes have their own layout with sidebar — skip the padding
  if (isAdmin) return <>{children}</>;

  return <div className="pt-16">{children}</div>;
}
