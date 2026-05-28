import type { LegalDocument } from "@/constants/legal/types";

type Props = {
  title: string;
  document: LegalDocument;
};

export function LegalDocumentView({ title, document }: Props) {
  return (
    <article className="max-w-3xl mx-auto px-6 prose prose-slate dark:prose-invert">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {document.lastUpdated}
      </p>
      {document.sections.map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-3">
              {p}
            </p>
          ))}
        </section>
      ))}
      {document.footerNote ? (
        <p className="text-sm text-muted-foreground border-t pt-6">
          {document.footerNote}
        </p>
      ) : null}
    </article>
  );
}
