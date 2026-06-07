'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Header from '@/components/Header'
import { FeaturedLabsGrid } from '@/components/home/FeaturedLabsGrid'
import { ArrowRight, Target, Server, Crosshair, ShieldCheck, LayoutGrid, LogIn, MousePointerClick, BarChart3, Cloud, Brain, Boxes, Cpu } from 'lucide-react'
import Link from "next/link"
import { useAuth } from '@/lib/auth'
import { api, type PublicContentPage } from '@/lib/api'

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

export default function LandingPage() {
  const { user } = useAuth()
  const [cmsPage, setCmsPage] = useState<PublicContentPage | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    const loadCms = async () => {
      try {
        const page = await api.publicContentPageBySlug("home")
        setCmsPage(page)
      } catch {
        setCmsPage(null)
      }
    }
    void loadCms()
  }, [])

  const cmsByType = useMemo(() => {
    const sections = cmsPage?.sections || []
    return {
      firstHero: sections.find((s) => s.section_type === "hero") || null,
      firstText: sections.find((s) => s.section_type === "rich_text") || null,
      firstCta: sections.find((s) => s.section_type === "cta") || null,
      firstMedia: sections.find((s) => s.section_type === "media") || null,
    }
  }, [cmsPage])

  const heroHeadline = String(cmsByType.firstHero?.payload?.headline || "Master Cyber Defense with Real-World Scenarios")
  const heroSubheadline = String(
    cmsByType.firstHero?.payload?.subheadline ||
      "Experience RangeOps by DeepTrustxAI Academy. Immerse yourself in fully configured, isolated environments crafted for advanced attack and defense simulations."
  )
  const heroPrimaryCtaText = String(cmsByType.firstHero?.payload?.ctaText || "Get Started Today")
  const heroPrimaryCtaLink = String(cmsByType.firstHero?.payload?.ctaLink || (user ? "/labs" : "/login"))
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
  const ctaBtnLink = String(cmsByType.firstCta?.payload?.ctaLink || (user ? "/labs" : "/login"))

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30">
      <Header active="home" />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-teal-600/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <div className="container relative z-10 mx-auto px-6 pt-20 pb-32 text-center">
          <Badge className="mb-8 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium tracking-wide uppercase text-xs backdrop-blur-sm">
            Real Infrastructure. No Simulations.
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-8 max-w-5xl mx-auto leading-[1.1]">
            {heroHeadline}
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            {heroSubheadline}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button
              size="lg"
              className="group relative overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-10 py-7 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
              asChild
            >
              <Link href={heroPrimaryCtaLink}>
                <span className="relative z-10 flex items-center gap-2">
                  {heroPrimaryCtaText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group border border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 px-10 py-7 text-lg font-semibold rounded-2xl transition-all duration-300"
              asChild
            >
              <Link href={heroSecondaryCtaLink}>
                {heroSecondaryCtaText}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bento Grid: What This Platform Provides */}
      <section className="py-32 relative z-10 bg-[#0A0A0B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">{provideTitle}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light mb-6">{provideBody}</p>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformFeatures.map((feature, i) => (
              <div
                key={feature.title}
                className={`group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 ${i === 0 || i === 3 ? 'lg:col-span-2' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="py-32 relative z-10">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-3xl" />
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Workflow</h2>
            <p className="text-slate-400 text-lg">From zero to full attack execution in minutes.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />
            
            {steps.map((step, index) => (
              <div key={index} className="flex-1 text-center group relative w-full">
                <div className="w-24 h-24 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all duration-500 group-hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <step.icon className="w-10 h-10 text-slate-300 group-hover:text-emerald-400 transition-colors" strokeWidth={1.5} />
                  
                  {/* Step number badge */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-lg shadow-emerald-500/30">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-[#0A0A0B]">
        <FeaturedLabsGrid />
      </div>

      {/* Upcoming Environments */}
      <section className="py-32 relative z-10 bg-[#0A0A0B] overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">{upcomingTitle}</h2>
              <p className="text-slate-400 text-lg">{upcomingSubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {upcomingItems.map((item, idx) => {
              const icons = [Cloud, Brain, Boxes, Cpu]
              const IconComp = icons[idx % icons.length]
              return (
                <div
                  key={idx}
                  className="group rounded-3xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors relative overflow-hidden"
                >
                  {/* Diagonal subtle line */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rotate-45 transform pointer-events-none group-hover:bg-emerald-500/5 transition-colors" />
                  
                  <IconComp className="w-10 h-10 text-slate-500 mb-6 group-hover:text-emerald-400 transition-colors" strokeWidth={1.5} />
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 mb-8">{item.desc}</p>
                  <div className="inline-flex">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-4 py-1 font-medium text-xs backdrop-blur-sm">
                      In Development
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent" />
        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
            {ctaTitle}
          </h2>
          <p className="text-xl text-slate-400 mb-12">
            {ctaBody}
          </p>
          <Button
            size="lg"
            className="group bg-white text-slate-950 hover:bg-slate-200 px-12 py-8 text-xl font-bold rounded-2xl shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300"
            asChild
          >
            <Link href={ctaBtnLink}>
              <span className="flex items-center gap-3">
                {ctaBtnText}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
