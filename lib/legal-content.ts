/** Static legal copy for RangeOps (v1). Have qualified counsel review before treating as final. */

export const LEGAL_LAST_UPDATED = "17 May 2026"
export const LEGAL_SUPPORT_EMAIL = "support@deeptrustxai.academy"

export type LegalBlock = {
  paragraphs?: string[]
  list?: string[]
}

export type LegalSection = {
  title: string
  blocks: LegalBlock[]
  subsections?: { title: string; blocks: LegalBlock[] }[]
}

export type LegalDocument = {
  title: string
  sections: LegalSection[]
}

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  sections: [
    {
      title: "1. Introduction",
      blocks: [
        {
          paragraphs: [
            'DeepTrustxAI Academy ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use RangeOps (our cyber-range training platform), including our website, lab environments, and related services (collectively, the "Platform").',
            "By accessing or using the Platform, you acknowledge that you have read this Privacy Policy. If you do not agree, please do not use the Platform.",
          ],
        },
      ],
    },
    {
      title: "2. Who we are",
      blocks: [
        {
          paragraphs: [
            "The Platform is operated by DeepTrustxAI Academy.",
            `Contact: ${LEGAL_SUPPORT_EMAIL}`,
            "Location: Chennai, Tamil Nadu, India",
          ],
        },
      ],
    },
    {
      title: "3. Scope",
      blocks: [
        {
          paragraphs: ["This policy applies to personal information we process about:"],
          list: [
            "visitors to our website;",
            "registered users (learners, course administrators, and system administrators, as applicable);",
            "participants invited to workshops or cohorts; and",
            "individuals who contact us for support or billing enquiries.",
          ],
        },
        {
          paragraphs: [
            "It does not apply to third-party websites or services that we do not control (for example, Google or Razorpay), which have their own privacy policies.",
          ],
        },
      ],
    },
    {
      title: "4. Information we collect",
      blocks: [],
      subsections: [
        {
          title: "4.1 Information you provide",
          blocks: [
            {
              list: [
                "Account and profile: name, email address, and role assigned on the Platform.",
                "Authentication: when you sign in using Google single sign-on (SSO), we receive information from your Google account as permitted by you and by Google (typically such as name, email address, and profile identifier).",
                "Communications: information you send when you contact support (for example, the content of your message and your email address).",
                "Workshop or cohort participation: if you are invited to a workshop or cohort, we may process invitation-related data (such as email address, invitation status, and seat assignment) as provided by your organisation or course administrator.",
              ],
            },
          ],
        },
        {
          title: "4.2 Information collected automatically",
          blocks: [
            {
              paragraphs: ["When you use the Platform, we may collect:"],
              list: [
                "Usage and technical data: pages viewed, features used, timestamps, browser type, device information, and general log data.",
                "Lab and session data: actions necessary to provision, operate, and secure isolated lab environments (for example, session identifiers, lab deployment status, and infrastructure logs).",
                "Network and security data: IP addresses and related metadata used for security, abuse prevention, and operation of lab connectivity (including VPN or remote-access tooling where applicable).",
                "Cookies and similar technologies: we use cookies and local storage as needed to keep you signed in and to operate the Platform (see Section 11).",
              ],
            },
          ],
        },
        {
          title: "4.3 Payment information",
          blocks: [
            {
              paragraphs: [
                "Purchases are processed by Razorpay (or another payment provider we designate). We do not store full card or UPI credentials on our servers. We may receive and store payment-related metadata such as order ID, payment ID, amount, currency, and payment status to provide access, support, and records.",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "5. How we use your information",
      blocks: [
        {
          paragraphs: ["We use personal information to:"],
          list: [
            "create and manage your account and authenticate you;",
            "provide, operate, and improve the Platform and lab environments;",
            "process purchases, entitlements, and access to labs or workshops;",
            "send service-related communications (for example, access instructions, security notices, or support replies);",
            "monitor, detect, and prevent fraud, abuse, and security incidents;",
            "comply with legal obligations and enforce our Terms of Service;",
            "analyse aggregated or de-identified usage to improve our services (where we do so in a manner that does not identify you).",
          ],
        },
        {
          paragraphs: ["We do not sell your personal information."],
        },
      ],
    },
    {
      title: "6. Legal bases",
      blocks: [
        {
          paragraphs: [
            "Where applicable under Indian law (including the Digital Personal Data Protection Act, 2023, as amended), we process personal information based on one or more of the following: your consent; performance of a contract with you; our legitimate interests in operating a secure training platform (balanced against your rights); and compliance with legal obligations.",
          ],
        },
      ],
    },
    {
      title: "7. How we share information",
      blocks: [
        {
          paragraphs: ["We may share personal information with:"],
          list: [
            "Service providers who help us run the Platform (for example, cloud hosting, email delivery, payment processing, and identity or authentication providers), subject to appropriate safeguards;",
            "Google (for SSO), Razorpay (for payments), and infrastructure providers used to host lab environments, only as needed to provide the service;",
            "Course administrators or institutions that provision access to you as part of a workshop or cohort (limited to what is necessary for roster and access management);",
            "Authorities or third parties when required by law, court order, or to protect rights, safety, and security of users and the Platform.",
          ],
        },
        {
          paragraphs: [
            "We require service providers to use personal information only for the purposes we specify and to protect it appropriately.",
          ],
        },
      ],
    },
    {
      title: "8. International transfers",
      blocks: [
        {
          paragraphs: [
            "Our service providers may process data in India or in other countries. Where personal information is transferred outside India, we take steps reasonably required under applicable law to ensure appropriate protection.",
          ],
        },
      ],
    },
    {
      title: "9. Data retention",
      blocks: [
        {
          paragraphs: [
            "We retain personal information only as long as necessary for the purposes described in this policy, including to provide the Platform, meet legal and accounting requirements, and resolve disputes. Lab logs and security records may be retained for a limited period for security and compliance. When data is no longer needed, we delete or anonymise it in accordance with our retention practices.",
          ],
        },
      ],
    },
    {
      title: "10. Security",
      blocks: [
        {
          paragraphs: [
            "We implement technical and organisational measures designed to protect personal information against unauthorised access, loss, or misuse. No method of transmission or storage is completely secure; we cannot guarantee absolute security.",
          ],
        },
      ],
    },
    {
      title: "11. Your rights and choices",
      blocks: [
        {
          paragraphs: ["Depending on applicable law, you may have the right to:"],
          list: [
            "access and receive a copy of your personal information;",
            "correct inaccurate information;",
            "withdraw consent where processing is consent-based (without affecting prior lawful processing);",
            "request erasure or restriction in certain circumstances;",
            "lodge a complaint with the relevant authority in India.",
          ],
        },
        {
          paragraphs: [
            `To exercise your rights, contact ${LEGAL_SUPPORT_EMAIL}. We may need to verify your identity before responding. You can also manage certain Google account permissions through your Google account settings.`,
          ],
        },
      ],
    },
    {
      title: "12. Children",
      blocks: [
        {
          paragraphs: [
            "The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a minor, contact us and we will take appropriate steps to delete it.",
          ],
        },
      ],
    },
    {
      title: "13. Third-party links and services",
      blocks: [
        {
          paragraphs: [
            "The Platform may link to or integrate with third-party services. Their privacy practices are governed by their own policies. We encourage you to review them.",
          ],
        },
      ],
    },
    {
      title: "14. Changes to this policy",
      blocks: [
        {
          paragraphs: [
            'We may update this Privacy Policy from time to time. We will post the updated version on the Platform with a revised "Last updated" date. Material changes may be communicated by email or through the Platform where appropriate. Continued use after the effective date constitutes acceptance of the updated policy.',
          ],
        },
      ],
    },
    {
      title: "15. Grievance and contact",
      blocks: [
        {
          paragraphs: [
            "For privacy-related questions, requests, or grievances, contact:",
            `Email: ${LEGAL_SUPPORT_EMAIL}`,
            "Subject line: Privacy request — RangeOps",
            "We will endeavour to respond within a reasonable time frame as required under applicable law.",
          ],
        },
      ],
    },
  ],
}

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  sections: [
    {
      title: "1. Agreement to these terms",
      blocks: [
        {
          paragraphs: [
            'These Terms of Service ("Terms") are a legal agreement between you and DeepTrustxAI Academy ("we", "us", "our") governing your access to and use of RangeOps and related services (the "Platform"). By creating an account, signing in, purchasing access, or otherwise using the Platform, you agree to these Terms and to our Privacy Policy (available at /privacy). If you do not agree, do not use the Platform.',
          ],
        },
      ],
    },
    {
      title: "2. Description of the service",
      blocks: [
        {
          paragraphs: [
            "RangeOps provides hands-on cybersecurity training through isolated lab environments, scenarios, and related educational content. Features may include individual lab access, dashboards, workshop or cohort administration, and payment-enabled entitlements. We may add, change, or remove features at our discretion.",
          ],
        },
      ],
    },
    {
      title: "3. Eligibility and accounts",
      blocks: [
        {
          list: [
            "You must be at least 18 years old and able to form a binding contract under applicable law.",
            "You must provide accurate information and keep your account credentials secure. You are responsible for all activity under your account.",
            "Access is typically provided through Google SSO or other methods we enable. You must use an account you are authorised to use.",
            "We may refuse registration, suspend, or terminate accounts that violate these Terms or pose a security risk.",
          ],
        },
      ],
    },
    {
      title: "4. Acceptable use",
      blocks: [
        {
          paragraphs: ["You agree not to:"],
          list: [
            "use the Platform for any unlawful purpose or in violation of applicable law;",
            "attack, probe, or interfere with systems outside the isolated lab environment, including our infrastructure, other users, or third-party networks;",
            "distribute malware, conduct real-world attacks, harassment, or fraud;",
            "share account credentials, sell or transfer access, or circumvent access controls;",
            "scrape, reverse engineer, or overload the Platform except as expressly permitted;",
            "misuse lab tools to harm others or exfiltrate data you are not authorised to access;",
            "impersonate another person or misrepresent your affiliation.",
          ],
        },
        {
          paragraphs: [
            "We may investigate violations and cooperate with law enforcement where required.",
          ],
        },
      ],
    },
    {
      title: "5. Lab environments and security",
      blocks: [
        {
          list: [
            "Lab environments are provided for educational and authorised training only, in isolated infrastructure designed to limit impact on external systems.",
            "You must follow instructions, scope, and time limits for each lab.",
            "You acknowledge that lab scenarios may simulate attacks or vulnerable systems solely within the lab; you must not apply techniques to production or third-party systems without proper authorisation.",
            "We may monitor lab usage for security, abuse prevention, and service operation.",
            "We do not guarantee uninterrupted availability of any lab or environment.",
          ],
        },
      ],
    },
    {
      title: "6. Purchases, access, and billing",
      blocks: [
        {
          list: [
            "Paid access (where offered) is processed through Razorpay or another designated payment provider. Prices, currency (typically INR), and what is included are shown at checkout or as communicated to you.",
            "Access to paid labs or features is granted when payment is successfully completed and recorded by our systems (including confirmation via payment webhooks where applicable).",
            "You are responsible for applicable taxes, fees, and accurate billing information required by the payment provider.",
            `Refund and cancellation terms will be published on our Refund Policy page when available. Until then, billing questions may be directed to ${LEGAL_SUPPORT_EMAIL}.`,
            "Chargebacks or payment disputes should be raised with us first; fraudulent chargebacks may result in account suspension.",
          ],
        },
      ],
    },
    {
      title: "7. Workshops and institutional access",
      blocks: [
        {
          paragraphs: [
            "If you access the Platform through a workshop, cohort, or institution, additional rules may apply as communicated by your course administrator or organisation. Administrators may manage rosters, invitations, and seats. We are not responsible for disputes between you and your institution regarding fees or participation, except as expressly agreed in writing between us and that institution.",
          ],
        },
      ],
    },
    {
      title: "8. Intellectual property",
      blocks: [
        {
          list: [
            "We own the Platform, branding, curriculum structure, lab designs, documentation, and other materials we provide, except where otherwise stated.",
            "You receive a limited, non-exclusive, non-transferable licence to access and use the Platform for personal or authorised institutional learning during your entitlement period.",
            "You retain rights in content you create in labs (such as notes or reports), but you grant us a licence to host, process, and display such content as needed to operate the Platform.",
            "You may not copy, redistribute, or commercialise Platform materials without our prior written consent.",
          ],
        },
      ],
    },
    {
      title: "9. Confidentiality and educational use",
      blocks: [
        {
          paragraphs: [
            "Lab materials, flags, solutions, and scenario details are for your learning only. You agree not to publish spoilers, solution guides, or proprietary lab content in a way that harms the learning experience of others or our business, except where we expressly allow it.",
          ],
        },
      ],
    },
    {
      title: "10. Disclaimers",
      blocks: [
        {
          paragraphs: [
            'THE PLATFORM AND LAB ENVIRONMENTS ARE PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, UNINTERRUPTED, OR THAT TRAINING WILL RESULT IN EMPLOYMENT, CERTIFICATION, OR SPECIFIC OUTCOMES.',
          ],
        },
      ],
    },
    {
      title: "11. Indemnity",
      blocks: [
        {
          paragraphs: [
            "You agree to indemnify and hold harmless DeepTrustxAI Academy and its personnel from claims, damages, losses, and expenses (including reasonable legal fees) arising from your misuse of the Platform, violation of these Terms, or violation of any law or third-party rights.",
          ],
        },
      ],
    },
    {
      title: "12. Suspension and termination",
      blocks: [
        {
          paragraphs: [
            "We may suspend or terminate your access immediately if you breach these Terms, pose a security risk, or if required by law. You may stop using the Platform at any time. Provisions that by nature should survive (including intellectual property, disclaimers, indemnity, and governing law) will survive termination.",
          ],
        },
      ],
    },
    {
      title: "13. Changes to the service or terms",
      blocks: [
        {
          paragraphs: [
            'We may modify the Platform or these Terms. We will post updated Terms with a new "Last updated" date. Material changes may be notified via the Platform or email. Continued use after the effective date constitutes acceptance. If you do not agree, you must stop using the Platform.',
          ],
        },
      ],
    },
    {
      title: "14. Governing law and disputes",
      blocks: [
        {
          paragraphs: [
            "These Terms are governed by the laws of India. Courts in Chennai, Tamil Nadu shall have exclusive jurisdiction, subject to applicable consumer protection laws that may grant you rights in your place of residence.",
            `Before formal proceedings, you agree to contact us at ${LEGAL_SUPPORT_EMAIL} to attempt good-faith resolution within 30 days.`,
          ],
        },
      ],
    },
    {
      title: "15. General provisions",
      blocks: [
        {
          list: [
            "Entire agreement: These Terms and the Privacy Policy constitute the entire agreement regarding the Platform (except any separate written contract with an institution).",
            "Severability: If any provision is unenforceable, the remainder stays in effect.",
            "No waiver: Failure to enforce a provision is not a waiver.",
            "Assignment: You may not assign these Terms; we may assign them in connection with a merger, acquisition, or reorganisation.",
          ],
        },
      ],
    },
    {
      title: "16. Contact",
      blocks: [
        {
          paragraphs: [
            "DeepTrustxAI Academy — RangeOps",
            `Email: ${LEGAL_SUPPORT_EMAIL}`,
          ],
        },
      ],
    },
  ],
}
