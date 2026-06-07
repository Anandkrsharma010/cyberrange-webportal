"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, FileText, Globe, Archive, Sparkles, Layers, Clock, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/toast"
import { api, type ContentActivityRow, type ContentPage, type ContentPageStatus, type ContentSectionType } from "@/lib/api"
import Link from "next/link"

export default function AdminContentPage() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activePageId, setActivePageId] = useState<string>("")
  const [pages, setPages] = useState<ContentPage[]>([])
  const [sectionCountByPage, setSectionCountByPage] = useState<Record<string, number>>({})
  const [form, setForm] = useState({
    slug: "",
    title: "",
    description: "",
  })
  const [lastCreatedSection, setLastCreatedSection] = useState<{
    sectionId: string
    pageId: string
    sectionType: ContentSectionType
  } | null>(null)
  const [activity, setActivity] = useState<ContentActivityRow[]>([])
  const [quickSectionType, setQuickSectionType] = useState<ContentSectionType>("hero")

  const loadPages = async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.listContentPages()
      setPages(res.pages || [])
      const activityRes = await api.contentActivity(20)
      setActivity(activityRes.rows || [])

      const topIds = (res.pages || []).slice(0, 12).map((p) => p.page_id)
      const sectionMap: Record<string, number> = {}
      await Promise.all(
        topIds.map(async (id) => {
          try {
            const detail = await api.getContentPage(id)
            sectionMap[id] = detail.sections.length
          } catch {
            sectionMap[id] = 0
          }
        }),
      )
      setSectionCountByPage(sectionMap)
      if (!activePageId && res.pages?.[0]?.page_id) setActivePageId(res.pages[0].page_id)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load content studio pages")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const total = pages.length
    const drafts = pages.filter((p) => p.status === "draft").length
    const published = pages.filter((p) => p.status === "published").length
    return { total, drafts, published }
  }, [pages])

  const lastCreatedPage = useMemo(
    () => pages.find((p) => p.page_id === lastCreatedSection?.pageId) || null,
    [lastCreatedSection?.pageId, pages],
  )

  const createPage = async () => {
    const slug = form.slug.trim().toLowerCase()
    const title = form.title.trim()
    if (!slug || !title) {
      showToast("error", "Slug and title are required")
      return
    }
    setCreating(true)
    try {
      const created = await api.createContentPage({
        slug,
        title,
        description: form.description.trim() || undefined,
      })
      showToast("success", `Page created: ${created.slug}`)
      setForm({ slug: "", title: "", description: "" })
      await loadPages(true)
      setActivePageId(created.page_id)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create page")
    } finally {
      setCreating(false)
    }
  }

  const changeStatus = async (pageId: string, status: ContentPageStatus) => {
    if (status === "published") {
      const ok = window.confirm(
        "Publish this page now? This creates a revision snapshot and makes content visible on public routes.",
      )
      if (!ok) return
    }
    if (status === "archived") {
      const ok = window.confirm("Archive this page? It will no longer be served publicly.")
      if (!ok) return
    }
    try {
      await api.patchContentPageStatus(pageId, status)
      await loadPages(true)
      showToast("success", `Page moved to ${status}`)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update page status")
    }
  }

  const addStarterSection = async (pageId: string, sectionType: ContentSectionType) => {
    const ok = window.confirm(`Add a new ${sectionType.toUpperCase()} block to this page?`)
    if (!ok) return
    try {
      const nextPos = sectionCountByPage[pageId] || 0
      const created = await api.createContentSection(pageId, {
        section_key: `${sectionType}_${nextPos}`,
        section_type: sectionType,
        position: nextPos,
        is_visible: true,
        payload: {},
      })
      setLastCreatedSection({
        sectionId: created.section_id,
        pageId: created.page_id,
        sectionType,
      })
      showToast("success", `${sectionType} block added`)
      await loadPages(true)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to add section")
    }
  }

  const undoLastSectionAdd = async () => {
    if (!lastCreatedSection) return
    try {
      await api.deleteContentSection(lastCreatedSection.sectionId)
      showToast("success", `Undid add: ${lastCreatedSection.sectionType} block removed`)
      setLastCreatedSection(null)
      await loadPages(true)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to undo block add")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading Content Studio environment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 bg-[#0A0A0B] text-slate-100 min-h-full pb-12 selection:bg-emerald-500/30">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-8 md:p-10 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen CMS
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Content Studio
            </h1>
            <p className="mt-2 text-base text-slate-400 max-w-2xl font-light leading-relaxed">
              Design, structure, and publish professional landing pages and public routes using an intuitive, block-based architecture.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadPages(true)}
            disabled={refreshing}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl px-6 py-6 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-white/5"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-400" /> : <Clock className="mr-2 h-4 w-4 text-emerald-400" />}
            Sync Studio State
          </Button>
        </div>
      </section>

      {/* Undo Notification Banner */}
      {lastCreatedSection ? (
        <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 p-4 backdrop-blur-md shadow-lg shadow-emerald-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-200">
                Successfully appended <strong className="text-emerald-400 font-semibold uppercase">{lastCreatedSection.sectionType}</strong> block to{" "}
                <strong className="text-white font-semibold">{lastCreatedPage ? `/${lastCreatedPage.slug}` : "selected page"}</strong>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void undoLastSectionAdd()}
              className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg px-4 py-2 transition-all duration-200"
            >
              Undo Action
            </Button>
          </div>
        </section>
      ) : null}

      {/* KPI Dashboard */}
      <section className="grid gap-6 sm:grid-cols-3">
        <KpiCard label="Total Managed Pages" value={counts.total} icon={Layers} color="from-blue-500/20 to-blue-500/0" border="border-blue-500/20" text="text-blue-400" />
        <KpiCard label="Draft Revisions" value={counts.drafts} icon={FileText} color="from-amber-500/20 to-amber-500/0" border="border-amber-500/20" text="text-amber-400" />
        <KpiCard label="Live Published" value={counts.published} icon={Globe} color="from-emerald-500/20 to-emerald-500/0" border="border-emerald-500/20" text="text-emerald-400" />
      </section>

      {/* Create New Page Bento Box */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Create New Page Route</h2>
            <p className="text-xs text-slate-400">Initialize a new blank page structure with custom slug and metadata.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-12 items-center">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">URL Slug</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">/</span>
              <input
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 pl-7 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                placeholder="home, about, pricing"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Display Title</label>
            <input
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="e.g. Cyber Defense Landing Page"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Meta Description (Optional)</label>
            <input
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="SEO summary for search engines"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => void createPage()}
            disabled={creating}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
          >
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Initialize Page Route
          </Button>
        </div>
      </section>

      {/* Page Library Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Page Routes & Block Management</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a page to manage its content blocks, or open the visual detail editor for professional inline authoring.
            </p>
          </div>
        </div>

        {pages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-16 text-center backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mx-auto mb-4 text-slate-500">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No Pages Created</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Start by creating your first page route above (like `home`) to manage dynamic landing page content blocks.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const active = page.page_id === activePageId
              return (
                <article
                  key={page.page_id}
                  className={`group relative rounded-3xl border p-7 transition-all duration-500 backdrop-blur-xl flex flex-col justify-between ${
                    active
                      ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02] shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] shadow-xl"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-slate-300 border border-white/10">
                        <span className="text-emerald-400 font-bold">/</span>{page.slug}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
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

                    <button
                      className="w-full text-left group-hover:translate-x-1 transition-transform duration-300 focus:outline-none"
                      onClick={() => setActivePageId(page.page_id)}
                      type="button"
                    >
                      <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        {page.title}
                        {active && <span className="flex h-2 w-2 rounded-full bg-emerald-400" />}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400 font-light leading-relaxed min-h-[2.75rem]">
                        {page.description || "No meta description configured for this route."}
                      </p>
                    </button>

                    <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-4 text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>{sectionCountByPage[page.page_id] || 0} Content Blocks</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                    <Button
                      asChild
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl py-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.01] mb-2"
                    >
                      <Link href={`/admin/content/${encodeURIComponent(page.page_id)}`}>
                        <FileText className="mr-2 h-4 w-4" /> Open Professional Editor <ArrowRight className="ml-auto h-4 w-4" />
                      </Link>
                    </Button>

                    <div className="flex w-full items-center gap-2">
                      <select
                        className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                        value={quickSectionType}
                        onChange={(e) => setQuickSectionType(e.target.value as ContentSectionType)}
                      >
                        <option value="hero" className="bg-slate-900 text-white">Hero Block</option>
                        <option value="rich_text" className="bg-slate-900 text-white">Rich Text Block</option>
                        <option value="cta" className="bg-slate-900 text-white">CTA Block</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void addStarterSection(page.page_id, quickSectionType)}
                        className="h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 transition-all"
                      >
                        <Plus className="mr-1 h-4 w-4 text-emerald-400" /> Add Block
                      </Button>
                    </div>

                    <div className="flex w-full items-center justify-between gap-1 pt-2">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => void changeStatus(page.page_id, "draft")}
                        className="text-xs text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        Set Draft
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => void changeStatus(page.page_id, "published")}
                        className="text-xs text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        Publish Live
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => void changeStatus(page.page_id, "archived")}
                        className="text-xs text-slate-400 hover:text-zinc-400 hover:bg-zinc-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Activity Log */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Clock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Studio Audit Log & Activity</h2>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-slate-500 font-light italic py-4">No content modifications recorded in this session.</p>
        ) : (
          <div className="space-y-3">
            {activity.slice(0, 10).map((row) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  <span className="inline-flex rounded-lg bg-white/5 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-slate-400 border border-white/10">
                    {row.entity_type}
                  </span>
                  <span className="text-sm font-semibold text-white capitalize">
                    {row.action.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, border, text }: { label: string; value: number; icon: any; color: string; border: string; text: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b ${color} p-7 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/20 shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 ${text}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-4xl font-extrabold tracking-tight text-white">{value}</p>
    </div>
  )
}
