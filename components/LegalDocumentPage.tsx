import Link from "next/link"
import type { LegalDocument } from "@/lib/legal-content"
import { LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL } from "@/lib/legal-content"

function LegalBlockContent({
  blocks,
}: {
  blocks: { paragraphs?: string[]; list?: string[] }[]
}) {
  return (
    <>
      {blocks.map((block, i) => (
        <div key={i} className="space-y-3">
          {block.paragraphs?.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {block.list && block.list.length > 0 && (
            <ul className="list-disc space-y-2 pl-5">
              {block.list.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  )
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1
        className="mb-2 text-3xl font-bold"
        style={{ color: "var(--cyber-text-primary)" }}
      >
        {document.title}
      </h1>
      <p className="mb-10 text-sm" style={{ color: "var(--cyber-text-muted)" }}>
        Last updated: {LEGAL_LAST_UPDATED}
      </p>

      <div
        className="space-y-10 text-sm leading-relaxed"
        style={{ color: "var(--cyber-text-secondary)" }}
      >
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2
              className="mb-4 text-lg font-semibold"
              style={{ color: "var(--cyber-text-primary)" }}
            >
              {section.title}
            </h2>
            <div className="space-y-4">
              {section.blocks.length > 0 && (
                <LegalBlockContent blocks={section.blocks} />
              )}
              {section.subsections?.map((sub) => (
                <div key={sub.title} className="space-y-3">
                  <h3
                    className="text-base font-medium"
                    style={{ color: "var(--cyber-text-primary)" }}
                  >
                    {sub.title}
                  </h3>
                  <LegalBlockContent blocks={sub.blocks} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm" style={{ color: "var(--cyber-text-secondary)" }}>
        Questions?{" "}
        <a
          href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
          className="underline underline-offset-2"
          style={{ color: "var(--cyber-blue-primary)" }}
        >
          {LEGAL_SUPPORT_EMAIL}
        </a>
      </p>

      <p className="mt-6">
        <Link
          href="/"
          className="text-sm"
          style={{ color: "var(--cyber-blue-primary)" }}
        >
          ← Back to home
        </Link>
      </p>
    </main>
  )
}
