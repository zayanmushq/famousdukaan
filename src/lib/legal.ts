export const LEGAL_DRAFT_NOTICE = "Draft — pending legal review";

export const LEGAL_PLACEHOLDERS = {
  businessLegalName: "[BUSINESS LEGAL NAME]",
  registeredAddress: "[REGISTERED ADDRESS]",
  gstin: "[GSTIN]",
  grievanceOfficerName: "[GRIEVANCE OFFICER NAME]",
  grievanceOfficerEmail: "[GRIEVANCE OFFICER EMAIL]",
  grievanceOfficerPhone: "[GRIEVANCE OFFICER PHONE]",
  supportEmail: "[SUPPORT EMAIL]",
  countryOfOrigin: "[COUNTRY OF ORIGIN]",
  sellerLegalName: "[SELLER LEGAL NAME]",
} as const;

export const LEGAL_PAGES = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/grievance", label: "Grievance" },
] as const;

export function legalDisclaimer() {
  return "This page is a general draft for the FamousDukaan website. It is not legal advice and must be reviewed before it is treated as a final policy.";
}
