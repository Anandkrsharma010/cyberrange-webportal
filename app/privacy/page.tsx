import Header from "@/components/Header"
import { LegalDocumentPage } from "@/components/LegalDocumentPage"
import { privacyPolicy } from "@/lib/legal-content"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cyber-dark-bg)" }}>
      <Header active="home" />
      <LegalDocumentPage document={privacyPolicy} />
    </div>
  )
}
