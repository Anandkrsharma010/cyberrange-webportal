"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Send,
  Shield,
  Terminal,
  Trophy,
  Activity,
  ChevronDown,
  Info,
  BookOpen
} from "lucide-react"

import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/toast"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

interface CTFChallenge {
  id: string
  title: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  scenario: string
  instructions: string
  hints: string[]
  flag: string // client-validated for standalone page
  solutionText?: string
}

interface CTFLab {
  id: string
  title: string
  description: string
  difficulty: string
  durationLabel: string
  machines: { label: string; ip: string; ports: string[]; creds?: string }[]
  challenges: CTFChallenge[]
}

// ── Static CTF Content Data ────────────────────────────────────────────────

const STATIC_LABS: CTFLab[] = [
  {
    id: "active-directory",
    title: "Active Directory CyberRange",
    description: "Multi-forest AD environment designed for practicing initial access, privilege escalation, and lateral movement.",
    difficulty: "Medium",
    durationLabel: "4 Hours",
    machines: [
      { label: "Internal Gateway Router", ip: "10.10.10.1", ports: ["80", "22", "443"] },
      { label: "Primary Domain Controller (DC01)", ip: "10.10.10.100", ports: ["389", "445", "88", "3389"], creds: "Administrator:P@ssword123!" },
      { label: "SQL Database Server (SQL01)", ip: "10.10.10.120", ports: ["1433", "445", "5985"], creds: "sql_svc:RoastMePls!" },
      { label: "User Workstation (WS01)", ip: "10.10.10.50", ports: ["445", "3389", "5985"], creds: "j.doe:Welcome2026!" }
    ],
    challenges: [
      {
        id: "ad-1",
        title: "Reconnaissance & Initial Entry",
        points: 100,
        difficulty: "Easy",
        category: "Recon / Access",
        scenario: "You are connected to the internal LAN via VPN. Your first step is to scan the domain subnet, discover active hosts, and find an entry vector on the user workstation (WS01).",
        instructions: "Perform an Nmap scan on the workstation IP `10.10.10.50`. Locate the open HTTP service and find the developers secret token in the webpage metadata or source notes.\n\nFlag format: flag{secret_string}",
        hints: [
          "Check port 80/http on 10.10.10.50.",
          "Inspect the HTML comments in the developer staging page index source."
        ],
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
        instructions: "Enumerate the system for misconfigurations. Check running tasks, services, or registry key paths. A poorly configured scheduled task executes a backup binary with high privileges. Replace the binary or hijack the execution path to retrieve the flag located in `C:\\Users\\Administrator\\Desktop\\flag.txt`.",
        hints: [
          "Run `schtasks /query /fo LIST /v` to inspect scheduled tasks.",
          "Check the folder write permissions on the BackupAgent executable path."
        ],
        flag: "flag{cstar_ad_local_admin}",
        solutionText: "Run winPEAS or query scheduled tasks. Note that C:\\Program Files\\BackupAgent\\backup.exe is writeable by Authenticated Users. Overwrite it with a shell payload to read flag.txt."
      },
      {
        id: "ad-3",
        title: "Kerberoasting Service Accounts",
        points: 200,
        difficulty: "Medium",
        category: "Active Directory",
        scenario: "Now that you are local administrator on WS01, you have access to LSASS and AD tools. You need to extract active Kerberos service tickets (SPNs) and attempt to crack them offline.",
        instructions: "Request a service ticket for the SQL server service account (`sql_svc`) using Rubeus or native powershell commands. Extract the ticket hash, crack it locally using Hashcat with rockyou.txt, and submit the cracked password as the flag.",
        hints: [
          "Use Rubeus: `Rubeus.exe kerberoast /simple` to request SPNs.",
          "The cracked password follows the format flag{cracked_password}."
        ],
        flag: "flag{cstar_ad_kerberoast_hash}",
        solutionText: "Execute `Rubeus.exe kerberoast` to get the Kerberos TGS hash. Run hashcat format 13100 to reveal the password 'RoastMePls!'."
      },
      {
        id: "ad-4",
        title: "Domain Admin Controller Takeover",
        points: 300,
        difficulty: "Hard",
        category: "Active Directory",
        scenario: "Using the compromised SQL service account credentials, target the Domain Controller `DC01` to gain full enterprise domain administrator rights.",
        instructions: "Inspect Active Directory access control lists. The SQL service account has generic write privileges over the DC01 computer account. Perform a Resource-Based Constrained Delegation (RBCD) attack or run bloodhound to find the path. Abuse this delegation to spoof a Domain Admin ticket and read the crown jewel flag from the Domain Controller's file share.",
        hints: [
          "Configure delegation settings using PowerView or Impacket's rbcd.py.",
          "Request a ticket for Administrator using S4U2self/S4U2proxy."
        ],
        flag: "flag{cstar_ad_golden_ticket}",
        solutionText: "Abuse generic write permissions on DC01 computer object to set msDS-AllowedToActOnBehalfOfOtherIdentity. Obtain a domain administrator TGT using sql_svc permissions."
      }
    ]
  },
  {
    id: "crapi",
    title: "crAPI Web API Security Arena",
    description: "OWASP API Top 10 training environment focusing on vehicle portals, token exploits, mass assignment, and SSRF vulnerabilities.",
    difficulty: "Medium",
    durationLabel: "3 Hours",
    machines: [
      { label: "crAPI Front End Webapp", ip: "10.20.20.10", ports: ["80", "8080"] },
      { label: "Identity Provider Auth Service", ip: "10.20.20.20", ports: ["8025", "8080"] },
      { label: "Community & Forum microservice", ip: "10.20.20.30", ports: ["9090"] }
    ],
    challenges: [
      {
        id: "crapi-1",
        title: "Broken Object Level Authorization (BOLA)",
        points: 100,
        difficulty: "Easy",
        category: "BOLA",
        scenario: "The crAPI application lets users view their own vehicle location coordinates. The REST endpoint checks coordinates based on vehicle ID UUIDs.",
        instructions: "Log in with your learner account and view your dashboard network calls. Identify the API endpoint `/identity/api/v1/vehicles/{id}/location`. Modify the request UUID to match another vehicle (e.g., query standard parameters or check community posts for targets) to leak coordinates and find the validation key flag.",
        hints: [
          "Check the Community forum posts. User profiles disclose vehicle UUID values in public payloads.",
          "Swap your vehicle ID in the Location request in Burp Suite or developer tools."
        ],
        flag: "flag{cstar_crapi_bola_uuid}",
        solutionText: "Retrieve vehicle ID from public community posts, then GET /identity/api/v1/vehicles/OTHER_VEHICLE_UUID/location to extract coordinates containing flag."
      },
      {
        id: "crapi-2",
        title: "Broken User Auth (JWT alg None)",
        points: 150,
        difficulty: "Medium",
        category: "Broken Auth",
        scenario: "The platform's microservices rely on JSON Web Tokens (JWT) for authentication checks. The gateway verifies credentials but is poorly configured for cryptographic checks.",
        instructions: "Extract your authentication JWT token from headers. Decode it and modify the algorithm header parameter to `none` (or `None`). Set the user email payload field to `admin@crapi.local` to spoof an admin session, submit the request to `/identity/api/v1/admin/status`, and retrieve the response flag.",
        hints: [
          "Set `alg` to `none` in the JWT header block.",
          "Ensure you remove the signature part of the JWT (leave the trailing period: header.payload.)."
        ],
        flag: "flag{cstar_crapi_jwt_alg_none}",
        solutionText: "Convert token header to {'alg': 'none', 'typ': 'JWT'}, payload to {'email': 'admin@crapi.local'}, encode in base64, remove signature block, and make request."
      },
      {
        id: "crapi-3",
        title: "Mass Assignment Exploitation",
        points: 200,
        difficulty: "Medium",
        category: "Mass Assignment",
        scenario: "The vehicle dashboard permits ordered parts catalog checkouts. A backend structure deserializes body parameters directly into database fields.",
        instructions: "Attempt to order a spare part. The request POSTs JSON data containing part details. Inject an unauthorized parameter (e.g., `\"status\": \"delivered\"` or `\"free_delivery\": true`) into the POST request body. Successfully bypass the checkout paywall, complete the transaction, and view the receipt flag.",
        hints: [
          "Inspect parameters returned in GET /api/v1/orders/.",
          "Add the key `\"status\": \"delivered\"` or `\"discount\": 100` to your POST body when creating an order."
        ],
        flag: "flag{cstar_crapi_mass_assign}",
        solutionText: "Intercept POST /api/v1/orders, inject the mass assignment payload parameter 'status': 'delivered' to auto-approve purchase order without credit deduction."
      }
    ]
  },
  {
    id: "initial-access",
    title: "Initial Access Vectors & Smuggling",
    description: "Simulated initial access operations focusing on pastejacking (ClickFix), HTML smuggling, and malicious LNK delivery payloads.",
    difficulty: "Easy",
    durationLabel: "2 Hours",
    machines: [
      { label: "Phishing Server Gateway", ip: "10.30.30.15", ports: ["80", "443"] }
    ],
    challenges: [
      {
        id: "ia-1",
        title: "HTML Smuggling Analysis",
        points: 100,
        difficulty: "Easy",
        category: "HTML Smuggling",
        scenario: "A target user was sent an HTML attachment which downloaded a malware payload locally without triggering perimeter gateway alarms.",
        instructions: "Analyze the provided smuggle script. The script uses Javascript Blob and URL.createObjectURL to compile a payload in the browser. Decode the base64 payload block in the script to find the hidden flag file content.",
        hints: [
          "Locate the base64-encoded string representing the file payload inside the HTML script tags.",
          "Decode it using cyberchef or terminal commands: `echo <base64> | base64 -d`."
        ],
        flag: "flag{cstar_html_smuggle_blob}",
        solutionText: "Extract the base64 data array variable inside the HTML script block. Decode using command line base64 -d."
      },
      {
        id: "ia-2",
        title: "ClickFix Pastejacking Script",
        points: 120,
        difficulty: "Medium",
        category: "Pastejacking",
        scenario: "A social engineering vector tricks users into pressing Win+R, pasting a command from their clipboard, and pressing Enter to 'fix' a page error.",
        instructions: "Examine the clickfix template command. It copies a PowerShell command payload to the user's clipboard. Decode the nested powershell command arguments (e.g. check for -enc base64 payload parameters) to reveal the command server IP and flag.",
        hints: [
          "Find the Base64 command inside the powershell argument `-enc` or `-EncodedCommand`.",
          "Decode the UTF-16LE / Unicode base64 bytes to get the plain text script."
        ],
        flag: "flag{cstar_clickfix_cmd_exec}",
        solutionText: "Decode the powershell encoded payload block. Remember Windows powershell uses Unicode (UTF-16LE) base64 formatting."
      }
    ]
  }
]

export default function StandaloneCTFPlayground() {
  // Client-only state management
  const [selectedLabId, setSelectedLabId] = useState<string>("active-directory")
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState<number>(0)
  
  // Progress state persisted in localstorage
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([])
  const [score, setScore] = useState<number>(0)
  const [unlockedHints, setUnlockedHints] = useState<Record<string, number>>({}) // challengeId -> hint count unlocked
  
  // Interactive form states
  const [flagInput, setFlagInput] = useState("")
  const [activeTab, setActiveTab] = useState<"instructions" | "leaderboard" | "solution">("instructions")
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState<number>(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const currentLab = STATIC_LABS.find((l) => l.id === selectedLabId) || STATIC_LABS[0]
  const currentChallenge = currentLab.challenges[selectedChallengeIdx] || currentLab.challenges[0]

  // Timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load progress from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCompleted = localStorage.getItem("ctf_completed")
      const storedUnlockedHints = localStorage.getItem("ctf_hints")
      
      if (storedCompleted) {
        try {
          const parsed = JSON.parse(storedCompleted) as string[]
          setCompletedChallenges(parsed)
          
          // Recompute score
          let totalScore = 0
          for (const lab of STATIC_LABS) {
            for (const ch of lab.challenges) {
              if (parsed.includes(ch.id)) {
                totalScore += ch.points
              }
            }
          }
          setScore(totalScore)
        } catch {}
      }
      
      if (storedUnlockedHints) {
        try {
          setUnlockedHints(JSON.parse(storedUnlockedHints))
        } catch {}
      }
    }
  }, [])

  // Mock leaderboard dynamic updates based on current user score
  useEffect(() => {
    const defaultLeaderboard: LeaderboardEntry[] = [
      { rank: 1, name: "CyberStar_Lead", email: "lead@cyberstar.io", totalPoints: 750, totalTimeSpent: 1200, completedChallenges: 6, completionDate: "" },
      { rank: 2, name: "PwnMachine", email: "pwn@academy.local", totalPoints: 500, totalTimeSpent: 1800, completedChallenges: 4, completionDate: "" },
      { rank: 3, name: "NetRunner", email: "runner@cystar.io", totalPoints: 400, totalTimeSpent: 2200, completedChallenges: 3, completionDate: "" },
      { rank: 4, name: "Operator01", email: "test_op@academy.io", totalPoints: 100, totalTimeSpent: 800, completedChallenges: 1, completionDate: "" }
    ]

    // Insert current score dynamically
    const currentName = "You (Local Operator)"
    const myEntry: LeaderboardEntry = {
      rank: 0,
      name: currentName,
      email: "you@local.ctf",
      totalPoints: score,
      totalTimeSpent: timeElapsed,
      completedChallenges: completedChallenges.length,
      completionDate: ""
    }

    const merged = [...defaultLeaderboard, myEntry]
    merged.sort((a, b) => b.totalPoints - a.totalPoints || a.totalTimeSpent - b.totalTimeSpent)
    
    // Assign ranks
    const ranked = merged.map((e, idx) => ({ ...e, rank: idx + 1 }))
    setLeaderboard(ranked)
  }, [score, completedChallenges, timeElapsed])

  const handleSelectLab = (labId: string) => {
    setSelectedLabId(labId)
    setSelectedChallengeIdx(0)
    setFlagInput("")
    setActiveTab("instructions")
  }

  const handleSelectChallenge = (index: number) => {
    setSelectedChallengeIdx(index)
    setFlagInput("")
    setActiveTab("instructions")
  }

  const handleUnlockHint = (challengeId: string) => {
    const currentUnlocked = unlockedHints[challengeId] || 0
    const nextCount = currentUnlocked + 1
    const updated = { ...unlockedHints, [challengeId]: nextCount }
    
    setUnlockedHints(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("ctf_hints", JSON.stringify(updated))
    }
    showToast("info", "Hint unlocked successfully!")
  }

  const handleSubmitFlag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChallenge || !flagInput.trim()) return

    const input = flagInput.trim()
    if (input === currentChallenge.flag) {
      if (completedChallenges.includes(currentChallenge.id)) {
        showToast("info", "Flag already solved!")
        setFlagInput("")
        return
      }

      const nextCompleted = [...completedChallenges, currentChallenge.id]
      setCompletedChallenges(nextCompleted)
      
      const newScore = score + currentChallenge.points
      setScore(newScore)
      
      if (typeof window !== "undefined") {
        localStorage.setItem("ctf_completed", JSON.stringify(nextCompleted))
      }
      
      showToast("success", `Excellent hack! Flag verified: +${currentChallenge.points} pts.`)
      setFlagInput("")
      
      // Auto-advance to next challenge if available in this lab
      if (selectedChallengeIdx < currentLab.challenges.length - 1) {
        setSelectedChallengeIdx(prev => prev + 1)
      }
    } else {
      showToast("error", "Invalid flag. Enumerate harder and retry!")
    }
  }

  const handleResetProgress = () => {
    setCompletedChallenges([])
    setScore(0)
    setUnlockedHints({})
    setTimeElapsed(0)
    if (typeof window !== "undefined") {
      localStorage.removeItem("ctf_completed")
      localStorage.removeItem("ctf_hints")
    }
    showToast("success", "CTF progress wiped clean.")
    setShowConfirmReset(false)
  }

  // Calculate metrics
  const totalLabChallenges = currentLab.challenges.length
  const solvedLabChallenges = currentLab.challenges.filter(c => completedChallenges.includes(c.id)).length
  const totalAvailablePoints = STATIC_LABS.reduce((sum, lab) => sum + lab.challenges.reduce((s, c) => s + c.points, 0), 0)
  const scorePct = totalAvailablePoints > 0 ? Math.round((score / totalAvailablePoints) * 100) : 0

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const isChallengeCompleted = completedChallenges.includes(currentChallenge.id)

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col selection:bg-emerald-500/30 font-sans">
      <Header active="ctf" />
      
      {/* Banner */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 py-8 px-6 backdrop-blur-xl shadow-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back Dashboard</Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Shield className="w-3 h-3" /> Offline Standalone CTF Arena
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">CTF Flag Capture Hub</h1>
            <p className="text-slate-400 text-xs font-light">Standalone client-side training grounds. Hack the challenges and verify keys locally.</p>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg min-w-[200px] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Capture Score</span>
                <span className="text-emerald-400 font-bold font-mono">{score} / {totalAvailablePoints} pts</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-500 rounded-full"
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>{completedChallenges.length} Solved</span>
                <span>{scorePct}% Solved</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg flex flex-col justify-center items-center min-w-[120px] h-[78px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Session Time
              </span>
              <span className="text-xl font-extrabold text-white font-mono mt-1">{formatTimer(timeElapsed)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace grid */}
      <main className="max-w-[1600px] mx-auto w-full flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Lab Selector & Challenge Navigation */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Lab Scenario Selector Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">Select Scenario</label>
            <div className="relative">
              <select
                value={selectedLabId}
                onChange={(e) => handleSelectLab(e.target.value)}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-xl shadow-lg appearance-none cursor-pointer"
              >
                {STATIC_LABS.map((lab) => (
                  <option key={lab.id} value={lab.id} className="bg-[#0A0A0B] text-white">
                    {lab.title} ({lab.difficulty})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Active Lab Challenges list */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Scenarios List
              </h2>
              <span className="text-[10px] font-mono text-slate-500">{solvedLabChallenges} / {totalLabChallenges} Solved</span>
            </div>
            
            <div className="space-y-2">
              {currentLab.challenges.map((challenge, idx) => {
                const isSolved = completedChallenges.includes(challenge.id)
                const isSelected = selectedChallengeIdx === idx
                
                return (
                  <button
                    key={challenge.id}
                    type="button"
                    onClick={() => handleSelectChallenge(idx)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start justify-between gap-3 group relative overflow-hidden",
                      isSelected
                        ? "border-emerald-500/40 bg-emerald-500/[0.03] text-white"
                        : "border-white/5 bg-white/[0.01] text-slate-300 hover:border-white/15 hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="space-y-1 relative z-10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono",
                          challenge.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          challenge.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {challenge.difficulty}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">{challenge.category}</span>
                      </div>
                      <h3 className="text-sm font-bold truncate pr-6 group-hover:text-emerald-400 transition-colors">{challenge.title}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{challenge.points} Points</p>
                    </div>
                    
                    <div className="relative z-10 shrink-0 mt-1">
                      {isSolved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-[10px] font-mono text-slate-500">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reset operations */}
          <div className="pt-2">
            {showConfirmReset ? (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-2">
                <p className="text-[10px] text-rose-300 leading-normal">Wipe all completed CTF flag flags and reset scoreboard stats?</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleResetProgress} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs py-1.5 flex-1">
                    Wipe Clean
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowConfirmReset(false)} className="border-white/10 bg-white/5 text-xs py-1.5 flex-1 text-slate-300">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/10 rounded-xl text-xs py-2"
              >
                Reset CTF Progress
              </Button>
            )}
          </div>
        </section>

        {/* Center Panel: Challenge Details and Submissions */}
        <section className="lg:col-span-6 space-y-6">
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-[65vh]">
            
            {/* Tabs Selector */}
            <div className="flex border-b border-white/10 bg-black/20">
              <button
                type="button"
                onClick={() => setActiveTab("instructions")}
                className={cn(
                  "flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
                  activeTab === "instructions"
                    ? "border-emerald-500 text-emerald-400 bg-white/[0.01]"
                    : "border-transparent text-slate-400 hover:text-white"
                )}
              >
                <HelpCircle className="w-4 h-4" /> Challenge Guide
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab("leaderboard")}
                className={cn(
                  "flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
                  activeTab === "leaderboard"
                    ? "border-emerald-500 text-emerald-400 bg-white/[0.01]"
                    : "border-transparent text-slate-400 hover:text-white"
                )}
              >
                <Trophy className="w-4 h-4" /> Scoreboard
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("solution")}
                className={cn(
                  "flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
                  activeTab === "solution"
                    ? "border-emerald-500 text-emerald-400 bg-white/[0.01]"
                    : "border-transparent text-slate-400 hover:text-white"
                )}
              >
                <BookOpen className="w-4 h-4" /> Solution writeup
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              {activeTab === "instructions" ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">{currentChallenge.title}</h2>
                        <p className="text-xs text-slate-500">Category: {currentChallenge.category}</p>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1 shrink-0">
                        {currentChallenge.points} PTS
                      </span>
                    </div>

                    {/* Scenario Context */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Context</h3>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-light">{currentChallenge.scenario}</p>
                    </div>

                    {/* Target Instructions */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instructions</h3>
                      <div className="text-sm text-slate-300 leading-relaxed font-light whitespace-pre-wrap bg-black/40 border border-white/5 rounded-xl p-5 font-mono">
                        {currentChallenge.instructions}
                      </div>
                    </div>

                    {/* Hints Section */}
                    {currentChallenge.hints && currentChallenge.hints.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Intel Hints</h3>
                        <div className="space-y-2">
                          {currentChallenge.hints.map((hint, idx) => {
                            const isUnlocked = (unlockedHints[currentChallenge.id] || 0) > idx
                            
                            return (
                              <div key={idx} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                                {isUnlocked ? (
                                  <div className="flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-300 leading-relaxed font-light">{hint}</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-slate-600" /> Locked Hint #{idx + 1}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleUnlockHint(currentChallenge.id)}
                                      className="h-7 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs"
                                    >
                                      Unlock Hint
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission box */}
                  <div className="pt-6 border-t border-white/10 mt-8">
                    {isChallengeCompleted ? (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Challenge Completed!</p>
                          <p className="text-xs text-emerald-400/90 font-light">You successfully submitted the correct flag and secured {currentChallenge.points} points.</p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitFlag} className="space-y-3">
                        <label htmlFor="flag-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                          Submit Flag Key
                        </label>
                        <div className="flex gap-3">
                          <Input
                            id="flag-input"
                            placeholder="flag{xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx}"
                            value={flagInput}
                            onChange={(e) => setFlagInput(e.target.value)}
                            autoComplete="off"
                            className="h-11 rounded-xl border border-white/10 bg-white/[0.02] text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-xl shadow-lg font-mono"
                          />
                          <Button
                            type="submit"
                            disabled={!flagInput.trim()}
                            className="h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 rounded-xl shadow-lg shadow-emerald-500/10 shrink-0"
                          >
                            Submit <Send className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : activeTab === "leaderboard" ? (
                /* Leaderboard scoreboard view */
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Top Operators Board</h3>
                      <p className="text-xs text-slate-500">Real-time CTF scores for this range scenario</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/15 bg-white/[0.02]">
                          <th className="py-3 px-4 font-bold text-slate-300">Rank</th>
                          <th className="py-3 px-4 font-bold text-slate-300">Operator</th>
                          <th className="py-3 px-4 font-bold text-slate-300 text-center">Solved</th>
                          <th className="py-3 px-4 font-bold text-slate-300 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry, idx) => {
                          const isCurrentUser = entry.name.includes("You")
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                "border-b border-white/5 hover:bg-white/[0.01] transition-all",
                                isCurrentUser ? "bg-emerald-500/5 text-emerald-400 font-bold" : "text-slate-300"
                              )}
                            >
                              <td className="py-3 px-4 font-mono">
                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                              </td>
                              <td className="py-3 px-4 max-w-[200px] truncate" title={entry.email}>
                                {entry.name}
                              </td>
                              <td className="py-3 px-4 text-center font-mono">{entry.completedChallenges || 0}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold">{entry.totalPoints}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Writeup solution tab */
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Solution Methodology</h3>
                      <p className="text-xs text-slate-500">Walkthrough hints to secure this challenge flag</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      The solution strategy and exact steps for <strong className="text-slate-200">{currentChallenge.title}</strong> are outlined below:
                    </p>
                    <div className="bg-black/60 rounded p-4 font-mono text-xs text-emerald-400/90 leading-relaxed border border-white/5 whitespace-pre-wrap">
                      {currentChallenge.solutionText || "No solution methodology registered for this challenge yet."}
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        To crack this flag locally in your console, match the target validation parameter precisely: <code className="text-emerald-400 select-all font-mono font-bold">{currentChallenge.flag}</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Right Side: Standalone Target environment scope */}
        <section className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Terminal className="w-4 h-4 text-emerald-400" /> Targets Scope
            </h2>
            
            <Card className="border border-white/10 bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <CardTitle className="text-sm font-bold text-white truncate">{currentLab.title}</CardTitle>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Difficulty: {currentLab.difficulty} · Duration: {currentLab.durationLabel}</p>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                
                <div className="space-y-4">
                  {/* Scope target cards */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" /> Scopes & IPs
                    </p>
                    <div className="space-y-2.5">
                      {currentLab.machines.map((machine, index) => (
                        <div key={index} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-200">{machine.label}</span>
                            <span className="font-mono text-[10px] text-slate-400">{machine.ip}</span>
                          </div>
                          
                          {machine.ports && machine.ports.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {machine.ports.map((p, pi) => (
                                <span key={pi} className="text-[8px] font-mono bg-white/5 px-1 py-0.5 rounded text-slate-400">
                                  Port {p}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {machine.creds && (
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[10px]">
                              <p className="text-slate-500 font-semibold">Credentials/Details:</p>
                              <div className="font-mono bg-black/20 p-1 px-2 rounded text-slate-400 break-all">
                                {machine.creds}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sandbox status info banner */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" /> Sandbox Status
                    </p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      This is a standalone frontend preview player. Make sure to launch the corresponding lab machine deployment from your dashboard to spin up physical virtual machines.
                    </p>
                  </div>
                </div>

                {/* Back to dashboard button */}
                <Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-4 text-xs font-semibold mt-2">
                  <Link href="/dashboard">
                    Open Lab Deployments <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Audit Footer */}
      <footer className="py-8 px-6 border-t border-white/5 bg-slate-950/40 text-center">
        <p className="text-[10px] text-slate-600">
          All local submissions are checked in browser state. Refreshing will retain progress using localStorage cache settings.
        </p>
      </footer>
    </div>
  )
}
