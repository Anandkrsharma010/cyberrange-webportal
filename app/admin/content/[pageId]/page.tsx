"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  History,
  Sparkles,
  CheckCircle2,
  FileText,
  Globe,
  AlertCircle,
  Settings,
  Layers,
  ExternalLink,
  RefreshCw,
  Monitor,
  Smartphone,
  Target,
  Server,
  Crosshair,
  ShieldCheck,
  LayoutGrid,
  LogIn,
  MousePointerClick,
  BarChart3,
  Cloud,
  Brain,
  Boxes,
  Cpu,
  ArrowRight,
  HelpCircle,
  Link2,
  Layout
} from "lucide-react"
import { api, type ContentPageRevision, type ContentSection, type ContentSectionType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/components/toast"
import { FeaturedLabsGrid } from "@/components/home/FeaturedLabsGrid"

const platformFeatures = [
  {
    icon: Server,
    title: "Real Environments",
    description: "Fully configured systems including Active Directory, SIEM, and attacker machines."
  },
  {
    icon: Crosshair,
    title: "End-to-End Scenarios",
    description: "Execute attacks and analyze detection within the same isolated environment."
  },
  {
    icon: ShieldCheck,
    title: "Isolated Execution",
    description: "Each session runs securely in a controlled environment with zero external impact."
  },
  {
    icon: LayoutGrid,
    title: "Structured Lab Design",
    description: "Labs are meticulously designed with clear objectives and realistic attack paths."
  }
]

const steps = [
  { icon: LogIn, title: "Authenticate", description: "Secure SSO login" },
  { icon: MousePointerClick, title: "Select Lab", description: "Choose environment" },
  { icon: Target, title: "Execute Scenarios", description: "Perform attacks" },
  { icon: BarChart3, title: "Analyze & Learn", description: "Review logs & outcomes" }
]

export default function ContentPageDetailEditor() {
  const params = useParams<{ pageId: string }>()
  const router = useRouter()
  const pageId = decodeURIComponent(params.pageId || "")
  const [loading, setLoading] = useState(true)
  const [savingPage, setSavingPage] = useState(false)
  const [creatingSection, setCreatingSection] = useState(false)
  const [activeTab, setActiveTab] = useState<"blocks" | "full_preview" | "settings" | "revisions">("blocks")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")

  const [page, setPage] = useState<{
    page_id: string
    slug: string
    title: string
    description?: string | null
    status: "draft" | "published" | "archived"
  } | null>(null)
  const [sections, setSections] = useState<ContentSection[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [revisions, setRevisions] = useState<ContentPageRevision[]>([])
  const [nextSectionType, setNextSectionType] = useState<ContentSectionType>("hero")

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getContentPage(pageId)
      setPage({
        page_id: res.page.page_id,
        slug: res.page.slug,
        title: res.page.title,
        description: res.page.description,
        status: res.page.status,
      })
      setTitle(res.page.title || "")
      setDescription(res.page.description || "")

      // Proactively auto-initialize starter blocks for 'home' if they are missing
      // so the user immediately sees edit options for all landing page sections
      if (res.page.slug === "home" && res.sections) {
        const existingTypes = res.sections.map((s) => s.section_type)
        let needsReload = false

        if (!existingTypes.includes("rich_text")) {
          await api.createContentSection(res.page.page_id, {
            section_key: "features_overview",
            section_type: "rich_text",
            position: 1,
            payload: {
              title: "Platform Capabilities",
              body: "Explore our advanced defense and attack simulation capabilities below.",
            },
            is_visible: true,
          })
          needsReload = true
        }
        if (!existingTypes.includes("media")) {
          await api.createContentSection(res.page.page_id, {
            section_key: "upcoming_environments",
            section_type: "media",
            position: 2,
            payload: {
              title: "Upcoming Environments",
              subtitle: "Next-generation training arenas currently in development.",
              items: [
                { title: "Cloud Native", desc: "AWS / Azure multi-cloud exploitation" },
                { title: "AI Security", desc: "Adversarial testing & prompt injection" },
                { title: "Web3 & Smart Contracts", desc: "DeFi vulnerability labs" },
                { title: "IoT / ICS", desc: "SCADA & device-level hardware attacks" },
              ],
            },
            is_visible: true,
          })
          needsReload = true
        }
        if (!existingTypes.includes("cta")) {
          await api.createContentSection(res.page.page_id, {
            section_key: "final_cta_banner",
            section_type: "cta",
            position: 3,
            payload: {
              title: "Ready to upgrade your skills?",
              body: "Join thousands of professionals mastering advanced defense techniques.",
              ctaText: "Access the Range",
              ctaLink: "/login",
            },
            is_visible: true,
          })
          needsReload = true
        }

        if (needsReload) {
          const fresh = await api.getContentPage(pageId)
          setSections(fresh.sections || [])
        } else {
          setSections(res.sections || [])
        }
      } else {
        setSections(res.sections || [])
      }

      const rev = await api.listContentPageRevisions(pageId)
      setRevisions(rev.revisions || [])
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load page editor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!pageId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId])

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.position - b.position),
    [sections],
  )

  const savePageMeta = async () => {
    if (!page) return
    setSavingPage(true)
    try {
      await api.patchContentPage(page.page_id, {
        title: title.trim(),
        description: description.trim(),
      })
      showToast("success", "Page metadata saved successfully")
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save page details")
    } finally {
      setSavingPage(false)
    }
  }

  const changePageStatus = async (newStatus: "draft" | "published" | "archived") => {
    if (!page) return
    if (newStatus === "published") {
      const ok = window.confirm("Publish this page now? This creates a revision snapshot and updates live public routes.")
      if (!ok) return
    }
    try {
      await api.patchContentPageStatus(page.page_id, newStatus)
      showToast("success", `Page status updated to ${newStatus}`)
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update status")
    }
  }

  const createSection = async (sectionType: ContentSectionType) => {
    if (!page) return
    setCreatingSection(true)
    try {
      await api.createContentSection(page.page_id, {
        section_key: `${sectionType}_${Date.now()}`,
        section_type: sectionType,
        position: sections.length,
        payload: {},
        is_visible: true,
      })
      showToast("success", `${sectionType} block initialized`)
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create section block")
    } finally {
      setCreatingSection(false)
    }
  }

  const saveSectionPayload = async (sectionId: string, rawJson: string) => {
    try {
      const payload = rawJson.trim() ? JSON.parse(rawJson) : {}
      await api.patchContentSection(sectionId, { payload })
      showToast("success", "Block content published successfully")
      await load()
    } catch {
      showToast("error", "Payload must be valid JSON structure")
    }
  }

  const handleLiveChange = (sectionId: string, newPayload: any) => {
    setSections((prev) =>
      prev.map((s) => (s.section_id === sectionId ? { ...s, payload: { ...s.payload, ...newPayload } } : s)),
    )
  }

  const moveSection = async (section: ContentSection, delta: -1 | 1) => {
    const current = sortedSections.findIndex((s) => s.section_id === section.section_id)
    const next = current + delta
    if (current < 0 || next < 0 || next >= sortedSections.length) return
    const target = sortedSections[next]
    try {
      await api.patchContentSection(section.section_id, { position: target.position })
      await api.patchContentSection(target.section_id, { position: section.position })
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reorder block")
    }
  }

  const removeSection = async (sectionId: string) => {
    const ok = window.confirm("Permanently delete this content block?")
    if (!ok) return
    try {
      await api.deleteContentSection(sectionId)
      showToast("success", "Content block deleted")
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete block")
    }
  }

  const rollbackRevision = async (revisionId: string) => {
    if (!page) return
    const ok = window.confirm("Rollback to this revision? Current content will be completely replaced with this snapshot.")
    if (!ok) return
    try {
      await api.rollbackContentPageRevision(page.page_id, revisionId)
      showToast("success", "Page successfully rolled back to snapshot")
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to rollback page")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading professional split-screen workspace...</p>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-16 text-center backdrop-blur-xl m-6">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Page Not Found</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">The requested page identifier could not be retrieved from the Content Studio database.</p>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-6 py-5">
          <Link href="/admin/content"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Studio Library</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Top Navigation Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl m-6 mb-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="outline"
              className="h-12 w-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white p-0 backdrop-blur-md transition-all duration-300"
            >
              <Link href="/admin/content">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-slate-300 border border-white/10">
                  <span className="text-emerald-400 font-bold">/</span>{page.slug}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                    page.status === "published"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                      : page.status === "archived"
                      ? "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    page.status === "published" ? "bg-emerald-400 animate-pulse" : page.status === "archived" ? "bg-zinc-400" : "bg-amber-400"
                  }`} />
                  {page.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{page.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {page.slug === "home" ? (
              <Button
                asChild
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl px-5 py-6 backdrop-blur-md transition-all shadow-lg"
              >
                <Link href="/" target="_blank">
                  <Globe className="mr-2 h-4 w-4 text-emerald-400" /> Open Live Route <ExternalLink className="ml-2 h-3.5 w-3.5 text-slate-400" />
                </Link>
              </Button>
            ) : null}

            <select
              className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none transition-all shadow-lg backdrop-blur-md"
              value={page.status}
              onChange={(e) => void changePageStatus(e.target.value as any)}
            >
              <option value="draft" className="bg-slate-900 text-amber-400 font-semibold">Status: Draft</option>
              <option value="published" className="bg-slate-900 text-emerald-400 font-semibold">Status: Published Live</option>
              <option value="archived" className="bg-slate-900 text-zinc-400 font-semibold">Status: Archived</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex border-b border-white/10 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("blocks")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === "blocks"
                ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" /> Content Blocks ({sortedSections.length})
          </button>
          <button
            onClick={() => setActiveTab("full_preview")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === "full_preview"
                ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <Layout className="w-4 h-4" /> Full Page Preview
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" /> Page Settings & Meta
          </button>
          <button
            onClick={() => setActiveTab("revisions")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === "revisions"
                ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <History className="w-4 h-4" /> Snapshots ({revisions.length})
          </button>
        </div>
      </section>

      {/* Main Container */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 items-start">
        {activeTab === "blocks" ? (
          <div className="space-y-8">
            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Visual Block Authoring & Inline Preview</h2>
                <p className="text-xs text-slate-400 mt-0.5">Every block features its own dedicated real-time preview right next to the form fields.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="h-10 flex-1 sm:w-44 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all font-medium"
                  value={nextSectionType}
                  onChange={(e) => setNextSectionType(e.target.value as ContentSectionType)}
                >
                  <option value="hero" className="bg-slate-900 text-white">Hero Block</option>
                  <option value="rich_text" className="bg-slate-900 text-white">Rich Text Block</option>
                  <option value="media" className="bg-slate-900 text-white">Media Block (Upcoming Arenas)</option>
                  <option value="cta" className="bg-slate-900 text-white">CTA Block (Final Banner)</option>
                  <option value="faq" className="bg-slate-900 text-white">FAQ Block (Q&A List)</option>
                  <option value="links" className="bg-slate-900 text-white">Links Block (Navigation)</option>
                  <option value="custom" className="bg-slate-900 text-white">Custom Block (Advanced)</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => void createSection(nextSectionType)}
                  disabled={creatingSection}
                  className="h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-4 transition-all shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02]"
                >
                  {creatingSection ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                  Add Block
                </Button>
              </div>
            </div>

            {/* Sections List */}
            <div className="space-y-8">
              {sortedSections.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center backdrop-blur-sm">
                  <Layers className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                  <h3 className="text-base font-semibold text-white mb-1">No Content Blocks Configured</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                    This page currently has no active content blocks. Choose a block type above to start authoring.
                  </p>
                </div>
              ) : (
                sortedSections.map((s, index) => (
                  <SectionEditorCard
                    key={s.section_id}
                    section={s}
                    index={index}
                    total={sortedSections.length}
                    onSavePayload={saveSectionPayload}
                    onLiveChange={handleLiveChange}
                    onToggleVisible={(visible) => void api.patchContentSection(s.section_id, { is_visible: visible }).then(load)}
                    onMoveUp={() => void moveSection(s, -1)}
                    onMoveDown={() => void moveSection(s, 1)}
                    onDelete={() => void removeSection(s.section_id)}
                  />
                ))
              )}
            </div>
          </div>
        ) : activeTab === "full_preview" ? (
          <div className="space-y-4">
            {/* Mock Browser Window Header */}
            <div className="flex items-center justify-between rounded-t-3xl border border-white/10 bg-white/[0.05] px-6 py-4 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full bg-red-500/80 border border-red-500 shadow-sm" />
                <div className="h-3.5 w-3.5 rounded-full bg-amber-500/80 border border-amber-500 shadow-sm" />
                <div className="h-3.5 w-3.5 rounded-full bg-emerald-500/80 border border-emerald-500 shadow-sm" />
                <span className="ml-4 rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-slate-400 border border-white/10 flex items-center gap-1.5 max-w-[240px] truncate">
                  <Globe className="w-3 h-3 text-emerald-400" /> https://cyberrange.dev/{page.slug === "home" ? "" : page.slug}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> FULL PAGE LIVE PREVIEW
                </div>

                {/* Viewport Toggles */}
                <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
                  <button
                    onClick={() => setPreviewMode("desktop")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      previewMode === "desktop" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                    title="Desktop View"
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode("mobile")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      previewMode === "mobile" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                    title="Mobile View"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>
              </div>
            </div>

            {/* Mock Browser Viewport Body */}
            <div className={`overflow-y-auto rounded-b-3xl border-x border-b border-white/10 bg-[#0A0A0B] transition-all duration-500 mx-auto shadow-2xl relative ${
              previewMode === "desktop" ? "w-full max-h-[82vh]" : "w-[380px] max-h-[72vh] border-4 border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            }`}>
              <LiveLandingPagePreview sections={sortedSections} pageSlug={page.slug} pageTitle={page.title} />
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Settings className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold tracking-tight text-white">Route Metadata & SEO Configuration</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Page Display Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Cyber Defense"
                />
                <p className="text-xs text-slate-500 mt-1.5 font-light">Used in browser tabs and search engine title tags.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Meta Description</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of page content for search engines"
                />
                <p className="text-xs text-slate-500 mt-1.5 font-light">Provides preview snippets in Google and social sharing cards.</p>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-6">
              <Button
                onClick={() => void savePageMeta()}
                disabled={savingPage}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
              >
                {savingPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Metadata Configuration
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <History className="h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Revision Snapshots</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-light">Instantly restore any prior published state below.</p>
              </div>
            </div>

            {revisions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
                <History className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                <p className="text-sm font-medium text-slate-300 mb-1">No Snapshots Available</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Publish this page live to generate your first immutable revision snapshot.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((r, index) => (
                  <div
                    key={r.revision_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 font-bold text-sm">
                        #{revisions.length - index}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                          {r.reason || "System Snapshot"}
                          {index === 0 && <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">Latest Snapshot</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void rollbackRevision(r.revision_id)}
                      className="border-white/10 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded-xl px-5 py-5 transition-all shadow-md"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Restore Snapshot
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function SectionEditorCard({
  section,
  index,
  total,
  onSavePayload,
  onLiveChange,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  section: ContentSection
  index: number
  total: number
  onSavePayload: (sectionId: string, rawJson: string) => void
  onLiveChange: (sectionId: string, newPayload: any) => void
  onToggleVisible: (visible: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  const payload = section.payload || {}
  const [headline, setHeadline] = useState(String(payload.headline || ""))
  const [subheadline, setSubheadline] = useState(String(payload.subheadline || payload.subtitle || ""))
  const [title, setTitle] = useState(String(payload.title || ""))
  const [body, setBody] = useState(String(payload.body || ""))
  const [ctaText, setCtaText] = useState(String(payload.ctaText || ""))
  const [ctaLink, setCtaLink] = useState(String(payload.ctaLink || ""))
  const [secondaryCtaText, setSecondaryCtaText] = useState(String(payload.secondaryCtaText || ""))
  const [secondaryCtaLink, setSecondaryCtaLink] = useState(String(payload.secondaryCtaLink || ""))
  
  const [items, setItems] = useState<Array<{ title: string; desc: string }>>(
    Array.isArray(payload.items) ? payload.items : [
      { title: "Cloud Native", desc: "AWS / Azure multi-cloud exploitation" },
      { title: "AI Security", desc: "Adversarial testing & prompt injection" },
      { title: "Web3 & Smart Contracts", desc: "DeFi vulnerability labs" },
      { title: "IoT / ICS", desc: "SCADA & device-level hardware attacks" },
    ]
  )

  const [faqItems, setFaqItems] = useState<Array<{ q: string; a: string }>>(
    Array.isArray(payload.faqItems) ? payload.faqItems : [
      { q: "What is RangeOps?", a: "RangeOps provides fully configured, realistic cyber defense environments." },
      { q: "How do I get started?", a: "Simply select a lab from the catalog and deploy your environment." }
    ]
  )

  const [linkItems, setLinkItems] = useState<Array<{ label: string; url: string }>>(
    Array.isArray(payload.linkItems) ? payload.linkItems : [
      { label: "Documentation", url: "/docs" },
      { label: "Support", url: "/support" }
    ]
  )

  const [customRaw, setCustomRaw] = useState(JSON.stringify(payload, null, 2))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = section.payload || {}
    setHeadline(String(p.headline || ""))
    setSubheadline(String(p.subheadline || p.subtitle || ""))
    setTitle(String(p.title || ""))
    setBody(String(p.body || ""))
    setCtaText(String(p.ctaText || ""))
    setCtaLink(String(p.ctaLink || ""))
    setSecondaryCtaText(String(p.secondaryCtaText || ""))
    setSecondaryCtaLink(String(p.secondaryCtaLink || ""))
    setItems(Array.isArray(p.items) ? p.items : [
      { title: "Cloud Native", desc: "AWS / Azure multi-cloud exploitation" },
      { title: "AI Security", desc: "Adversarial testing & prompt injection" },
      { title: "Web3 & Smart Contracts", desc: "DeFi vulnerability labs" },
      { title: "IoT / ICS", desc: "SCADA & device-level hardware attacks" },
    ])
    setFaqItems(Array.isArray(p.faqItems) ? p.faqItems : [
      { q: "What is RangeOps?", a: "RangeOps provides fully configured, realistic cyber defense environments." },
      { q: "How do I get started?", a: "Simply select a lab from the catalog and deploy your environment." }
    ])
    setLinkItems(Array.isArray(p.linkItems) ? p.linkItems : [
      { label: "Documentation", url: "/docs" },
      { label: "Support", url: "/support" }
    ])
    setCustomRaw(JSON.stringify(p, null, 2))
  }, [section.payload])

  const notifyLive = (overrides: any) => {
    onLiveChange(section.section_id, {
      headline, subheadline, title, subtitle: subheadline, body,
      ctaText, ctaLink, secondaryCtaText, secondaryCtaLink,
      items, faqItems, linkItems, ...overrides
    })
  }

  const handleHeadlineChange = (val: string) => { setHeadline(val); notifyLive({ headline: val }); }
  const handleSubheadlineChange = (val: string) => { setSubheadline(val); notifyLive({ subheadline: val, subtitle: val }); }
  const handleCtaTextChange = (val: string) => { setCtaText(val); notifyLive({ ctaText: val }); }
  const handleCtaLinkChange = (val: string) => { setCtaLink(val); notifyLive({ ctaLink: val }); }
  const handleSecondaryCtaTextChange = (val: string) => { setSecondaryCtaText(val); notifyLive({ secondaryCtaText: val }); }
  const handleSecondaryCtaLinkChange = (val: string) => { setSecondaryCtaLink(val); notifyLive({ secondaryCtaLink: val }); }
  const handleTitleChange = (val: string) => { setTitle(val); notifyLive({ title: val }); }
  const handleBodyChange = (val: string) => { setBody(val); notifyLive({ body: val }); }
  
  const handleItemChange = (index: number, field: "title" | "desc", value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
    notifyLive({ items: newItems })
  }

  const handleFaqChange = (index: number, field: "q" | "a", value: string) => {
    const newFaqs = [...faqItems]
    newFaqs[index] = { ...newFaqs[index], [field]: value }
    setFaqItems(newFaqs)
    notifyLive({ faqItems: newFaqs })
  }
  const addFaqItem = () => {
    const newFaqs = [...faqItems, { q: "New Question?", a: "New Answer text here." }]
    setFaqItems(newFaqs)
    notifyLive({ faqItems: newFaqs })
  }
  const removeFaqItem = (index: number) => {
    const newFaqs = faqItems.filter((_, i) => i !== index)
    setFaqItems(newFaqs)
    notifyLive({ faqItems: newFaqs })
  }

  const handleLinkChange = (index: number, field: "label" | "url", value: string) => {
    const newLinks = [...linkItems]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setLinkItems(newLinks)
    notifyLive({ linkItems: newLinks })
  }
  const addLinkItem = () => {
    const newLinks = [...linkItems, { label: "New Link", url: "/path" }]
    setLinkItems(newLinks)
    notifyLive({ linkItems: newLinks })
  }
  const removeLinkItem = (index: number) => {
    const newLinks = linkItems.filter((_, i) => i !== index)
    setLinkItems(newLinks)
    notifyLive({ linkItems: newLinks })
  }

  const handleCustomRawChange = (val: string) => {
    setCustomRaw(val)
    try {
      const parsed = JSON.parse(val)
      onLiveChange(section.section_id, parsed)
    } catch {
      // Keep previous valid payload in live preview while typing invalid JSON
    }
  }

  const saveTypedPayload = async () => {
    setSaving(true)
    try {
      if (section.section_type === "hero") {
        await onSavePayload(
          section.section_id,
          JSON.stringify({ headline, subheadline, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink }, null, 2),
        )
      } else if (section.section_type === "rich_text") {
        await onSavePayload(section.section_id, JSON.stringify({ title, body }, null, 2))
      } else if (section.section_type === "media") {
        await onSavePayload(section.section_id, JSON.stringify({ title, subtitle: subheadline, items }, null, 2))
      } else if (section.section_type === "cta") {
        await onSavePayload(section.section_id, JSON.stringify({ title, body, ctaText, ctaLink }, null, 2))
      } else if (section.section_type === "faq") {
        await onSavePayload(section.section_id, JSON.stringify({ title, subtitle: subheadline, faqItems }, null, 2))
      } else if (section.section_type === "links") {
        await onSavePayload(section.section_id, JSON.stringify({ title, subtitle: subheadline, linkItems }, null, 2))
      } else {
        let base = {}
        try { base = JSON.parse(customRaw) } catch {}
        await onSavePayload(section.section_id, JSON.stringify({ ...base, title, subtitle: subheadline, body }, null, 2))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`rounded-3xl border transition-all duration-300 backdrop-blur-xl bg-white/[0.02] shadow-xl overflow-hidden ${
      section.is_visible ? "border-white/10 hover:border-white/20" : "border-white/5 opacity-60"
    }`}>
      {/* Card Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-7 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 font-bold text-xs text-slate-400">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {section.section_type}
              </span>
              <span className="text-sm font-bold text-white tracking-tight">{section.section_key}</span>
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisible(!section.is_visible)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
              section.is_visible ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
            }`}
          >
            {section.is_visible ? <Eye className="mr-1.5 h-3.5 w-3.5" /> : <EyeOff className="mr-1.5 h-3.5 w-3.5" />}
            {section.is_visible ? "Visible" : "Hidden"}
          </Button>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

          <Button
            variant="ghost" size="sm"
            onClick={onMoveUp} disabled={index === 0}
            className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 rounded-lg"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onMoveDown} disabled={index === total - 1}
            className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 rounded-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

          <Button
            variant="ghost" size="sm"
            onClick={onDelete}
            className="h-8 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Live Helper Context Callout */}
      <div className="bg-white/[0.01] px-7 py-3 border-b border-white/5 flex items-center gap-2.5 text-xs text-slate-400 font-light italic">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          {section.section_type === "hero" && "Controls the main landing page headline, subheadline description, and CTA button destinations."}
          {section.section_type === "rich_text" && "Controls section titles like 'Platform Capabilities' and accompanying promotional body copy."}
          {section.section_type === "media" && "Controls the 'Upcoming Environments' section title, subtitle, and the 4 arena development cards."}
          {section.section_type === "cta" && "Controls the Final Call-To-Action banner title, description, and button links at the bottom of the page."}
          {section.section_type === "faq" && "Controls Frequently Asked Questions with expandable Q&A items."}
          {section.section_type === "links" && "Controls navigation link groups and resource directories."}
          {section.section_type === "custom" && "Advanced custom block with visual title/body fields plus expandable JSON payload configuration."}
        </span>
      </div>

      {/* Main Grid: Form Fields on Left, Dedicated Component Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-7 items-start">
        {/* Left Side: Form Fields */}
        <div className="lg:col-span-6 space-y-6">
          {section.section_type === "hero" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Main Hero Headline</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Master Cyber Defense with Real-World Scenarios"
                  value={headline}
                  onChange={(e) => handleHeadlineChange(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Subheadline Description</label>
                <textarea
                  className="w-full min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all leading-relaxed font-light"
                  placeholder="Experience RangeOps by DeepTrustxAI Academy..."
                  value={subheadline}
                  onChange={(e) => handleSubheadlineChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Primary CTA Button Text</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="e.g. Get Started Today"
                  value={ctaText}
                  onChange={(e) => handleCtaTextChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Primary CTA Link URL</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 font-mono text-emerald-300"
                  placeholder="e.g. /labs or /login"
                  value={ctaLink}
                  onChange={(e) => handleCtaLinkChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Secondary CTA Button Text</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="e.g. Explore Curriculum"
                  value={secondaryCtaText}
                  onChange={(e) => handleSecondaryCtaTextChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Secondary CTA Link URL</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 font-mono text-emerald-300"
                  placeholder="e.g. /labs"
                  value={secondaryCtaLink}
                  onChange={(e) => handleSecondaryCtaLinkChange(e.target.value)}
                />
              </div>
            </div>
          ) : section.section_type === "media" ? (
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Upcoming Environments Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Upcoming Environments"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Subtitle Description</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-light"
                  placeholder="e.g. Next-generation training arenas currently in development."
                  value={subheadline}
                  onChange={(e) => handleSubheadlineChange(e.target.value)}
                />
              </div>
              <div className="border-t border-white/10 pt-6 space-y-6">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure 4 Arena Cards</label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid gap-4 md:grid-cols-2 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Card #{idx + 1} Title</label>
                      <input
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        value={item.title}
                        onChange={(e) => handleItemChange(idx, "title", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Card #{idx + 1} Description</label>
                      <input
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        value={item.desc}
                        onChange={(e) => handleItemChange(idx, "desc", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : section.section_type === "faq" ? (
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">FAQ Section Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Frequently Asked Questions"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Subtitle Description</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-light"
                  placeholder="e.g. Have questions? We have answers."
                  value={subheadline}
                  onChange={(e) => handleSubheadlineChange(e.target.value)}
                />
              </div>
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Q&A Items ({faqItems.length})</label>
                  <Button size="sm" variant="outline" onClick={addFaqItem} className="border-white/10 bg-white/5 text-white h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                  </Button>
                </div>
                {faqItems.map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative group/faq">
                    <Button
                      size="sm" variant="ghost" onClick={() => removeFaqItem(idx)}
                      className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover/faq:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Question #{idx + 1}</label>
                      <input
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-semibold"
                        value={faq.q}
                        onChange={(e) => handleFaqChange(idx, "q", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Answer Text</label>
                      <textarea
                        className="w-full min-h-[60px] rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-light leading-relaxed"
                        value={faq.a}
                        onChange={(e) => handleFaqChange(idx, "a", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : section.section_type === "links" ? (
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Links Group Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Quick Links"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Navigation Links ({linkItems.length})</label>
                  <Button size="sm" variant="outline" onClick={addLinkItem} className="border-white/10 bg-white/5 text-white h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Link
                  </Button>
                </div>
                {linkItems.map((link, idx) => (
                  <div key={idx} className="grid gap-4 md:grid-cols-2 p-4 rounded-2xl bg-white/5 border border-white/10 relative group/link">
                    <Button
                      size="sm" variant="ghost" onClick={() => removeLinkItem(idx)}
                      className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover/link:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Link #{idx + 1} Label</label>
                      <input
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-medium"
                        value={link.label}
                        onChange={(e) => handleLinkChange(idx, "label", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase">Destination URL</label>
                      <input
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
                        value={link.url}
                        onChange={(e) => handleLinkChange(idx, "url", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : section.section_type === "rich_text" || section.section_type === "cta" ? (
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Section Heading Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Platform Capabilities"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Body Copy / Description</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all leading-relaxed font-light"
                  placeholder="Enter supporting narrative text..."
                  value={body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                />
              </div>
              {section.section_type === "cta" ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">CTA Button Text</label>
                    <input
                      className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                      placeholder="e.g. Join the Arena"
                      value={ctaText}
                      onChange={(e) => handleCtaTextChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">CTA Destination URL</label>
                    <input
                      className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="e.g. /register"
                      value={ctaLink}
                      onChange={(e) => handleCtaLinkChange(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Custom Section Title</label>
                <input
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
                  placeholder="e.g. Custom Component Title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Custom Body / Narrative</label>
                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all leading-relaxed font-light"
                  placeholder="Enter narrative text..."
                  value={body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                />
              </div>
              <div className="border-t border-white/10 pt-6">
                <label className="block text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">Advanced JSON Payload</label>
                <textarea
                  className="w-full min-h-[160px] rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all leading-relaxed"
                  value={customRaw}
                  onChange={(e) => handleCustomRawChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end border-t border-white/10 pt-6">
            <Button
              onClick={() => void saveTypedPayload()}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Publish Block Changes
            </Button>
          </div>
        </div>

        {/* Right Side: Dedicated Real-time Component Preview */}
        <div className="lg:col-span-6 sticky top-6 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Live Block Preview
            </span>
            <Badge className="bg-white/5 border border-white/10 text-[10px] text-slate-400 px-2.5 py-0.5">Real-time Component Render</Badge>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0A0A0B] p-6 shadow-2xl overflow-hidden relative group/preview min-h-[280px] flex flex-col justify-center">
            {section.section_type === "hero" ? (
              <div className="text-center py-8 px-4 relative z-10">
                <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-3 py-1">
                  Real Infrastructure. No Simulations.
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                  {headline || "Hero Headline"}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mb-8 max-w-lg mx-auto leading-relaxed font-light">
                  {subheadline || "Hero Subheadline description..."}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-5 rounded-xl shadow-lg shadow-emerald-500/20">
                    {ctaText || "Primary CTA"}
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 px-6 py-5 rounded-xl">
                    {secondaryCtaText || "Secondary CTA"}
                  </Button>
                </div>
              </div>
            ) : section.section_type === "rich_text" ? (
              <div className="py-6 px-2">
                <div className="text-center mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">{title || "Section Title"}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-light max-w-lg mx-auto">{body || "Section Body description..."}</p>
                  <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto mt-4 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {platformFeatures.slice(0, 2).map((feat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <feat.icon className="w-5 h-5 text-emerald-400 mb-3" />
                      <h4 className="font-semibold text-white text-sm mb-1">{feat.title}</h4>
                      <p className="text-xs text-slate-400">{feat.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : section.section_type === "media" ? (
              <div className="py-6 px-2">
                <div className="mb-6 text-center sm:text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">{title || "Upcoming Environments"}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-light">{subheadline || "Next-generation training arenas..."}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((item, idx) => {
                    const icons = [Cloud, Brain, Boxes, Cpu]
                    const IconComp = icons[idx % icons.length]
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                        <IconComp className="w-6 h-6 text-slate-500 mb-3" />
                        <h4 className="font-semibold text-white text-sm mb-1">{item.title || `Card #${idx + 1}`}</h4>
                        <p className="text-xs text-slate-400 mb-4">{item.desc || "Description..."}</p>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2.5 py-0.5 rounded-full">
                          In Development
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : section.section_type === "cta" ? (
              <div className="py-10 px-6 text-center bg-gradient-to-r from-emerald-950/40 to-blue-950/40 rounded-3xl border border-emerald-500/20 my-4 shadow-2xl">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">{title || "CTA Title"}</h3>
                <p className="text-slate-400 text-xs sm:text-sm mb-8 max-w-md mx-auto font-light leading-relaxed">{body || "CTA Body description..."}</p>
                <Button size="sm" className="bg-white hover:bg-slate-200 text-slate-950 font-bold px-8 py-6 rounded-xl shadow-lg">
                  {ctaText || "Action Button"}
                </Button>
              </div>
            ) : section.section_type === "faq" ? (
              <div className="py-6 px-2 space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{title || "Frequently Asked Questions"}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-light">{subheadline || "Have questions? We have answers."}</p>
                </div>
                <div className="space-y-3">
                  {faqItems.map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="font-semibold text-white text-xs sm:text-sm mb-1">Q: {faq.q}</h4>
                      <p className="text-xs text-slate-400 font-light">A: {faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : section.section_type === "links" ? (
              <div className="py-6 px-2 space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{title || "Quick Links"}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-light">{subheadline || "Navigation resources"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {linkItems.map((link, idx) => (
                    <span key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> {link.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 px-2 space-y-4">
                <h3 className="text-xl font-bold text-white">{title || "Custom Section Title"}</h3>
                <p className="text-slate-400 text-xs font-light">{body || "Custom body..."}</p>
                <pre className="font-mono text-[10px] text-slate-500 bg-black/50 p-4 rounded-xl overflow-x-auto">
                  {customRaw}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

/* ── LIVE INTERACTIVE LANDING PAGE PREVIEW REPLICA ── */
function LiveLandingPagePreview({ sections, pageSlug, pageTitle }: { sections: ContentSection[]; pageSlug: string; pageTitle: string }) {
  const cmsByType = useMemo(() => {
    return {
      firstHero: sections.find((s) => s.section_type === "hero") || null,
      firstText: sections.find((s) => s.section_type === "rich_text") || null,
      firstCta: sections.find((s) => s.section_type === "cta") || null,
      firstMedia: sections.find((s) => s.section_type === "media") || null,
    }
  }, [sections])

  const heroHeadline = String(cmsByType.firstHero?.payload?.headline || "Master Cyber Defense with Real-World Scenarios")
  const heroSubheadline = String(
    cmsByType.firstHero?.payload?.subheadline ||
      "Experience RangeOps by DeepTrustxAI Academy. Immerse yourself in fully configured, isolated environments crafted for advanced attack and defense simulations."
  )
  const heroPrimaryCtaText = String(cmsByType.firstHero?.payload?.ctaText || "Get Started Today")
  const heroPrimaryCtaLink = String(cmsByType.firstHero?.payload?.ctaLink || "/login")
  const heroSecondaryCtaText = String(cmsByType.firstHero?.payload?.secondaryCtaText || "Explore Curriculum")
  const heroSecondaryCtaLink = String(cmsByType.firstHero?.payload?.secondaryCtaLink || "/labs")
  
  const provideTitle = String(cmsByType.firstText?.payload?.title || "Platform Capabilities")
  const provideBody = String(cmsByType.firstText?.payload?.body || "Explore our advanced defense and attack simulation capabilities below.")

  const upcomingTitle = String(cmsByType.firstMedia?.payload?.title || "Upcoming Environments")
  const upcomingSubtitle = String(cmsByType.firstMedia?.payload?.subtitle || "Next-generation training arenas currently in development.")
  const defaultUpcomingItems = [
    { title: "Cloud Native", desc: "AWS / Azure multi-cloud exploitation" },
    { title: "AI Security", desc: "Adversarial testing & prompt injection" },
    { title: "Web3 & Smart Contracts", desc: "DeFi vulnerability labs" },
    { title: "IoT / ICS", desc: "SCADA & device-level hardware attacks" },
  ]
  const upcomingItems = Array.isArray(cmsByType.firstMedia?.payload?.items) 
    ? cmsByType.firstMedia.payload.items 
    : defaultUpcomingItems

  const ctaTitle = String(cmsByType.firstCta?.payload?.title || "Ready to upgrade your skills?")
  const ctaBody = String(cmsByType.firstCta?.payload?.body || "Join thousands of professionals mastering advanced defense techniques.")
  const ctaBtnText = String(cmsByType.firstCta?.payload?.ctaText || "Access the Range")
  const ctaBtnLink = String(cmsByType.firstCta?.payload?.ctaLink || "/login")

  // Mock Header for Preview Container
  const mockHeader = (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#0A0A0B]/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-white tracking-tight text-lg">RangeOps</span>
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5">PREVIEW</Badge>
      </div>
      <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-300">
        <span className="hover:text-white cursor-pointer transition-colors">Labs</span>
        <span className="hover:text-white cursor-pointer transition-colors">Curriculum</span>
        <span className="hover:text-white cursor-pointer transition-colors">Leaderboard</span>
      </nav>
      <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white text-xs py-1 px-3">
        Sign In
      </Button>
    </header>
  )

  if (pageSlug !== "home") {
    return (
      <div className="min-h-[70vh] bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30">
        {mockHeader}
        <div className="container mx-auto px-8 py-20 max-w-4xl">
          <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1">
            /{pageSlug} • Live Interactive Route Preview
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">{pageTitle}</h1>

          {sections.length === 0 ? (
            <p className="text-slate-400 italic font-light">No content blocks configured for this route yet.</p>
          ) : (
            <div className="space-y-16 mt-12">
              {sections.map((sec, i) => (
                <div key={sec.section_id} className="relative group p-6 rounded-3xl border border-white/10 bg-white/[0.01] hover:border-emerald-500/40 transition-all">
                  <div className="absolute -top-3 left-6 bg-[#0A0A0B] px-3 py-0.5 border border-white/10 rounded-full font-mono text-[10px] text-emerald-400 font-bold uppercase">
                    Block #{i + 1}: {sec.section_type}
                  </div>
                  {sec.section_type === "hero" ? (
                    <div className="text-center py-8">
                      <h2 className="text-3xl font-bold text-white mb-4">{String(sec.payload?.headline || "Hero Headline")}</h2>
                      <p className="text-slate-400 mb-6 max-w-xl mx-auto">{String(sec.payload?.subheadline || "Hero Subheadline")}</p>
                      <div className="flex justify-center gap-4">
                        <Button size="sm" className="bg-emerald-50 text-slate-950 font-bold">{String(sec.payload?.ctaText || "Primary CTA")}</Button>
                        <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white">{String(sec.payload?.secondaryCtaText || "Secondary CTA")}</Button>
                      </div>
                    </div>
                  ) : sec.section_type === "rich_text" ? (
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-3">{String(sec.payload?.title || "Section Title")}</h3>
                      <p className="text-slate-400 leading-relaxed font-light">{String(sec.payload?.body || "Section Body")}</p>
                    </div>
                  ) : sec.section_type === "media" ? (
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{String(sec.payload?.title || "Upcoming Environments")}</h3>
                      <p className="text-slate-400 mb-6 text-sm">{String(sec.payload?.subtitle || "Next-generation training arenas currently in development.")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(Array.isArray(sec.payload?.items) ? sec.payload.items : defaultUpcomingItems).map((item: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                            <p className="text-xs text-slate-400">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sec.section_type === "cta" ? (
                    <div className="bg-gradient-to-r from-emerald-950/30 to-blue-950/30 p-8 rounded-2xl border border-emerald-500/20 text-center">
                      <h3 className="text-2xl font-bold text-white mb-2">{String(sec.payload?.title || "CTA Title")}</h3>
                      <p className="text-slate-400 mb-6 max-w-md mx-auto">{String(sec.payload?.body || "CTA Body")}</p>
                      <Button size="sm" className="bg-white text-slate-950 font-bold">{String(sec.payload?.ctaText || "Action Button")}</Button>
                    </div>
                  ) : sec.section_type === "faq" ? (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white mb-1">{String(sec.payload?.title || "Frequently Asked Questions")}</h3>
                      <p className="text-slate-400 mb-6 text-sm">{String(sec.payload?.subtitle || sec.payload?.subheadline || "")}</p>
                      <div className="space-y-3">
                        {(Array.isArray(sec.payload?.faqItems) ? sec.payload.faqItems : [
                          { q: "What is RangeOps?", a: "RangeOps provides fully configured, realistic cyber defense environments." },
                          { q: "How do I get started?", a: "Simply select a lab from the catalog and deploy your environment." }
                        ]).map((faq: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h4 className="font-semibold text-white text-sm mb-1">Q: {faq.q}</h4>
                            <p className="text-xs text-slate-400 font-light">A: {faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sec.section_type === "links" ? (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white mb-1">{String(sec.payload?.title || "Quick Links")}</h3>
                      <div className="flex flex-wrap gap-4">
                        {(Array.isArray(sec.payload?.linkItems) ? sec.payload.linkItems : [
                          { label: "Documentation", url: "/docs" },
                          { label: "Support", url: "/support" }
                        ]).map((link: any, idx: number) => (
                          <Link key={idx} href={link.url} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-white/10 text-sm font-medium flex items-center gap-2 transition-all">
                            <Link2 className="w-4 h-4" /> {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-white">{String(sec.payload?.title || "Custom Section")}</h3>
                      <p className="text-slate-400 font-light">{String(sec.payload?.body || "")}</p>
                      <pre className="font-mono text-xs text-slate-500 overflow-x-auto p-4 bg-black/40 rounded-xl">
                        {JSON.stringify(sec.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full Pre-Login Landing Page Replica for 'home'
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30">
      {mockHeader}

      {/* Hero Section Preview */}
      <section className="relative min-h-[75vh] flex flex-col justify-center items-center overflow-hidden border-b border-white/5">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-teal-600/10 blur-[100px] animate-pulse" style={{ animationDuration: "12s" }} />
        </div>

        <div className="container relative z-10 mx-auto px-6 pt-16 pb-24 text-center">
          <Badge className="mb-6 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium tracking-wide uppercase text-xs backdrop-blur-sm">
            Real Infrastructure. No Simulations.
          </Badge>

          <div className="relative group p-4 rounded-3xl border border-transparent hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0A0B] px-3 py-0.5 border border-emerald-500/40 rounded-full font-mono text-[10px] text-emerald-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Live Editing: Hero Block
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 max-w-4xl mx-auto leading-[1.15]">
              {heroHeadline}
            </h1>

            <p className="text-base md:text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              {heroSubheadline}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="group relative overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-6 text-base font-bold rounded-2xl transition-all duration-300 shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)]"
                asChild
              >
                <Link href={heroPrimaryCtaLink} onClick={(e) => e.preventDefault()}>
                  <span className="relative z-10 flex items-center gap-2">
                    {heroPrimaryCtaText}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group border border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 px-8 py-6 text-base font-semibold rounded-2xl transition-all"
                asChild
              >
                <Link href={heroSecondaryCtaLink} onClick={(e) => e.preventDefault()}>
                  {heroSecondaryCtaText}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Preview */}
      <section className="py-24 relative z-10 bg-[#0A0A0B] border-b border-white/5">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 relative group p-4 rounded-3xl border border-transparent hover:border-emerald-500/40 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0A0B] px-3 py-0.5 border border-emerald-500/40 rounded-full font-mono text-[10px] text-emerald-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Live Editing: Rich Text Block
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">{provideTitle}</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm font-light mb-4">{provideBody}</p>
            <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformFeatures.map((feature, i) => (
              <div
                key={feature.title}
                className={`group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 hover:border-emerald-500/30 transition-all ${
                  i === 0 || i === 3 ? "lg:col-span-2" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section Preview */}
      <section className="py-24 relative z-10 border-b border-white/5">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xl" />
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Workflow</h2>
            <p className="text-slate-400 text-sm font-light">From zero to full attack execution in minutes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center group relative w-full">
                <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <step.icon className="w-8 h-8 text-slate-300 group-hover:text-emerald-400 transition-colors" strokeWidth={1.5} />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-50 text-slate-950 font-bold flex items-center justify-center text-xs shadow-lg shadow-emerald-500/30">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-[180px] mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-[#0A0A0B] border-b border-white/5 py-12 scale-[0.95] origin-top">
        <FeaturedLabsGrid />
      </div>

      {/* Upcoming Environments Preview */}
      <section className="py-24 relative z-10 bg-[#0A0A0B] border-b border-white/5 overflow-hidden">
        <div className="container mx-auto px-6 max-w-6xl relative group p-6 rounded-3xl border border-transparent hover:border-emerald-500/40 transition-all">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0A0B] px-3 py-0.5 border border-emerald-500/40 rounded-full font-mono text-[10px] text-emerald-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
            Live Editing: Media Block
          </div>
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">{upcomingTitle}</h2>
            <p className="text-slate-400 text-sm font-light">{upcomingSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingItems.map((item, idx) => {
              const icons = [Cloud, Brain, Boxes, Cpu]
              const IconComp = icons[idx % icons.length]
              return (
                <div key={idx} className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 relative overflow-hidden">
                  <IconComp className="w-8 h-8 text-slate-500 mb-4 group-hover:text-emerald-400 transition-colors" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-xs mb-6">{item.desc}</p>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 font-medium text-[10px]">
                    In Development
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Preview */}
      <section className="py-24 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent" />
        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10 group p-6 rounded-3xl border border-transparent hover:border-emerald-500/40 transition-all">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0A0B] px-3 py-0.5 border border-emerald-500/40 rounded-full font-mono text-[10px] text-emerald-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
            Live Editing: CTA Block
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">{ctaTitle}</h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto font-light">{ctaBody}</p>
          <Button
            size="lg"
            className="group bg-white text-slate-950 hover:bg-slate-200 px-10 py-7 text-base font-bold rounded-2xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            asChild
          >
            <Link href={ctaBtnLink} onClick={(e) => e.preventDefault()}>
              <span className="flex items-center gap-2">
                {ctaBtnText}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
