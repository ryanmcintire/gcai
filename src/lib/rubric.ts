import type { RubricTerm } from "@/types/assessment";

export const rubric = [
  {
    id: "liability_cap",
    label: "Liability cap",
    expectedPresence: "expected",
    notFoundInterpretation: "manual_review",
    verdictCriteria: {
      aggressive:
        "Cap < 6 months fees; one-way cap protecting only vendor; hard cap covers all damages with no carve-outs.",
      standard:
        "12 months trailing fees; mutual; standard carve-outs (see row 6).",
      favorable:
        "Super-cap (2–3x fees) for confidentiality/IP/data breach; or uncapped for those categories.",
    },
  },
  {
    id: "indemnification",
    label: "Indemnification",
    expectedPresence: "expected",
    notFoundInterpretation: "red_flag",
    verdictCriteria: {
      aggressive:
        "One-way (customer indemnifies vendor only); no vendor IP indemnity; indemnity capped at or below the general liability cap.",
      standard:
        "Mutual; vendor IP indemnity for 3rd-party infringement claims; customer indemnifies for misuse; indemnity carve-out from cap or super-cap.",
      favorable:
        'Vendor "defend and indemnify" obligation; uncapped indemnity; broad scope incl. data/privacy claims.',
    },
  },
  {
    id: "data_ownership",
    label: "Data ownership",
    expectedPresence: "expected",
    notFoundInterpretation: "red_flag",
    verdictCriteria: {
      aggressive:
        "Vendor claims ownership or broad rights to customer data beyond service provision; retention after termination; rights to use for product improvement without opt-out.",
      standard:
        "Customer owns customer data; vendor has narrow license to host/process for service delivery; deletion or export on termination.",
      favorable:
        "Customer ownership + export rights + deletion within 30 days + no aggregated/anonymized use without consent.",
    },
  },
  {
    id: "ip_assignment",
    label: "IP assignment",
    expectedPresence: "expected",
    notFoundInterpretation: "red_flag",
    verdictCriteria: {
      aggressive:
        'Vendor claims ownership of feedback, derivative works, or anything "incorporating" customer input; broad license back from customer.',
      standard:
        "Each party retains pre-existing IP; vendor owns service IP and improvements; non-exclusive royalty-free license to feedback.",
      favorable:
        "Customer retains feedback IP, or shared; clear delineation of work product; no implicit license to customer IP.",
    },
  },
  {
    id: "exclusivity",
    label: "Exclusivity",
    expectedPresence: "usually_absent",
    notFoundInterpretation: "neutral",
    verdictCriteria: {
      aggressive:
        "Customer barred from using competing vendors during term or post-term; broad category exclusivity.",
      standard: "Silent / no exclusivity (the norm in vendor SaaS).",
      favorable: "Explicit non-exclusivity clause.",
    },
  },
  {
    id: "unlimited_liability_carveouts",
    label: "Unlimited liability carve-outs",
    expectedPresence: "expected",
    notFoundInterpretation: "red_flag",
    verdictCriteria: {
      aggressive:
        "Carve-outs absent or extremely narrow (e.g., only gross negligence/willful misconduct).",
      standard:
        "Carve-outs for: confidentiality breach, IP infringement, indemnity obligations, gross negligence/willful misconduct.",
      favorable:
        "Adds: data breach, regulatory violations, fraud, payment obligations.",
    },
  },
  {
    id: "warranty_disclaimers",
    label: "Warranty and disclaimers",
    expectedPresence: "expected",
    notFoundInterpretation: "manual_review",
    verdictCriteria: {
      aggressive:
        '"AS IS" with full disclaimer of all warranties; no service-level commitment; no warranty of non-infringement.',
      standard:
        "Limited warranty of conformance to docs (e.g., 30–90 days); disclaimer of implied warranties; SLA referenced in separate exhibit.",
      favorable:
        "Ongoing warranty of material conformance; uptime SLA with service credits; warranty of non-infringement.",
    },
  },
  {
    id: "non_compete_non_solicit",
    label: "Non-compete / non-solicit",
    expectedPresence: "usually_absent",
    notFoundInterpretation: "neutral",
    verdictCriteria: {
      aggressive:
        "Customer prohibited from engaging similar vendors; broad employee non-solicit binding customer.",
      standard:
        "No non-compete; mutual narrow non-solicit limited to direct project staff (if present at all).",
      favorable:
        "None present, or non-solicit with general-hiring carve-out.",
    },
  },
] as const satisfies readonly RubricTerm[];
