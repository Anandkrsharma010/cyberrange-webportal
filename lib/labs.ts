/**
 * Lab catalog data layer.
 *
 * IMPORTANT: The authoritative catalog lives in the backend at GET /catalog/labs
 * (returns rows from content_items + product_prices). The frontend MUST NOT
 * hardcode lab ids, titles, prices or descriptions — always consume api.catalogLabs()
 * from lib/api.ts.
 *
 * This file only holds static UX "enrichment" copy the backend doesn't model
 * (learning outcomes, curriculum modules, requirements, what-you-get bullets,
 * suggested image / category). Enrichment is keyed by the backend's own
 * `lab_type` metadata key so a new lab auto-picks up its blueprint content
 * without code changes, and missing types render a safe generic fallback.
 */

import type { CatalogLab } from './api'
import { resolveLabCover } from './lab-covers'

// ── Types ───────────────────────────────────────────────────────────────

export interface LabEnrichment {
  image: string
  category: string
  learningOutcomes: string[]
  curriculum: { module: string; duration: string; topics: string[] }[]
  requirements: string[]
  whatYouGet: string[]
}

/**
 * Lab is a view model that merges backend catalog truth with frontend
 * enrichment copy. Components should consume this shape rather than raw
 * CatalogLab so the UI is consistent whether or not a lab has enrichment
 * registered for its lab_type.
 */
/** Fallback chips when admin has not set metadata.feature_chips yet. */
export const COMPONENTS_BY_LAB_TYPE: Record<string, string[]> = {
  windows: [
    "Domain Controller (Windows Server 2022)",
    "Domain Client (Windows 10)",
    "Kali Attack Machine",
    "Wazuh SIEM & EDR",
    "Private Tailscale VPN tunnel",
    "Pre-configured attack paths",
    "Detection rule templates",
  ],
  crapi: [
    "CRAPI vulnerable API",
    "Postman collection",
    "Burp Suite workspace",
    "JWT test harness",
    "Private Tailscale VPN tunnel",
  ],
  wazuh: [
    "Wazuh Manager (Ubuntu Server)",
    "Kali Attacker Machine",
    "Domain Controller / Windows Client Logs Ingested",
    "Elasticsearch & Kibana Stack",
    "Private Tailscale VPN tunnel",
  ],
  aws: [
    "AWS VPC Workloads",
    "Kali Attacker Machine",
    "Ubuntu Target Instance",
    "IAM Policy Configuration scenarios",
    "Private Tailscale VPN tunnel",
  ],
  cloud: [
    "AWS VPC Workloads",
    "Kali Attacker Machine",
    "Ubuntu Target Instance",
    "IAM Policy Configuration scenarios",
    "Private Tailscale VPN tunnel",
  ],
}

export interface Lab {
  id: string                       // UUID — use for all API calls
  slug: string | null              // URL-friendly slug (may be null)
  title: string
  description: string
  difficulty: string
  durationMinutes: number | null
  durationLabel: string            // human label e.g. "3h", "—"
  labType: string | null
  featureChips: string[]           // from API metadata, else lab_type fallback
  isPurchasable: boolean
  priceMinor: number | null        // INR paise; null ⇒ not priced / "coming soon"
  priceMajor: number | null        // INR rupees; display only
  currency: string | null
  image: string
  category: string
  learningOutcomes: string[]
  curriculum: { module: string; duration: string; topics: string[] }[]
  requirements: string[]
  whatYouGet: string[]
}

// ── Enrichment registry (marketing copy only) ───────────────────────────

const GENERIC_ENRICHMENT: LabEnrichment = {
  image: '/placeholder.svg',
  category: 'Cybersecurity',
  learningOutcomes: [],
  curriculum: [],
  requirements: [],
  whatYouGet: [
    'Dedicated lab environment',
    'Hands-on guided challenges',
    'Certificate of completion',
    'Community support',
  ],
}

const ENRICHMENT_BY_LAB_TYPE: Record<string, LabEnrichment> = {
  windows: {
    image: '/active-directory-logo.png',
    category: 'Enterprise Security',
    learningOutcomes: [
      'Understand Active Directory architecture and components',
      'Identify common AD misconfigurations and vulnerabilities',
      'Perform Kerberoasting and ASREPRoasting attacks',
      'Execute privilege escalation techniques in AD environments',
      'Implement AD security hardening best practices',
      'Use tools like BloodHound, PowerView, and Mimikatz',
    ],
    curriculum: [
      {
        module: 'Active Directory Fundamentals',
        duration: '90 minutes',
        topics: ['AD Architecture', 'Domain Controllers', 'Trust Relationships', 'Group Policy'],
      },
      {
        module: 'AD Enumeration & Reconnaissance',
        duration: '120 minutes',
        topics: ['LDAP Queries', 'PowerView Usage', 'BloodHound Analysis', 'Service Discovery'],
      },
      {
        module: 'Kerberos Attacks',
        duration: '90 minutes',
        topics: ['Kerberoasting', 'ASREPRoasting', 'Golden Ticket', 'Silver Ticket'],
      },
      {
        module: 'Privilege Escalation',
        duration: '75 minutes',
        topics: ['DCSync Attack', 'DCShadow', 'AdminSDHolder Abuse', 'GPO Abuse'],
      },
      {
        module: 'Defense & Hardening',
        duration: '45 minutes',
        topics: ['Security Monitoring', 'Hardening Techniques', 'Detection Rules'],
      },
    ],
    requirements: [
      'Basic understanding of Windows networking',
      'Familiarity with PowerShell commands',
      'Knowledge of enterprise IT concepts',
      'Computer with RDP capability',
      'Stable internet connection',
    ],
    whatYouGet: [
      'Dedicated Windows Server 2019 lab environment',
      'Pre-configured vulnerable AD setup',
      'Industry-standard penetration testing tools',
      'Step-by-step guided challenges',
      'Certificate of completion',
      '30-day lab access',
      'Community forum access',
      'Expert instructor support',
    ],
  },
  crapi: {
    image: '/crapi-logo.png',
    category: 'API Security',
    learningOutcomes: [
      'Understand modern API security landscape',
      'Identify OWASP API Top 10 vulnerabilities',
      'Perform API reconnaissance and enumeration',
      'Exploit authentication and authorization flaws',
      'Execute injection attacks on API endpoints',
      'Implement API security testing methodologies',
    ],
    curriculum: [
      {
        module: 'API Security Fundamentals',
        duration: '60 minutes',
        topics: ['REST API Basics', 'Authentication Methods', 'OWASP API Top 10', 'API Testing Tools'],
      },
      {
        module: 'API Reconnaissance',
        duration: '75 minutes',
        topics: ['Endpoint Discovery', 'Parameter Fuzzing', 'Documentation Analysis', 'Postman Usage'],
      },
      {
        module: 'Authentication Attacks',
        duration: '90 minutes',
        topics: ['JWT Manipulation', 'OAuth Flaws', 'Session Management', 'Rate Limiting Bypass'],
      },
      {
        module: 'Injection Vulnerabilities',
        duration: '80 minutes',
        topics: ['SQL Injection in APIs', 'NoSQL Injection', 'Command Injection', 'LDAP Injection'],
      },
      {
        module: 'Business Logic Flaws',
        duration: '55 minutes',
        topics: ['Price Manipulation', 'Privilege Escalation', 'Data Exposure', 'Rate Limiting'],
      },
    ],
    requirements: [
      'Basic understanding of web technologies',
      'Familiarity with HTTP protocol and methods',
      'Knowledge of JSON and XML formats',
      'Experience with API testing tools (Postman/Burp)',
      'Computer with modern web browser',
    ],
    whatYouGet: [
      'Realistic e-commerce API environment',
      'OWASP CRAPI vulnerable application',
      'Burp Suite Professional access',
      'Postman collection with test cases',
      'Certificate of completion',
      '30-day lab access',
      'Community forum access',
      'Expert instructor support',
    ],
  },
  wazuh: {
    image: '/labs/lab-wazuh-cover.png',
    category: 'Security Operations',
    learningOutcomes: [
      'Understand SIEM architecture and Wazuh components',
      'Deploy and configure Wazuh agents on Windows/Linux endpoints',
      'Create and fine-tune custom detection rules',
      'Analyze security alerts and perform threat hunting',
      'Implement active response for automated remediation',
    ],
    curriculum: [
      {
        module: 'Wazuh Architecture & Setup',
        duration: '60 minutes',
        topics: ['Wazuh Manager', 'Indexers', 'Filebeat', 'Agent Deployment'],
      },
      {
        module: 'Log Collection & Parsing',
        duration: '90 minutes',
        topics: ['Log Sources', 'Decoders', 'Rules Syntax', 'Custom Rules'],
      },
      {
        module: 'Vulnerability Detection & Compliance',
        duration: '60 minutes',
        topics: ['SCA (Security Configuration Assessment)', 'Syscollector', 'Regulatory Frameworks'],
      },
      {
        module: 'Threat Hunting & Alert Analysis',
        duration: '90 minutes',
        topics: ['Kibana Dashboard', 'Event Filtering', 'Alert Triaging'],
      },
    ],
    requirements: [
      'Basic understanding of Linux system administration',
      'Familiarity with networking concepts (ports, protocols)',
      'Stable internet connection',
    ],
    whatYouGet: [
      'Dedicated Wazuh SIEM lab environment',
      'Access to a live telemetry-generating system',
      'Guided hands-on threat hunting exercises',
      'Certificate of completion',
    ],
  },
  aws: {
    image: '/labs/lab-aws-cover.png',
    category: 'Cloud Security',
    learningOutcomes: [
      'Design secure AWS VPC architecture',
      'Identify and remediate common IAM misconfigurations',
      'Configure security groups and NACLs for defense-in-depth',
      'Perform cloud-focused penetration testing scenarios',
      'Implement AWS security logging and monitoring',
    ],
    curriculum: [
      {
        module: 'AWS Networking Security',
        duration: '90 minutes',
        topics: ['VPC Architecture', 'Subnets & Routes', 'Security Groups', 'NACLs'],
      },
      {
        module: 'Identity & Access Management (IAM)',
        duration: '90 minutes',
        topics: ['IAM Policies', 'Role Assumption', 'Privilege Escalation', 'Least Privilege'],
      },
      {
        module: 'Cloud Attacks & Exploitation',
        duration: '120 minutes',
        topics: ['Metadata Service Exploitation', 'Exfiltrating Credentials', 'Target Enumeration'],
      },
    ],
    requirements: [
      'Basic understanding of AWS cloud concepts',
      'Familiarity with Linux command line',
      'Stable internet connection',
    ],
    whatYouGet: [
      'Isolated AWS lab workspace',
      'Pre-configured target machines & infrastructure',
      'Step-by-step lab scenarios',
      'Certificate of completion',
    ],
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function getLabEnrichment(labType: string | null | undefined): LabEnrichment {
  if (!labType) return GENERIC_ENRICHMENT
  return ENRICHMENT_BY_LAB_TYPE[labType] ?? GENERIC_ENRICHMENT
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return hours >= 10
    ? `${Math.round(hours)}h`
    : `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`
}

export function minorToMajor(amountMinor: number | null | undefined): number | null {
  if (amountMinor == null) return null
  return Math.round(amountMinor) / 100
}

/**
 * Merge a backend CatalogLab with frontend enrichment into a single Lab
 * view model. Any missing backend fields get safe defaults — the UI can
 * render consistently whether or not enrichment is registered for the type.
 */
export function catalogFeatureChips(cat: CatalogLab): string[] {
  const fromApi = (cat.feature_chips ?? []).map((c) => c.trim()).filter(Boolean)
  if (fromApi.length > 0) return fromApi
  if (cat.lab_type && COMPONENTS_BY_LAB_TYPE[cat.lab_type]) {
    return COMPONENTS_BY_LAB_TYPE[cat.lab_type]
  }
  return []
}

export function formatDifficulty(value: string | null | undefined): string {
  const v = (value || "").trim()
  return v || "—"
}

export function toLab(cat: CatalogLab): Lab {
  const enrichment = getLabEnrichment(cat.lab_type)
  const cover = resolveLabCover(cat.lab_type, cat.slug, cat.title)
  const priceMinor = cat.price?.amount_minor ?? null
  return {
    id: cat.id,
    slug: cat.slug,
    title: cat.title,
    description: cat.description ?? '',
    difficulty: formatDifficulty(cat.difficulty),
    durationMinutes: cat.duration_minutes,
    durationLabel: formatDuration(cat.duration_minutes),
    labType: cat.lab_type,
    featureChips: catalogFeatureChips(cat),
    isPurchasable: cat.is_purchasable,
    priceMinor,
    priceMajor: minorToMajor(priceMinor),
    currency: cat.price?.currency ?? null,
    image: cover ?? enrichment.image,
    category: enrichment.category,
    learningOutcomes: enrichment.learningOutcomes,
    curriculum: enrichment.curriculum,
    requirements: enrichment.requirements,
    whatYouGet: enrichment.whatYouGet,
  }
}

/**
 * Preferred URL identifier for a lab. Uses slug if set, otherwise the UUID.
 * Never returns lab_type (which is not unique across rows).
 */
export function labUrlId(lab: Pick<CatalogLab, 'id' | 'slug'> | Pick<Lab, 'id' | 'slug'>): string {
  return lab.slug && lab.slug.trim().length > 0 ? lab.slug : lab.id
}

/**
 * Resolve a /labs/[id] URL param against a catalog list. Matches against
 * slug first, then UUID (case-insensitive, hyphen-tolerant).
 */
export function findLabByParam(catalog: CatalogLab[], param: string): CatalogLab | undefined {
  if (!param) return undefined
  const p = param.trim().toLowerCase()
  const normalized = p.replace(/-/g, '')
  // Slug match first (preferred URL form)
  const bySlug = catalog.find((c) => c.slug && c.slug.toLowerCase() === p)
  if (bySlug) return bySlug
  // UUID match (case-insensitive, tolerate hyphen differences)
  return catalog.find((c) => c.id.toLowerCase().replace(/-/g, '') === normalized)
}
