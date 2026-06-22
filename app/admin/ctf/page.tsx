"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Activity,
  Award,
  Layers,
  Settings,
  HelpCircle,
  Eye,
  RotateCcw,
  Sparkles
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/toast"
import { cn } from "@/lib/utils"

// Types
interface CTFChallenge {
  id: string
  title: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  scenario: string
  instructions: string
  hints: string[]
  flag: string
  solutionText?: string
}

interface CTFLab {
  id: string
  title: string
  description: string
  difficulty: string
  durationLabel: string
  challenges: CTFChallenge[]
}

interface AuditLog {
  timestamp: string
  operator: string
  labTitle: string
  challengeTitle: string
  attemptedFlag: string
  status: "Correct" | "Incorrect"
}

export default function AdminCTFControl() {
  const [labs, setLabs] = useState<CTFLab[]>([])
  const [selectedLabId, setSelectedLabId] = useState<string>("active-directory")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal states
  const [isEditing, setIsEditing] = useState(false)
  const [currentChallenge, setCurrentChallenge] = useState<Partial<CTFChallenge> & { labId?: string }>({})
  const [isCreatingLab, setIsCreatingLab] = useState(false)
  const [newLabData, setNewLabData] = useState<Partial<CTFLab>>({
    id: "",
    title: "",
    description: "",
    difficulty: "Medium",
    durationLabel: "4 Hours"
  })

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  // Default CTF Labs list data structure
  const defaultLabs: CTFLab[] = [
    {
      id: "active-directory",
      title: "Active Directory CyberRange",
      description: "Multi-forest AD environment designed for practicing initial access, privilege escalation, and lateral movement.",
      difficulty: "Medium",
      durationLabel: "4 Hours",
      challenges: [
        {
          id: "ad-1",
          title: "Reconnaissance & Initial Entry",
          points: 100,
          difficulty: "Easy",
          category: "Recon / Access",
          scenario: "You are connected to the internal LAN via VPN. Your first step is to scan the domain subnet, discover active hosts, and find an entry vector on the user workstation (WS01).",
          instructions: "Perform an Nmap scan on the workstation IP `10.10.10.50`. Locate the open HTTP service and find the developers secret token in the webpage metadata or source notes.\n\nFlag format: flag{secret_string}",
          hints: ["Check port 80/http on 10.10.10.50.", "Inspect the HTML comments in the developer staging page index source."],
          flag: "flag{cstar_ad_phish_access}",
          solutionText: "Use `nmap -sS -p80 10.10.10.50` to find the running web page. View-source:http://10.10.10.50/ and check the bottom comment block."
        },
        {
          id: "ad-2",
          title: "Local Privilege Escalation",
          points: 150,
          difficulty: "Medium",
          category: "PrivEsc",
          scenario: "You have compromised a low-privilege user session (`j.doe`) on the workstation `10.10.10.50`. You need to escalate privileges to local Administrator.",
          instructions: "Enumerate the system for misconfigurations. Check scheduled tasks. A poorly configured scheduled task executes a backup binary with high privileges. Replace the binary or hijack the execution path to retrieve the flag located in `C:\\Users\\Administrator\\Desktop\\flag.txt`.",
          hints: ["Run `schtasks /query /fo LIST /v` to inspect scheduled tasks.", "Check the folder write permissions on the BackupAgent executable path."],
          flag: "flag{cstar_ad_local_admin}",
          solutionText: "Run winPEAS or query scheduled tasks. Note that C:\\Program Files\\BackupAgent\\backup.exe is writeable by Authenticated Users. Overwrite it with a shell payload."
        }
      ]
    },
    {
      id: "crapi",
      title: "crAPI Web API Security Arena",
      description: "OWASP API Top 10 training environment focusing on vehicle portals, token exploits, mass assignment, and SSRF vulnerabilities.",
      difficulty: "Medium",
      durationLabel: "3 Hours",
      challenges: [
        {
          id: "crapi-1",
          title: "Broken Object Level Authorization (BOLA)",
          points: 100,
          difficulty: "Easy",
          category: "BOLA",
          scenario: "The crAPI application lets users view their own vehicle location coordinates. The REST endpoint checks coordinates based on vehicle ID UUIDs.",
          instructions: "Log in with your learner account and view your dashboard network calls. Identify the API endpoint `/identity/api/v1/vehicles/{id}/location`. Modify the request UUID to match another vehicle to leak coordinates and find the validation key flag.",
          hints: ["Check the Community forum posts. User profiles disclose vehicle UUID values in public payloads.", "Swap your vehicle ID in the Location request in Burp Suite or developer tools."],
          flag: "flag{cstar_crapi_bola_uuid}",
          solutionText: "Retrieve vehicle ID from public community posts, then GET /identity/api/v1/vehicles/OTHER_VEHICLE_UUID/location to extract coordinates containing flag."
        }
      ]
    }
  ]

  // Default simulated audit logs
  const defaultAuditLogs: AuditLog[] = [
    { timestamp: "2026-06-22 09:30:15", operator: "j.doe@academy.io", labTitle: "Active Directory CyberRange", challengeTitle: "Reconnaissance & Initial Entry", attemptedFlag: "flag{cstar_ad_phish_access}", status: "Correct" },
    { timestamp: "2026-06-22 09:28:44", operator: "guest_user@cystar.io", labTitle: "crAPI Web API Security Arena", challengeTitle: "Broken Object Level Authorization (BOLA)", attemptedFlag: "flag{bola_bypass_123}", status: "Incorrect" },
    { timestamp: "2026-06-22 09:25:12", operator: "admin_tester@cyberrange.in", labTitle: "Active Directory CyberRange", challengeTitle: "Local Privilege Escalation", attemptedFlag: "flag{cstar_ad_local_admin}", status: "Correct" }
  ]

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLabs = localStorage.getItem("admin_ctf_labs")
      const storedLogs = localStorage.getItem("admin_ctf_logs")

      if (storedLabs) {
        try {
          setLabs(JSON.parse(storedLabs))
        } catch {
          setLabs(defaultLabs)
        }
      } else {
        setLabs(defaultLabs)
        localStorage.setItem("admin_ctf_labs", JSON.stringify(defaultLabs))
      }

      if (storedLogs) {
        try {
          setAuditLogs(JSON.parse(storedLogs))
        } catch {
          setAuditLogs(defaultAuditLogs)
        }
      } else {
        setAuditLogs(defaultAuditLogs)
        localStorage.setItem("admin_ctf_logs", JSON.stringify(defaultAuditLogs))
      }
    }
  }, [])

  // Sync state helpers
  const saveLabsToStorage = (updatedLabs: CTFLab[]) => {
    setLabs(updatedLabs)
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_ctf_labs", JSON.stringify(updatedLabs))
    }
  }

  const saveLogsToStorage = (updatedLogs: AuditLog[]) => {
    setAuditLogs(updatedLogs)
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_ctf_logs", JSON.stringify(updatedLogs))
    }
  }

  // Create Lab Scenario Handler
  const handleCreateLab = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabData.id || !newLabData.title) {
      showToast("error", "Lab ID and Title are required.")
      return
    }

    const updated = [
      ...labs,
      {
        id: newLabData.id,
        title: newLabData.title,
        description: newLabData.description || "",
        difficulty: newLabData.difficulty || "Medium",
        durationLabel: newLabData.durationLabel || "4 Hours",
        challenges: []
      }
    ]

    saveLabsToStorage(updated)
    setNewLabData({ id: "", title: "", description: "", difficulty: "Medium", durationLabel: "4 Hours" })
    setIsCreatingLab(false)
    showToast("success", "CTF Lab Scenario successfully created.")
  }

  // Add / Edit Challenge Handler
  const handleSaveChallenge = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChallenge.title || !currentChallenge.flag || currentChallenge.points === undefined) {
      showToast("error", "Title, Points, and Flag are required.")
      return
    }

    const targetLabId = currentChallenge.labId || selectedLabId
    const updated = labs.map((lab) => {
      if (lab.id !== targetLabId) return lab

      const chalList = [...lab.challenges]
      if (currentChallenge.id) {
        // Edit existing
        const idx = chalList.findIndex(c => c.id === currentChallenge.id)
        if (idx !== -1) {
          chalList[idx] = {
            id: currentChallenge.id,
            title: currentChallenge.title || "",
            points: Number(currentChallenge.points) || 0,
            difficulty: currentChallenge.difficulty || "Medium",
            category: currentChallenge.category || "General",
            scenario: currentChallenge.scenario || "",
            instructions: currentChallenge.instructions || "",
            hints: currentChallenge.hints || [],
            flag: currentChallenge.flag || "",
            solutionText: currentChallenge.solutionText || ""
          }
        }
      } else {
        // Create new
        const newId = `${lab.id}-${Date.now()}`
        chalList.push({
          id: newId,
          title: currentChallenge.title || "",
          points: Number(currentChallenge.points) || 0,
          difficulty: currentChallenge.difficulty || "Medium",
          category: currentChallenge.category || "General",
          scenario: currentChallenge.scenario || "",
          instructions: currentChallenge.instructions || "",
          hints: currentChallenge.hints || [],
          flag: currentChallenge.flag || "",
          solutionText: currentChallenge.solutionText || ""
        })
      }
      return { ...lab, challenges: chalList }
    })

    saveLabsToStorage(updated)
    setIsEditing(false)
    setCurrentChallenge({})
    showToast("success", "Challenge settings successfully saved.")
  }

  // Delete Challenge Handler
  const handleDeleteChallenge = (labId: string, challengeId: string) => {
    const updated = labs.map((lab) => {
      if (lab.id !== labId) return lab
      return {
        ...lab,
        challenges: lab.challenges.filter(c => c.id !== challengeId)
      }
    })
    saveLabsToStorage(updated)
    showToast("success", "Challenge deleted.")
  }

  // Add hint helper
  const handleAddHintField = () => {
    setCurrentChallenge(prev => ({
      ...prev,
      hints: [...(prev.hints || []), ""]
    }))
  }

  // Edit hint value helper
  const handleHintChange = (idx: number, val: string) => {
    const updatedHints = [...(currentChallenge.hints || [])]
    updatedHints[idx] = val
    setCurrentChallenge(prev => ({ ...prev, hints: updatedHints }))
  }

  // Delete hint field helper
  const handleRemoveHintField = (idx: number) => {
    setCurrentChallenge(prev => ({
      ...prev,
      hints: (prev.hints || []).filter((_, i) => i !== idx)
    }))
  }

  // Trigger simulated player flag event log
  const handleSimulateEvent = () => {
    const ops = ["matrix_reborn@cyberspace.in", "student_dev@trustx.org", "pwn_master@academy.local"]
    const flags = ["flag{incorrect_flag_attempt}", "flag{cstar_ad_phish_access}", "flag{cstar_crapi_bola_uuid}"]
    
    const randomOp = ops[Math.floor(Math.random() * ops.length)]
    const randomLab = labs[Math.floor(Math.random() * labs.length)]
    
    if (!randomLab || randomLab.challenges.length === 0) return

    const randomChal = randomLab.challenges[Math.floor(Math.random() * randomLab.challenges.length)]
    const isCorrect = Math.random() > 0.5
    const flagAttempt = isCorrect ? randomChal.flag : flags[Math.floor(Math.random() * flags.length)]
    
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    const newLog: AuditLog = {
      timestamp,
      operator: randomOp,
      labTitle: randomLab.title,
      challengeTitle: randomChal.title,
      attemptedFlag: flagAttempt,
      status: isCorrect ? "Correct" : "Incorrect"
    }

    const updatedLogs = [newLog, ...auditLogs].slice(0, 50) // Cap at 50 logs
    saveLogsToStorage(updatedLogs)
    showToast(isCorrect ? "success" : "error", `Telemetry: Flag submission simulated from ${randomOp}`)
  }

  // Clear Audit Logs
  const handleClearLogs = () => {
    saveLogsToStorage([])
    showToast("success", "Audit telemetry log cleared.")
  }

  // Reset to Defaults
  const handleResetToDefaults = () => {
    saveLabsToStorage(defaultLabs)
    saveLogsToStorage(defaultAuditLogs)
    showToast("success", "Default scenarios and challenges restored.")
  }

  const activeLab = labs.find(l => l.id === selectedLabId) || labs[0]

  const filteredChallenges = activeLab
    ? activeLab.challenges.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Metrics calculations
  const totalScenarios = labs.length
  const totalChals = labs.reduce((sum, l) => sum + l.challenges.length, 0)
  const totalPoints = labs.reduce((sum, l) => sum + l.challenges.reduce((s, c) => s + c.points, 0), 0)
  const correctAttempts = auditLogs.filter(l => l.status === "Correct").length

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">CTF Challenges Control</h1>
          </div>
          <p className="text-xs text-slate-400">Configure range CTF challenge scenarios, deploy keys, customize writeups, and inspect live submit telemetry.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleResetToDefaults} variant="outline" className="border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 rounded-xl h-9">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset Default Data
          </Button>
          <Button onClick={() => setIsCreatingLab(true)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Add Lab Scenario
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white font-mono">{totalScenarios}</div>
            <p className="text-[10px] text-slate-400 mt-1">Active lab categories</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Flags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white font-mono">{totalChals}</div>
            <p className="text-[10px] text-slate-400 mt-1">Configured challenges</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Max Points Pool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">{totalPoints} <span className="text-xs text-slate-500">PTS</span></div>
            <p className="text-[10px] text-slate-400 mt-1">Total score value</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Solves Telemetry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white font-mono">{correctAttempts} <span className="text-xs text-emerald-400">Correct</span></div>
            <p className="text-[10px] text-slate-400 mt-1">Active flags verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Scenarios & Settings section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Scenarios Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" /> Active Scenarios
            </h2>
          </div>
          
          <div className="space-y-2">
            {labs.map((lab) => {
              const isSelected = selectedLabId === lab.id
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabId(lab.id)
                    setSearchQuery("")
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200 block",
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/[0.03] text-white"
                      : "border-white/5 bg-white/[0.01] text-slate-300 hover:border-white/15 hover:bg-white/[0.03]"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">{lab.difficulty} · {lab.durationLabel}</span>
                      <span className="text-[9px] font-mono text-slate-500">{lab.challenges.length} Flags</span>
                    </div>
                    <h3 className="text-sm font-bold truncate">{lab.title}</h3>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{lab.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Telemetry Simulator Widget */}
          <Card className="border border-white/10 bg-slate-950/40 rounded-xl overflow-hidden shadow-inner p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Telemetry Simulator
              </span>
              <Button size="xs" onClick={handleClearLogs} className="h-6 text-[9px] bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-md px-2">
                Clear Logs
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Simulate real-time student activity by spawning a random flag submission log in the audit pipeline feed.
            </p>
            <Button onClick={handleSimulateEvent} className="w-full h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Inject Flag Attempt
            </Button>
          </Card>
        </div>

        {/* Right Side: Challenges Manager of selected Lab */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {activeLab?.title || "Scenario Challenges"}
              </h2>
              <p className="text-[10px] text-slate-500">Manage flags, writeups and hints for this scenario</p>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="Filter flags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-40 rounded-lg border-white/10 bg-white/5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <Button onClick={() => {
                setCurrentChallenge({ labId: selectedLabId, difficulty: "Medium", category: "Recon", hints: [""] })
                setIsEditing(true)
              }} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Flag
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredChallenges.length === 0 ? (
              <Card className="border border-dashed border-white/10 bg-white/[0.01] p-8 text-center rounded-2xl">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                <h3 className="text-xs font-bold text-white mb-1">No Flags Found</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  No challenges mapped to this scenario query. Add a new flag or reset default database.
                </p>
              </Card>
            ) : (
              filteredChallenges.map((challenge) => (
                <Card key={challenge.id} className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-xl overflow-hidden shadow-md">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase",
                          challenge.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          challenge.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {challenge.difficulty}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">{challenge.category}</span>
                        <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded">+{challenge.points} PTS</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{challenge.title}</h3>
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5 text-[11px]">
                        <div className="flex gap-2">
                          <span className="text-slate-500 font-mono font-semibold shrink-0">Flag Secret:</span>
                          <code className="text-emerald-400 select-all font-mono break-all">{challenge.flag}</code>
                        </div>
                        {challenge.hints && challenge.hints.length > 0 && (
                          <div className="flex gap-2 text-slate-400 font-light">
                            <span className="text-slate-500 font-mono font-semibold shrink-0">Hints:</span>
                            <span>{challenge.hints.length} registered hints</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="xs"
                        onClick={() => {
                          setCurrentChallenge({ ...challenge, labId: selectedLabId })
                          setIsEditing(true)
                        }}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg h-7 px-3 text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => handleDeleteChallenge(selectedLabId, challenge.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg h-7 px-3 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Live Telemetry audit logs list */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Activity className="w-4 h-4 text-emerald-400" /> Active Flag Submission Telemetry Stream
        </h2>
        
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 bg-white/[0.02]">
                  <th className="py-3 px-4 font-bold text-slate-300">Timestamp</th>
                  <th className="py-3 px-4 font-bold text-slate-300">Student Email</th>
                  <th className="py-3 px-4 font-bold text-slate-300">Lab Scenario</th>
                  <th className="py-3 px-4 font-bold text-slate-300">Challenge</th>
                  <th className="py-3 px-4 font-bold text-slate-300">Flag Payload</th>
                  <th className="py-3 px-4 font-bold text-slate-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                      Telemetry log is currently empty. Simulating player interactions or solving flags will spawn events here.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                      <td className="py-3 px-4 font-mono text-slate-400">{log.timestamp}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{log.operator}</td>
                      <td className="py-3 px-4 text-slate-400">{log.labTitle}</td>
                      <td className="py-3 px-4 text-slate-300 font-bold">{log.challengeTitle}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 max-w-[150px] truncate" title={log.attemptedFlag}>{log.attemptedFlag}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          log.status === "Correct"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {log.status === "Correct" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Editor Challenge Dialog Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-xl w-full border-white/10 bg-[#0E0E12]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-1.5">
                <Settings className="w-5 h-5 text-emerald-400" /> {currentChallenge.id ? "Edit Challenge Settings" : "Configure New CTF Flag"}
              </CardTitle>
              <CardDescription>Setup challenge guidelines, category tags, validation hashes, and hint solutions.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveChallenge} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Challenge Title</label>
                  <Input
                    required
                    value={currentChallenge.title || ""}
                    onChange={(e) => setCurrentChallenge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Local privilege escalation root key"
                    className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Category Tag</label>
                  <Input
                    value={currentChallenge.category || ""}
                    onChange={(e) => setCurrentChallenge(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Active Directory, SQLi, BOLA"
                    className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Difficulty</label>
                  <select
                    value={currentChallenge.difficulty || "Medium"}
                    onChange={(e) => setCurrentChallenge(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Easy" className="bg-[#0A0A0B]">Easy</option>
                    <option value="Medium" className="bg-[#0A0A0B]">Medium</option>
                    <option value="Hard" className="bg-[#0A0A0B]">Hard</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Score Reward (Points)</label>
                  <Input
                    required
                    type="number"
                    value={currentChallenge.points ?? 100}
                    onChange={(e) => setCurrentChallenge(prev => ({ ...prev, points: Number(e.target.value) }))}
                    className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Validation Flag</label>
                  <Input
                    required
                    value={currentChallenge.flag || ""}
                    onChange={(e) => setCurrentChallenge(prev => ({ ...prev, flag: e.target.value }))}
                    placeholder="flag{xxxxxxxxxxxxxxxxxxxxxxxx}"
                    className="border-white/10 bg-white/5 text-emerald-400 rounded-xl focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Mission Story Context</label>
                <textarea
                  rows={3}
                  value={currentChallenge.scenario || ""}
                  onChange={(e) => setCurrentChallenge(prev => ({ ...prev, scenario: e.target.value }))}
                  placeholder="Set the narrative context for the student..."
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Challenge Instructions</label>
                <textarea
                  rows={3}
                  value={currentChallenge.instructions || ""}
                  onChange={(e) => setCurrentChallenge(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Explain exactly what the user should query or target to recover the flag key..."
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                />
              </div>

              {/* Hints array */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Intel Hints (Optional)</label>
                  <Button type="button" size="xs" onClick={handleAddHintField} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded px-2 h-6 text-[10px]">
                    + Add Hint
                  </Button>
                </div>
                <div className="space-y-2">
                  {currentChallenge.hints?.map((hint, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={hint}
                        onChange={(e) => handleHintChange(idx, e.target.value)}
                        placeholder={`Hint #${idx + 1} text`}
                        className="border-white/10 bg-white/5 text-white rounded-xl text-xs flex-1"
                      />
                      <Button type="button" size="icon" onClick={() => handleRemoveHintField(idx)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl h-10 w-10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Solution Methodology Writeup</label>
                <textarea
                  rows={3}
                  value={currentChallenge.solutionText || ""}
                  onChange={(e) => setCurrentChallenge(prev => ({ ...prev, solutionText: e.target.value }))}
                  placeholder="Enter step-by-step documentation detailing how to solve the challenge..."
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold flex-1 rounded-xl">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditing(false)
                  setCurrentChallenge({})
                }} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 flex-1 rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Create Lab Scenario Modal */}
      {isCreatingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full border-white/10 bg-[#0E0E12]/95 backdrop-blur-xl shadow-2xl rounded-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-emerald-400" /> Create Lab Scenario Category
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateLab} className="p-6 space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Scenario Unique ID</label>
                <Input
                  required
                  value={newLabData.id || ""}
                  onChange={(e) => setNewLabData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="e.g. active-directory, owasp-top-10"
                  className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Scenario Title</label>
                <Input
                  required
                  value={newLabData.title || ""}
                  onChange={(e) => setNewLabData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Active Directory Enterprise Range"
                  className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Difficulty</label>
                <Input
                  value={newLabData.difficulty || "Medium"}
                  onChange={(e) => setNewLabData(prev => ({ ...prev, difficulty: e.target.value }))}
                  placeholder="e.g. Easy, Medium, Hard"
                  className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Estimated Duration</label>
                <Input
                  value={newLabData.durationLabel || "4 Hours"}
                  onChange={(e) => setNewLabData(prev => ({ ...prev, durationLabel: e.target.value }))}
                  placeholder="e.g. 3 Hours, 2 Days"
                  className="border-white/10 bg-white/5 text-white rounded-xl focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Description</label>
                <textarea
                  rows={3}
                  value={newLabData.description || ""}
                  onChange={(e) => setNewLabData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Write a brief overview of the learning goals..."
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold flex-1 rounded-xl">
                  Create Scenario
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreatingLab(false)} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 flex-1 rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
