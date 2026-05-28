import { useEffect } from "react";

/** Served from `public/`; Vercel also maps `/dpa` → `dpa.html` for direct navigation. */
const DOC_TO_HTML: Record<"dpa" | "subprocessors", string> = {
  dpa: "/dpa.html",
  subprocessors: "/subprocessors.html",
};

type LegalDoc = keyof typeof DOC_TO_HTML;

export function LegalStaticPageRedirect({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    window.location.replace(DOC_TO_HTML[doc]);
  }, [doc]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <p className="text-muted-foreground text-sm text-center">Opening document…</p>
    </div>
  );
}
