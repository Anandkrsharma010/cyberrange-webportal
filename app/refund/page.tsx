import Link from "next/link"
import Header from "@/components/Header"
import { LEGAL_SUPPORT_EMAIL } from "@/lib/legal-content"

export default function RefundPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cyber-dark-bg)" }}>
      <Header active="home" />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1
          className="mb-2 text-3xl font-bold"
          style={{ color: "var(--cyber-text-primary)" }}
        >
          Refund &amp; cancellation policy
        </h1>
        <p className="mb-8 text-sm" style={{ color: "var(--cyber-text-muted)" }}>
          Coming soon
        </p>
        <div
          className="space-y-4 text-sm leading-relaxed"
          style={{ color: "var(--cyber-text-secondary)" }}
        >
          <p>
            We are finalising our refund and cancellation terms with our advisors.
            This page will be updated when the policy is ready to publish.
          </p>
          <p>
            For billing or payment questions in the meantime, contact{" "}
            <a
              href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
              className="underline underline-offset-2"
              style={{ color: "var(--cyber-blue-primary)" }}
            >
              {LEGAL_SUPPORT_EMAIL}
            </a>{" "}
            and include your account email and order or payment reference if you have one.
          </p>
        </div>
        <p className="mt-10">
          <Link
            href="/"
            className="text-sm"
            style={{ color: "var(--cyber-blue-primary)" }}
          >
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  )
}
