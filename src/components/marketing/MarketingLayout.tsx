import type { ReactNode } from "react";

import { FooterClean } from "@/components/FooterClean";
import { HeaderClean } from "@/components/landing/HeaderClean";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      <HeaderClean />
      <main id="main-content" className="flex-1 pt-24 pb-12">
        {children}
      </main>
      <FooterClean />
    </div>
  );
}
