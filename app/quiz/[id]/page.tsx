"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Shield,
  Terminal,
  Trophy,
  User,
  Activity,
  Layers,
  Info
} from "lucide-react"

import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { QuizAPI, type QuizChallenge, type QuizData, type QuizProgress, type LeaderboardEntry } from "@/lib/quizApi"
import { api, apiClient, type DeploymentAccessDetails } from "@/lib/api"
import { showToast } from "@/components/toast"
import { cn } from "@/lib/utils"

interface Deployment {
  deployment_id: string
  status: string
  is_owner: boolean
  lab_title: string
  can_join?: boolean
}

export default function QuizChallengePage() {
  const router = useRouter()
  const params = useParams()
  const labId = typeof params.id === "string" ? params.id : ""

  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  // Quiz states
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [progress, setProgress] = useState<QuizProgress | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  
  // Selection & interaction states
  const [selectedChallengeIndex, setSelectedChallengeIndex] = useState<number>(0)
  const [flagInput, setFlagInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"instructions" | "leaderboard">("instructions")
  const [unlockedHints, setUnlockedHints] = useState<Record<number, number>>({}) // challengeId -> count of hints unlocked
  
  // Target environment / Deployment context state
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null)
  const [accessDetails, setAccessDetails] = useState<DeploymentAccessDetails | null>(null)
  const [accessLoading, setAccessLoading] = useState(false)
  
  // Global page states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const timeTrackerRef = useRef<number>(Date.now())

  // Get active deployment for matching target guide
  const loadTargetGuide = useCallback(async (currentLabTitle: string) => {
    try {
      const res = await apiClient.get<{ deployments: Deployment[] }>('/labs/status')
      const payload = (res as any)?.data ?? res
      const list = Array.isArray(payload?.deployments) ? payload.deployments : []
      
      // Match deployment by lab title
      const normalizedLab = currentLabTitle.toLowerCase().replace(/[^a-z0-9]/g, "")
      const found = list.find((dep) => {
        const normDep = dep.lab_title.toLowerCase().replace(/[^a-z0-9]/g, "")
        return normDep.includes(normalizedLab) || normalizedLab.includes(normDep)
      })

      if (found && found.status.toLowerCase() === "running") {
        setActiveDeployment(found)
        setAccessLoading(true)
        try {
          const details = await api.deploymentAccessDetails(found.deployment_id)
          setAccessDetails(details)
        } catch (e) {
          console.error("Failed to load targets guide access details", e)
        } finally {
          setAccessLoading(false)
        }
      } else {
        setActiveDeployment(null)
        setAccessDetails(null)
      }
    } catch (err) {
      console.error("Failed to fetch target deployments status", err)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!labId) return
    setLoading(true)
    setError(null)
    try {
      // Fetch quiz details, user's progress and leaderboard
      const [dataRes, progressRes, leaderboardRes] = await Promise.allSettled([
        QuizAPI.getQuizData(labId),
        QuizAPI.getProgress(labId),
        QuizAPI.getLeaderboard(labId)
      ])

      if (dataRes.status === "rejected") {
        throw new Error(dataRes.reason?.message || "Failed to load CTF quiz data. Ensure you have active access entitlement.")
      }
      
      const qData = dataRes.value
      setQuizData(qData)

      if (progressRes.status === "fulfilled" && progressRes.value) {
        setProgress(progressRes.value)
        // Select first uncompleted challenge index
        const completed = progressRes.value.completedChallenges || []
        const firstUncompleted = qData.challenges.findIndex(c => !completed.includes(c.id))
        if (firstUncompleted !== -1) {
          setSelectedChallengeIndex(firstUncompleted)
        }
        
        // Restore hints unlocked from progress hintsUsed
        const initialHints: Record<number, number> = {}
        for (const c of qData.challenges) {
          // If progress tracks specific hint counts, restore them.
          // In basic progress, hintsUsed is mapping from challengeId to boolean.
          const used = progressRes.value.hintsUsed?.[c.id]
          if (used) {
            initialHints[c.id] = 1
          }
        }
        setUnlockedHints(initialHints)
      }

      if (leaderboardRes.status === "fulfilled") {
        setLeaderboard(leaderboardRes.value)
      }

      // Load associated deployment access details
      await loadTargetGuide(qData.title || qData.labId)

    } catch (err: any) {
      setError(err?.message || "Failed to load CTF challenge details.")
    } finally {
      setLoading(false)
    }
  }, [labId, loadTargetGuide])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace(`/login?return=${encodeURIComponent(`/quiz/${labId}`)}`)
      return
    }
    void loadData()
  }, [authLoading, isAuthenticated, labId, loadData, router])

  const selectedChallenge = quizData?.challenges[selectedChallengeIndex] || null

  const handleSelectChallenge = (index: number) => {
    setSelectedChallengeIndex(index)
    setFlagInput("")
    // Reset tracker for this challenge's submission time
    timeTrackerRef.current = Date.now()
  }

  const handleUnlockHint = async (challengeId: number) => {
    if (!progress || !quizData) return
    
    const currentUnlockedCount = unlockedHints[challengeId] || 0
    const nextCount = currentUnlockedCount + 1
    
    // Update local hint state
    setUnlockedHints(prev => ({
      ...prev,
      [challengeId]: nextCount
    }))

    // Save progress updates to backend (non-blocking)
    const updatedHintsUsed = { ...progress.hintsUsed, [challengeId]: true }
    void QuizAPI.updateProgress(labId, {
      hintsUsed: updatedHintsUsed
    })
    
    setProgress(prev => prev ? { ...prev, hintsUsed: updatedHintsUsed } : null)
    showToast("info", "Hint unlocked!")
  }

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChallenge || !flagInput.trim()) return

    setSubmitting(true)
    const timeSpent = Math.max(1, Math.round((Date.now() - timeTrackerRef.current) / 1000))
    
    try {
      const res = await QuizAPI.submitFlag(labId, selectedChallenge.id, flagInput.trim(), timeSpent)
      
      if (res.isCorrect) {
        showToast("success", `Correct flag! Earned ${res.points || selectedChallenge.points} points.`)
        
        // Refresh local progress state
        const updatedProgress = await QuizAPI.getProgress(labId)
        setProgress(updatedProgress)
        
        // Refresh leaderboard
        try {
          const freshLeaderboard = await QuizAPI.getLeaderboard(labId)
          setLeaderboard(freshLeaderboard)
        } catch {}

        setFlagInput("")
        
        // If there's a next challenge suggested by backend, route to it
        if (typeof res.nextChallenge === "number") {
          const nextIndex = quizData?.challenges.findIndex(c => c.id === res.nextChallenge)
          if (nextIndex !== undefined && nextIndex !== -1) {
            setSelectedChallengeIndex(nextIndex)
          }
        }
      } else {
        showToast("error", `Incorrect flag submission. Try again!`)
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to submit flag.")
    } finally {
      setSubmitting(false)
      timeTrackerRef.current = Date.now()
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col">
        <Header active="labs" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm text-slate-400 animate-pulse">Initializing CTF Console Arena...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col">
        <Header active="labs" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <CardTitle className="text-white text-xl">CTF Load Failure</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400 text-sm leading-relaxed">{error || "Could not load challenge environment."}</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl">
                  <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back Dashboard</Link>
                </Button>
                <Button onClick={() => void loadData()} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md">
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const completedSet = new Set(progress?.completedChallenges || [])
  const isChallengeCompleted = selectedChallenge ? completedSet.has(selectedChallenge.id) : false
  const score = progress?.totalPoints ?? 0
  const maxScore = quizData.totalPoints || quizData.challenges.reduce((sum, c) => sum + c.points, 0)
  const completionPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      <Header active="labs" />
      
      {/* Banner */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 py-8 px-6 backdrop-blur-xl shadow-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg">
                <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard</Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Shield className="w-3 h-3" /> CyberRange CTF Arena
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{quizData.title}</h1>
            <p className="text-slate-400 text-xs font-light">{quizData.description}</p>
          </div>
          
          {/* Progress Metrics */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg min-w-[280px] shrink-0 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Capture Score Progress</span>
              <span className="text-emerald-400 font-bold font-mono">{score} / {maxScore} pts</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>{progress?.completedChallenges?.length ?? 0} of {quizData.totalChallenges || quizData.challenges.length} Solved</span>
              <span>{completionPercentage}% Complete</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace grid */}
      <main className="max-w-[1600px] mx-auto w-full flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Challenge Navigation */}
        <section className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <Layers className="w-4 h-4 text-emerald-400" /> CTF Challenges
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {quizData.challenges.map((challenge, idx) => {
              const isCompleted = completedSet.has(challenge.id)
              const isSelected = selectedChallengeIndex === idx
              
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
                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono",
                        challenge.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        challenge.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {challenge.difficulty}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{challenge.category}</span>
                    </div>
                    <h3 className="text-sm font-bold truncate pr-6 group-hover:text-emerald-400 transition-colors">{challenge.title}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{challenge.points} Points</p>
                  </div>
                  
                  <div className="relative z-10 shrink-0 mt-1">
                    {isCompleted ? (
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
        </section>

        {/* Center: Main console - Challenge details and Flag submissions */}
        <section className="lg:col-span-6 space-y-6">
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-[60vh]">
            
            {/* Header Tabs */}
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
                <Trophy className="w-4 h-4" /> Arena Leaderboard
              </button>
            </div>

            {/* Content area */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              {activeTab === "instructions" ? (
                selectedChallenge ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-6">
                      
                      {/* Scenario Title */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h2 className="text-xl font-bold text-white tracking-tight">{selectedChallenge.title}</h2>
                          <p className="text-xs text-slate-500">Category: {selectedChallenge.category}</p>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1 shrink-0">
                          {selectedChallenge.points} PTS
                        </span>
                      </div>

                      {/* Scenario Details */}
                      {selectedChallenge.scenario && (
                        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 space-y-2">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Context / Story</h3>
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-light">{selectedChallenge.scenario}</p>
                        </div>
                      )}

                      {/* Instructions */}
                      {selectedChallenge.instructions && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instructions</h3>
                          <div className="text-sm text-slate-300 leading-relaxed font-light whitespace-pre-wrap bg-black/40 border border-white/5 rounded-xl p-5 font-mono">
                            {selectedChallenge.instructions}
                          </div>
                        </div>
                      )}

                      {/* Hints Section */}
                      {selectedChallenge.hints && selectedChallenge.hints.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Intel Hints</h3>
                          <div className="space-y-2">
                            {selectedChallenge.hints.map((hint, idx) => {
                              const isUnlocked = (unlockedHints[selectedChallenge.id] || 0) > idx
                              
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
                                        <Lock className="w-3.5 h-3.5 text-slate-600" /> Locked Intel Hint #{idx + 1}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleUnlockHint(selectedChallenge.id)}
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

                    {/* Flag Submission Arena */}
                    <div className="pt-6 border-t border-white/10 mt-8">
                      {isChallengeCompleted ? (
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Challenge Completed!</p>
                            <p className="text-xs text-emerald-400/90 font-light">You successfully submitted the correct flag and secured {selectedChallenge.points} points.</p>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitFlag} className="space-y-3">
                          <label htmlFor="flag-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                            Submit Flag / Secret Key
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
                              disabled={submitting || !flagInput.trim()}
                              className="h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 rounded-xl shadow-lg shadow-emerald-500/10 shrink-0"
                            >
                              {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Submit <Send className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10">
                    <HelpCircle className="w-12 h-12 mb-3 text-slate-700" />
                    <p className="text-sm">Select a challenge from the sidebar to inspect instructions.</p>
                  </div>
                )
              ) : (
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
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                              No submissions logged on this leaderboard yet. Be the first to solve!
                            </td>
                          </tr>
                        ) : (
                          leaderboard.map((entry, idx) => {
                            const isCurrentUser = user?.email === entry.email
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
                                  {entry.name || entry.email.split("@")[0]}
                                </td>
                                <td className="py-3 px-4 text-center font-mono">{entry.completedChallenges || 0}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold">{entry.totalPoints}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Right Side: Deployment Target Context guide */}
        <section className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Terminal className="w-4 h-4 text-emerald-400" /> Connected Target Range
            </h2>
            
            {activeDeployment ? (
              <Card className="border border-white/10 bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
                <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/20">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <CardTitle className="text-sm font-bold text-white truncate">{activeDeployment.lab_title}</CardTitle>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Deployment: {activeDeployment.deployment_id.slice(0, 12)}</p>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  
                  {/* Instructions details */}
                  {accessLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading targets...
                    </div>
                  ) : accessDetails ? (
                    <div className="space-y-4">
                      
                      {/* Tailscale connection code */}
                      {accessDetails.access_model === 'tailscale' && (
                        <div className="space-y-2 bg-white/5 border border-white/5 p-3 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Tailscale VPN Tunnel
                          </p>
                          <p className="text-[10px] text-slate-500">To target the internal range subnets, connect using the VPN CLI command:</p>
                          <div className="bg-black/60 rounded p-2.5 font-mono text-[9px] text-emerald-400/90 break-all select-all border border-white/5">
                            tailscale up --authkey=tskey-auth-...
                          </div>
                        </div>
                      )}

                      {/* Targets listing */}
                      {accessDetails.machines && accessDetails.machines.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Scopes & Targets
                          </p>
                          <div className="space-y-2.5">
                            {accessDetails.machines.map((machine, index) => (
                              <div key={index} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-200">{machine.label || `Host #${index + 1}`}</span>
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
                                
                                {machine.credentials && machine.credentials.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[10px]">
                                    <p className="text-slate-500 font-semibold">Credentials:</p>
                                    {machine.credentials.map((cred, ci) => (
                                      <div key={ci} className="font-mono bg-black/20 p-1 px-2 rounded flex justify-between text-slate-400">
                                        <span>{cred.username}</span>
                                        <span>{cred.password}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-white/5 p-3 text-slate-400 text-center font-light">
                          No direct targets mapped. Connect VPN and check scenarios details.
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/5 p-3 text-slate-400 text-center font-light">
                      Targets data unavailable.
                    </div>
                  )}

                  {/* External target console link */}
                  <Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-4 text-xs font-semibold mt-2">
                    <Link href="/dashboard">
                      Manage Deployment <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-dashed border-white/10 bg-white/[0.01] p-6 text-center rounded-2xl">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                <h3 className="text-xs font-bold text-white mb-1">Target Offline</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                  No active running deployments detected for this scenario. Deploy a target sandbox first from your dashboard.
                </p>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 rounded-xl text-xs">
                  <Link href="/dashboard">Deploy Lab Sandbox</Link>
                </Button>
              </Card>
            )}
          </div>
        </section>

      </main>

      {/* Audit Footer */}
      <footer className="py-8 px-6 border-t border-white/5 bg-slate-950/40 text-center">
        <p className="text-[10px] text-slate-600">
          All submissions are logged, signed and audited. Flag spoofing, replay attacks or platform exploits are prohibited under our Terms of Use.
        </p>
      </footer>
    </div>
  )
}
