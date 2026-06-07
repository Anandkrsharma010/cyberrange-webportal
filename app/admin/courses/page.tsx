"use client"

import { useEffect, useState, useMemo } from "react"
import { api, type Course, type CourseResource, type CourseResourceType, type LabVisibility } from "@/lib/api"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpen,
  Loader2,
  Plus,
  Search,
  DollarSign,
  FileText,
  Layers,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  ExternalLink,
  Sparkles,
  Shield,
  Server,
  Clock,
  Tag,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderPlus,
  Globe,
  Lock,
  Unlock,
  FileCode,
  Beaker,
  Link2,
  FileKey,
  FileCheck,
  Terminal,
  Cpu,
  Coins,
  BookMarked
} from "lucide-react"

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const
const RESOURCE_TYPES: CourseResourceType[] = ["text", "link", "pdf", "file", "manual"]

const VISIBILITY_OPTIONS: { value: LabVisibility; label: string; hint: string }[] = [
  {
    value: "public",
    label: "Public",
    hint: "Listed on /labs catalog for everyone.",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Hidden from catalog; use direct links + normal access rules.",
  },
  {
    value: "private",
    label: "Private",
    hint: "Hidden from catalog; grant-based access comes in a later phase.",
  },
]

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [visibilityBusyId, setVisibilityBusyId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"pricing" | "catalog" | "resources">("pricing")

  // Pricing State
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceBusy, setPriceBusy] = useState(false)
  const [priceForm, setPriceForm] = useState({
    amount_major: "",
    currency: "INR",
    is_active: true,
  })

  // Resources State
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesBusy, setResourcesBusy] = useState(false)
  const [resources, setResources] = useState<CourseResource[]>([])
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [editResourceForm, setEditResourceForm] = useState({
    title: "",
    description: "",
    resource_type: "text" as CourseResourceType,
    url: "",
  })
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    resource_type: "text" as CourseResourceType,
    url: "",
  })

  // Create Course Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "",
    duration_minutes: "",
    lab_type: "",
    visibility: "public" as LabVisibility,
  })
  const [includedInput, setIncludedInput] = useState("")
  const [includedItems, setIncludedItems] = useState<string[]>([])
  const [includedEditIndex, setIncludedEditIndex] = useState<number | null>(null)
  const [catalogChipInput, setCatalogChipInput] = useState("")
  const [catalogChips, setCatalogChips] = useState<string[]>([])

  // Catalog Detail State
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogBusy, setCatalogBusy] = useState(false)
  const [catalogForm, setCatalogForm] = useState({
    description: "",
    difficulty: "",
    duration_minutes: "",
  })
  const [catalogChipsEdit, setCatalogChipsEdit] = useState<string[]>([])
  const [catalogChipEditInput, setCatalogChipEditInput] = useState("")

  const load = async () => {
    try {
      const res = await api.listCourses()
      setCourses(res.courses)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].content_id)
    }
  }, [courses, selectedCourseId])

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      difficulty: "",
      duration_minutes: "",
      lab_type: "",
      visibility: "public",
    })
    setIncludedInput("")
    setIncludedItems([])
    setIncludedEditIndex(null)
    setCatalogChipInput("")
    setCatalogChips([])
  }

  const handleCreate = async () => {
    if (!form.title || form.title.trim().length < 3) {
      showToast("error", "Title must be at least 3 characters")
      return
    }
    if (!form.lab_type.trim()) {
      showToast("error", "lab_type is required (must match a Terraform lab directory)")
      return
    }
    setBusy(true)
    try {
      const created = await api.createCourse({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        difficulty: form.difficulty || undefined,
        duration_minutes: form.duration_minutes
          ? Number(form.duration_minutes)
          : undefined,
        lab_type: form.lab_type.trim(),
        visibility: form.visibility,
        feature_chips: catalogChips.length > 0 ? catalogChips : undefined,
      })
      if (includedItems.length > 0) {
        for (let i = 0; i < includedItems.length; i += 1) {
          const title = includedItems[i]
          await api.createCourseResource(created.content_id, {
            title,
            resource_type: "manual",
            position: i,
            is_visible: true,
          })
        }
      }
      showToast("success", "Course created successfully")
      resetForm()
      setDialogOpen(false)
      await load()
      setSelectedCourseId(created.content_id)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create course")
    } finally {
      setBusy(false)
    }
  }

  const changeVisibility = async (contentId: string, visibility: LabVisibility) => {
    const current = courses.find((c) => c.content_id === contentId)?.visibility
    if (current === visibility) return
    setVisibilityBusyId(contentId)
    try {
      await api.patchCourseVisibility(contentId, visibility)
      showToast("success", "Visibility updated successfully")
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update visibility")
    } finally {
      setVisibilityBusyId(null)
    }
  }

  const upsertIncludedItem = () => {
    const value = includedInput.trim()
    if (!value) return
    if (includedEditIndex === null) {
      setIncludedItems((prev) => [...prev, value])
    } else {
      setIncludedItems((prev) => prev.map((item, idx) => (idx === includedEditIndex ? value : item)))
    }
    setIncludedInput("")
    setIncludedEditIndex(null)
  }

  const editIncludedItem = (index: number) => {
    setIncludedInput(includedItems[index] ?? "")
    setIncludedEditIndex(index)
  }

  const removeIncludedItem = (index: number) => {
    setIncludedItems((prev) => prev.filter((_, idx) => idx !== index))
    if (includedEditIndex === index) {
      setIncludedInput("")
      setIncludedEditIndex(null)
    }
  }

  const loadCourseResources = async (contentId: string) => {
    if (!contentId) {
      setResources([])
      return
    }
    setResourcesLoading(true)
    try {
      const res = await api.listCourseResources(contentId)
      setResources((res.resources || []).sort((a, b) => a.position - b.position))
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load course resources")
      setResources([])
    } finally {
      setResourcesLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCourseId) void loadCourseResources(selectedCourseId)
    setEditingResourceId(null)
  }, [selectedCourseId])

  const loadCoursePrice = async (contentId: string) => {
    if (!contentId) {
      setPriceForm({ amount_major: "", currency: "INR", is_active: true })
      return
    }
    setPriceLoading(true)
    try {
      const res = await api.getCoursePrice(contentId)
      if (!res.price) {
        setPriceForm({ amount_major: "", currency: "INR", is_active: true })
      } else {
        setPriceForm({
          amount_major: (res.price.amount_minor / 100).toFixed(2),
          currency: res.price.currency || "INR",
          is_active: !!res.price.is_active,
        })
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load course price")
      setPriceForm({ amount_major: "", currency: "INR", is_active: true })
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCourseId) void loadCoursePrice(selectedCourseId)
  }, [selectedCourseId])

  const loadCatalogDetail = async (contentId: string) => {
    if (!contentId) return
    setCatalogLoading(true)
    try {
      const detail = await api.getCourse(contentId)
      setCatalogForm({
        description: detail.description || "",
        difficulty: detail.difficulty || "",
        duration_minutes: detail.duration_minutes != null ? String(detail.duration_minutes) : "",
      })
      setCatalogChipsEdit(detail.feature_chips || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load catalog copy"
      showToast("error", msg)
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCourseId) void loadCatalogDetail(selectedCourseId)
  }, [selectedCourseId])

  const saveCatalogDetail = async () => {
    if (!selectedCourseId) return
    setCatalogBusy(true)
    try {
      await api.patchCourseContent(selectedCourseId, {
        description: catalogForm.description.trim() || undefined,
        difficulty: catalogForm.difficulty || undefined,
        duration_minutes: catalogForm.duration_minutes ? Number(catalogForm.duration_minutes) : undefined,
        feature_chips: catalogChipsEdit,
      })
      showToast("success", "Public catalog copy saved successfully")
      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save catalog copy"
      showToast("error", msg)
    } finally {
      setCatalogBusy(false)
    }
  }

  const addCatalogChipEdit = () => {
    const v = catalogChipEditInput.trim()
    if (!v) return
    setCatalogChipsEdit((prev) => [...prev, v])
    setCatalogChipEditInput("")
  }

  const createResource = async () => {
    if (!selectedCourseId) return
    if (!resourceForm.title.trim()) {
      showToast("error", "Resource title is required")
      return
    }
    setResourcesBusy(true)
    try {
      await api.createCourseResource(selectedCourseId, {
        title: resourceForm.title.trim(),
        description: resourceForm.description.trim() || undefined,
        resource_type: resourceForm.resource_type,
        url: resourceForm.url.trim() || undefined,
        position: resources.length,
        is_visible: true,
      })
      showToast("success", "Study material added successfully")
      setResourceForm({ title: "", description: "", resource_type: "text", url: "" })
      await loadCourseResources(selectedCourseId)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to add resource")
    } finally {
      setResourcesBusy(false)
    }
  }

  const moveResource = async (resourceId: string, delta: -1 | 1) => {
    if (!selectedCourseId) return
    const sorted = [...resources].sort((a, b) => a.position - b.position)
    const index = sorted.findIndex((r) => r.resource_id === resourceId)
    const next = index + delta
    if (index < 0 || next < 0 || next >= sorted.length) return
    const current = sorted[index]
    const target = sorted[next]
    setResourcesBusy(true)
    try {
      await api.patchCourseResource(selectedCourseId, current.resource_id, { position: target.position })
      await api.patchCourseResource(selectedCourseId, target.resource_id, { position: current.position })
      await loadCourseResources(selectedCourseId)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reorder resource")
    } finally {
      setResourcesBusy(false)
    }
  }

  const toggleResourceVisibility = async (resourceId: string, nextVisible: boolean) => {
    if (!selectedCourseId) return
    setResourcesBusy(true)
    try {
      await api.patchCourseResource(selectedCourseId, resourceId, { is_visible: nextVisible })
      await loadCourseResources(selectedCourseId)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update resource visibility")
    } finally {
      setResourcesBusy(false)
    }
  }

  const deleteResource = async (resourceId: string) => {
    if (!selectedCourseId) return
    const ok = window.confirm("Permanently delete this study material?")
    if (!ok) return
    setResourcesBusy(true)
    try {
      await api.deleteCourseResource(selectedCourseId, resourceId)
      showToast("success", "Study material removed")
      await loadCourseResources(selectedCourseId)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete resource")
    } finally {
      setResourcesBusy(false)
    }
  }

  const beginResourceEdit = (resource: CourseResource) => {
    setEditingResourceId(resource.resource_id)
    setEditResourceForm({
      title: resource.title ?? "",
      description: resource.description ?? "",
      resource_type: resource.resource_type,
      url: resource.url ?? "",
    })
  }

  const cancelResourceEdit = () => {
    setEditingResourceId(null)
    setEditResourceForm({
      title: "",
      description: "",
      resource_type: "text",
      url: "",
    })
  }

  const saveResourceEdit = async () => {
    if (!selectedCourseId || !editingResourceId) return
    if (!editResourceForm.title.trim()) {
      showToast("error", "Resource title is required")
      return
    }
    setResourcesBusy(true)
    try {
      await api.patchCourseResource(selectedCourseId, editingResourceId, {
        title: editResourceForm.title.trim(),
        description: editResourceForm.description.trim() || undefined,
        resource_type: editResourceForm.resource_type,
        url: editResourceForm.url.trim() || undefined,
      })
      showToast("success", "Study material updated successfully")
      cancelResourceEdit()
      await loadCourseResources(selectedCourseId)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update resource")
    } finally {
      setResourcesBusy(false)
    }
  }

  const saveCoursePrice = async () => {
    if (!selectedCourseId) return
    const parsed = Number(priceForm.amount_major)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("error", "Price must be greater than 0")
      return
    }
    const amount_minor = Math.round(parsed * 100)
    setPriceBusy(true)
    try {
      await api.upsertCoursePrice(selectedCourseId, {
        amount_minor,
        currency: (priceForm.currency || "INR").toUpperCase(),
        is_active: priceForm.is_active,
      })
      showToast("success", "Course pricing updated successfully")
      await Promise.all([loadCoursePrice(selectedCourseId), load()])
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update course pricing")
    } finally {
      setPriceBusy(false)
    }
  }

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = searchQuery.toLowerCase()
      return (c.title?.toLowerCase() || "").includes(q) || (c.lab_type?.toLowerCase() || "").includes(q)
    })
  }, [courses, searchQuery])

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.content_id === selectedCourseId) || null
  }, [courses, selectedCourseId])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading premium Course & Lab Management suite...</p>
        </div>
      </div>
    )
  }

  const activeCount = courses.filter((c) => c.is_active).length
  const inactiveCount = courses.length - activeCount

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30 space-y-8 pb-16">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl m-6 mb-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Terminal className="w-3.5 h-3.5" /> Terraform Lab Mapping
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Enterprise RangeOps</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Course & Lab Management</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light">
              Courses are <code className="text-emerald-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">content_items</code> of type <code className="text-emerald-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">lab</code> mapped directly to Terraform provisioning directories via <code className="text-emerald-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">lab_type</code>. Manage pricing, public catalog copy, and student study materials below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Stat Badges */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-md shadow-lg w-full sm:w-auto justify-around sm:justify-start">
              <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total Labs</p>
                <p className="text-xl font-extrabold text-white flex items-center justify-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> {courses.length}
                </p>
              </div>
              <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Active</p>
                <p className="text-xl font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {activeCount}
                </p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Inactive</p>
                <p className="text-xl font-extrabold text-zinc-400 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-zinc-500" /> {inactiveCount}
                </p>
              </div>
            </div>

            {/* Create Course Modal Trigger */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl px-6 py-7 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]">
                  <Plus className="mr-2 h-5 w-5" /> Create New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl bg-[#0E0E10] border border-white/10 text-slate-100 rounded-3xl shadow-2xl p-8 backdrop-blur-2xl">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-400" /> Create Course & Terraform Lab
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs font-light">
                    Configure core catalog details and map the environment to your automated Terraform infrastructure setup.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Section 1: Core Info */}
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                      <BookMarked className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">1. Core Information</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs font-medium text-slate-300">Course Title <span className="text-emerald-400">*</span></Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Advanced Active Directory Exploitation"
                        className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs font-medium text-slate-300">Short Summary</Label>
                      <Textarea
                        id="description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        placeholder="Brief overview of what learners will experience and master in this environment..."
                        className="rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-light leading-relaxed"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-300">Difficulty Level</Label>
                        <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                          <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                            {DIFFICULTIES.map((d) => (
                              <SelectItem key={d} value={d} className="focus:bg-white/10 focus:text-white">
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-xs font-medium text-slate-300">Estimated Duration (Minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min={0}
                          value={form.duration_minutes}
                          onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                          placeholder="e.g. 240 (4 hours)"
                          className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Feature Chips */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <Label className="text-xs font-medium text-slate-300">Catalog Feature Chips (Optional)</Label>
                      <p className="text-[10px] text-slate-400 font-light">Displayed as highlighted spec badges on the public catalog.</p>
                      <div className="flex gap-2">
                        <Input
                          value={catalogChipInput}
                          onChange={(e) => setCatalogChipInput(e.target.value)}
                          placeholder="e.g. Windows Server 2022 DC"
                          className="h-10 rounded-lg border-white/10 bg-white/5 text-xs text-white"
                        />
                        <Button
                          type="button" variant="outline" size="sm"
                          disabled={!catalogChipInput.trim()}
                          onClick={() => {
                            const v = catalogChipInput.trim()
                            if (!v) return
                            setCatalogChips((p) => [...p, v])
                            setCatalogChipInput("")
                          }}
                          className="h-10 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs font-bold px-4"
                        >
                          Add Chip
                        </Button>
                      </div>
                      {catalogChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {catalogChips.map((chip, idx) => (
                            <Badge key={idx} className="bg-white/5 border border-white/10 text-emerald-300 text-xs py-1 px-2.5 rounded-lg flex items-center gap-1.5 font-medium">
                              {chip}
                              <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setCatalogChips((p) => p.filter((_, i) => i !== idx))} />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Study Materials */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <Label className="text-xs font-medium text-slate-300">Included Study Materials (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={includedInput}
                          onChange={(e) => setIncludedInput(e.target.value)}
                          placeholder="e.g. 5-machine AD attack/defense lab manual"
                          className="h-10 rounded-lg border-white/10 bg-white/5 text-xs text-white"
                        />
                        <Button
                          type="button" variant="outline" size="sm"
                          onClick={upsertIncludedItem} disabled={!includedInput.trim()}
                          className="h-10 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs font-bold px-4"
                        >
                          {includedEditIndex === null ? "Add" : "Update"}
                        </Button>
                        {includedEditIndex !== null && (
                          <Button
                            type="button" variant="ghost" size="sm"
                            onClick={() => { setIncludedInput(""); setIncludedEditIndex(null); }}
                            className="h-10 rounded-lg text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      {includedItems.length > 0 && (
                        <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-3 mt-2">
                          {includedItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/5">
                              <span className="text-xs text-white font-medium">{item}</span>
                              <div className="flex items-center gap-1">
                                <Button type="button" size="sm" variant="ghost" onClick={() => editIncludedItem(idx)} className="h-7 px-2.5 text-[10px] text-slate-300 hover:text-white rounded-md">
                                  Edit
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeIncludedItem(idx)} className="h-7 px-2.5 text-[10px] text-red-400 hover:bg-red-500/20 rounded-md">
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Lab Setup */}
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">2. Infrastructure & Provisioning Mapping</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lab_type" className="text-xs font-medium text-slate-300">Lab Environment Key <span className="text-emerald-400">*</span></Label>
                      <Input
                        id="lab_type"
                        value={form.lab_type}
                        onChange={(e) => setForm({ ...form, lab_type: e.target.value })}
                        placeholder="e.g. windows, linux, k8s, aws"
                        className="h-11 rounded-xl border-white/10 bg-white/5 font-mono text-sm text-emerald-300 focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400 font-light">
                        CRITICAL: This exact string must match a Terraform lab directory name in the backend infrastructure repository.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <Label className="text-xs font-medium text-slate-300">Catalog Visibility</Label>
                      <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as LabVisibility })}>
                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                          {VISIBILITY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="focus:bg-white/10 focus:text-white">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-400 font-light italic">
                        {VISIBILITY_OPTIONS.find((o) => o.value === form.visibility)?.hint}
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-white/10">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy} className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={busy} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Course & Provision Lab
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Main Master-Detail Workspace Grid */}
      <div className="px-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (col-span-5): Course Catalog Directory */}
        <section className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" /> Lab Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select any lab environment below to configure its parameters.</p>
            </div>

            <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs px-3 py-1 rounded-full font-bold font-mono">
              {filteredCourses.length} Listed
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search labs by title or terraform key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-xl shadow-lg transition-all font-medium"
            />
            {searchQuery && (
              <X className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchQuery("")} />
            )}
          </div>

          {/* Scrollable Course Cards List */}
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2">
            {filteredCourses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center backdrop-blur-sm">
                <FolderPlus className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                <h3 className="text-base font-semibold text-white mb-1">No Labs Found</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                  {searchQuery ? "No courses match your search criteria." : "Your catalog is empty. Click 'Create New Course' above to provision your first lab."}
                </p>
                {searchQuery && (
                  <Button size="sm" variant="outline" onClick={() => setSearchQuery("")} className="border-white/10 bg-white/5 text-white">
                    Clear Search Filter
                  </Button>
                )}
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = c.content_id === selectedCourseId
                return (
                  <div
                    key={c.content_id}
                    onClick={() => setSelectedCourseId(c.content_id)}
                    className={`group relative rounded-3xl border p-6 transition-all duration-300 cursor-pointer backdrop-blur-xl shadow-lg overflow-hidden ${
                      isSelected
                        ? "border-emerald-500 bg-gradient-to-r from-emerald-500/10 via-white/[0.04] to-white/[0.02] shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between gap-4 mb-3 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-emerald-400 font-bold border border-white/10 uppercase tracking-wider">
                            <Terminal className="w-3 h-3" /> {c.lab_type}
                          </span>
                          {c.difficulty && (
                            <Badge className="bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold px-2 py-0.5">
                              {c.difficulty}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                          {c.title}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <Badge className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border shrink-0 ${
                        c.is_active
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                          : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"
                      }`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {c.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-light leading-relaxed relative z-10">
                        {c.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-slate-400 relative z-10">
                      <div className="flex items-center gap-4 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {c.duration_minutes ? `${c.duration_minutes} mins` : "N/A"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500" /> {c.visibility?.toUpperCase() || "PUBLIC"}
                        </span>
                      </div>

                      {/* Quick Visibility Dropdown */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={c.visibility ?? "public"}
                          disabled={visibilityBusyId === c.content_id}
                          onValueChange={(v) => void changeVisibility(c.content_id, v as LabVisibility)}
                        >
                          <SelectTrigger className="h-8 w-28 rounded-xl border-white/10 bg-white/5 text-[10px] font-bold text-slate-300 focus:border-emerald-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl text-xs">
                            {VISIBILITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="focus:bg-white/10 focus:text-white text-xs">
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Right Column (col-span-7): Dedicated Course Management Suite */}
        <section className="lg:col-span-7 space-y-6">
          {!selectedCourse ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-16 text-center backdrop-blur-xl shadow-2xl">
              <BookOpen className="mx-auto h-12 w-12 text-slate-500 mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-white mb-2">No Lab Selected</h3>
              <p className="text-slate-400 max-w-md mx-auto text-sm font-light leading-relaxed">
                Choose a course from the directory on the left to configure its checkout pricing, promotional catalog copy, and student study materials.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-500">
              {/* Selected Course Header */}
              <div className="border-b border-white/10 bg-white/[0.02] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-wrap items-start justify-between gap-4 relative z-10 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs px-3 py-1 font-bold uppercase tracking-wider shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                        <Terminal className="w-3.5 h-3.5 mr-1.5" /> {selectedCourse.lab_type}
                      </Badge>
                      <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs px-3 py-1 font-semibold uppercase tracking-wider">
                        {selectedCourse.visibility}
                      </Badge>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{selectedCourse.title}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                      <span className="text-slate-500">ID:</span> {selectedCourse.content_id}
                    </p>
                  </div>

                  <Badge className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl border ${
                    selectedCourse.is_active
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                      : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"
                  }`}>
                    {selectedCourse.is_active ? "Status: Active" : "Status: Inactive"}
                  </Badge>
                </div>

                {/* Management Navigation Tabs */}
                <div className="flex border-b border-white/10 gap-2 mt-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("pricing")}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
                      activeTab === "pricing"
                        ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                        : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <Coins className="w-4 h-4" /> Pricing & Access
                  </button>
                  <button
                    onClick={() => setActiveTab("catalog")}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
                      activeTab === "catalog"
                        ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                        : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Public Catalog Copy
                  </button>
                  <button
                    onClick={() => setActiveTab("resources")}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-2xl transition-all border-b-2 whitespace-nowrap ${
                      activeTab === "resources"
                        ? "border-emerald-500 bg-white/[0.04] text-emerald-400 shadow-[0_-10px_20px_-10px_rgba(16,185,129,0.1)]"
                        : "border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <BookMarked className="w-4 h-4" /> Study Materials ({resources.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Pricing & Access */}
              {activeTab === "pricing" ? (
                <div className="p-8 space-y-6">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Checkout & Payment Gateway Configuration</h4>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        Pricing configured here serves as the single source of truth for the Razorpay checkout flow. If set to inactive or left blank, the course is automatically listed as "Coming Soon" on the public catalog.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Price Amount (Major)</Label>
                      <Input
                        placeholder="e.g. 4999.00"
                        value={priceForm.amount_major}
                        onChange={(e) => setPriceForm((p) => ({ ...p, amount_major: e.target.value }))}
                        disabled={priceLoading || priceBusy}
                        className="h-12 rounded-xl border-white/10 bg-white/5 text-sm font-bold text-white focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Currency Code</Label>
                      <Input
                        placeholder="INR"
                        value={priceForm.currency}
                        maxLength={3}
                        onChange={(e) => setPriceForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                        disabled={priceLoading || priceBusy}
                        className="h-12 rounded-xl border-white/10 bg-white/5 font-mono text-sm font-bold text-white focus:border-emerald-500 uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Checkout Status</Label>
                      <Select
                        value={priceForm.is_active ? "active" : "inactive"}
                        onValueChange={(v) => setPriceForm((p) => ({ ...p, is_active: v === "active" }))}
                        disabled={priceLoading || priceBusy}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-sm font-bold text-white focus:border-emerald-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="active" className="text-emerald-400 font-bold focus:bg-white/10 focus:text-emerald-300">Active (Purchasable)</SelectItem>
                          <SelectItem value="inactive" className="text-zinc-400 font-bold focus:bg-white/10 focus:text-zinc-300">Inactive (Coming Soon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-white/10">
                    <Button
                      onClick={() => void saveCoursePrice()}
                      disabled={priceLoading || priceBusy}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
                    >
                      {priceBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Pricing Configuration
                    </Button>
                  </div>
                </div>
              ) : activeTab === "catalog" ? (
                <div className="p-8 space-y-6">
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                    <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Public Catalog Promotional Copy</h4>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        Displayed on the public <code className="text-emerald-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">/labs</code> catalog page for students exploring curriculum details and purchasing access.
                      </p>
                    </div>
                  </div>

                  {catalogLoading ? (
                    <div className="flex items-center gap-3 text-sm text-slate-400 py-12 justify-center font-medium">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" /> Loading promotional catalog copy...
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Full Promotional Description</Label>
                        <Textarea
                          placeholder="Comprehensive description for the 'Show More' expanded view on the catalog..."
                          value={catalogForm.description}
                          onChange={(e) => setCatalogForm((p) => ({ ...p, description: e.target.value }))}
                          rows={5}
                          disabled={catalogBusy}
                          className="rounded-xl border-white/10 bg-white/5 p-4 text-sm text-white focus:border-emerald-500 font-light leading-relaxed"
                        />
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Difficulty Level</Label>
                          <Select
                            value={catalogForm.difficulty}
                            onValueChange={(v) => setCatalogForm((p) => ({ ...p, difficulty: v }))}
                            disabled={catalogBusy}
                          >
                            <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-semibold">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                              {DIFFICULTIES.map((d) => (
                                <SelectItem key={d} value={d} className="focus:bg-white/10 focus:text-white font-medium">
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Duration (Minutes)</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 360"
                            value={catalogForm.duration_minutes}
                            onChange={(e) => setCatalogForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                            disabled={catalogBusy}
                            className="h-12 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Feature Chips Edit */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Environment Feature Chips</Label>
                        <p className="text-xs text-slate-400 font-light">Highlight key technologies, tools, or target OS versions.</p>
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. Domain Controller (Windows Server 2022)"
                            value={catalogChipEditInput}
                            onChange={(e) => setCatalogChipEditInput(e.target.value)}
                            disabled={catalogBusy}
                            className="h-12 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
                          />
                          <Button
                            type="button" variant="outline"
                            onClick={addCatalogChipEdit}
                            disabled={!catalogChipEditInput.trim() || catalogBusy}
                            className="h-12 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold px-6"
                          >
                            Add Chip
                          </Button>
                        </div>

                        {catalogChipsEdit.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {catalogChipsEdit.map((chip, idx) => (
                              <Badge key={idx} className="bg-white/5 border border-white/10 text-emerald-300 text-xs py-1.5 px-3 rounded-xl flex items-center gap-2 font-medium shadow">
                                {chip}
                                <X className="w-4 h-4 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setCatalogChipsEdit((prev) => prev.filter((_, i) => i !== idx))} />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-6 border-t border-white/10">
                        <Button
                          onClick={() => void saveCatalogDetail()}
                          disabled={catalogBusy}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
                        >
                          {catalogBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save Catalog Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 space-y-8">
                  {/* Add Material Form */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-400" /> Add New Study Material
                      </h3>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 font-bold uppercase">
                        Resource Manager
                      </Badge>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Material Title <span className="text-emerald-400">*</span></Label>
                        <Input
                          placeholder="e.g. Lab Manual & Walkthrough"
                          value={resourceForm.title}
                          onChange={(e) => setResourceForm((p) => ({ ...p, title: e.target.value }))}
                          className="h-12 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Resource Type</Label>
                        <Select
                          value={resourceForm.resource_type}
                          onValueChange={(v) => setResourceForm((p) => ({ ...p, resource_type: v as CourseResourceType }))}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-semibold uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                            {RESOURCE_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-white font-medium uppercase">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Destination URL / Link</Label>
                        <Input
                          placeholder="e.g. https://docs.cyberrange.dev/ad"
                          value={resourceForm.url}
                          onChange={(e) => setResourceForm((p) => ({ ...p, url: e.target.value }))}
                          className="h-12 rounded-xl border-white/10 bg-white/5 font-mono text-sm text-emerald-300 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Supporting Description (Optional)</Label>
                      <Textarea
                        placeholder="Provide helpful context or instructions for accessing this material..."
                        value={resourceForm.description}
                        onChange={(e) => setResourceForm((p) => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="rounded-xl border-white/10 bg-white/5 p-4 text-sm text-white focus:border-emerald-500 font-light leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                      <Button
                        onClick={() => void createResource()}
                        disabled={resourcesBusy}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8 py-6 text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
                      >
                        {resourcesBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Study Material
                      </Button>
                    </div>
                  </div>

                  {/* Existing Resources List */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <BookMarked className="w-5 h-5 text-emerald-400" /> Active Course Materials ({resources.length})
                    </h3>

                    {resourcesLoading ? (
                      <div className="flex items-center gap-3 text-sm text-slate-400 py-8 justify-center font-medium">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" /> Loading course study materials...
                      </div>
                    ) : resources.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
                        <FileText className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                        <p className="text-sm font-semibold text-white mb-1">No Study Materials Configured</p>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          Add manuals, walkthroughs, or external documentation links using the form above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...resources].sort((a, b) => a.position - b.position).map((r, i, arr) => (
                          <div key={r.resource_id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md shadow-lg hover:border-white/20 transition-all">
                            {editingResourceId === r.resource_id ? (
                              <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                  <Input
                                    placeholder="Resource title"
                                    value={editResourceForm.title}
                                    onChange={(e) => setEditResourceForm((p) => ({ ...p, title: e.target.value }))}
                                    disabled={resourcesBusy}
                                    className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
                                  />
                                  <Select
                                    value={editResourceForm.resource_type}
                                    onValueChange={(v) => setEditResourceForm((p) => ({ ...p, resource_type: v as CourseResourceType }))}
                                  >
                                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 uppercase font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                                      {RESOURCE_TYPES.map((t) => (
                                        <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-white uppercase font-medium">
                                          {t}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="URL (optional)"
                                    value={editResourceForm.url}
                                    onChange={(e) => setEditResourceForm((p) => ({ ...p, url: e.target.value }))}
                                    disabled={resourcesBusy}
                                    className="h-11 rounded-xl border-white/10 bg-white/5 font-mono text-sm text-emerald-300 focus:border-emerald-500"
                                  />
                                </div>
                                <Textarea
                                  placeholder="Description (optional)"
                                  rows={2}
                                  value={editResourceForm.description}
                                  onChange={(e) => setEditResourceForm((p) => ({ ...p, description: e.target.value }))}
                                  disabled={resourcesBusy}
                                  className="rounded-xl border-white/10 bg-white/5 p-3 text-sm text-white focus:border-emerald-500 font-light"
                                />
                                <div className="flex flex-wrap justify-end gap-2 pt-2">
                                  <Button variant="outline" size="sm" disabled={resourcesBusy} onClick={cancelResourceEdit} className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-5">
                                    Cancel
                                  </Button>
                                  <Button size="sm" disabled={resourcesBusy} onClick={() => void saveResourceEdit()} className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 shadow-lg shadow-emerald-500/20">
                                    Save Changes
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3.5 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400 shadow-inner">
                                    {r.resource_type === "pdf" ? <FileText className="w-5 h-5" /> : r.resource_type === "link" ? <Link2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-emerald-400 font-bold border border-white/10 uppercase tracking-wider">
                                        {r.resource_type}
                                      </span>
                                      <Badge className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                                        r.is_visible ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                      }`}>
                                        {r.is_visible ? "Visible" : "Hidden"}
                                      </Badge>
                                      <span className="text-[10px] text-slate-500 font-mono">Pos: #{r.position + 1}</span>
                                    </div>
                                    <p className="text-base font-bold text-white tracking-tight truncate">{r.title}</p>
                                    {r.description && <p className="text-xs text-slate-400 mt-1 font-light line-clamp-1">{r.description}</p>}
                                    {r.url && <p className="text-xs font-mono text-emerald-300/80 mt-1 truncate">{r.url}</p>}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 self-end sm:self-center">
                                  <Button variant="ghost" size="sm" disabled={resourcesBusy} onClick={() => beginResourceEdit(r)} className="h-8 px-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-xs font-semibold">
                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
                                  </Button>

                                  <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

                                  <Button variant="ghost" size="sm" disabled={resourcesBusy || i === 0} onClick={() => void moveResource(r.resource_id, -1)} className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 rounded-lg">
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" disabled={resourcesBusy || i === arr.length - 1} onClick={() => void moveResource(r.resource_id, 1)} className="h-8 w-8 p-0 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 rounded-lg">
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>

                                  <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

                                  <Button variant="ghost" size="sm" disabled={resourcesBusy} onClick={() => void toggleResourceVisibility(r.resource_id, !r.is_visible)} className="h-8 px-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-xs font-semibold">
                                    {r.is_visible ? <EyeOff className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />}
                                    {r.is_visible ? "Hide" : "Show"}
                                  </Button>

                                  <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

                                  <Button variant="ghost" size="sm" disabled={resourcesBusy} onClick={() => void deleteResource(r.resource_id)} className="h-8 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg text-xs font-semibold transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-400 font-light">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tip: Assign dedicated course administrators and configure per-admin guardrails on the Course Admins dashboard.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
