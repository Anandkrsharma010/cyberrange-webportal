import Header from "@/components/Header"
import { LegalDocumentPage } from "@/components/LegalDocumentPage"
import { termsOfService } from "@/lib/legal-content"

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cyber-dark-bg)" }}>
      <Header active="home" />
      <LegalDocumentPage document={termsOfService} />
    </div>
  )
}
