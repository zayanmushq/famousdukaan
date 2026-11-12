export const LEGAL_DRAFT_NOTICE = "Draft — pending legal review";

export const LEGAL_PLACEHOLDERS = {
  businessLegalName: "Rimitana Global Networks Private Limited",
  registeredAddress: "2nd Floor, 02-007, Emaar MGF The Palm Drive, Emaar Palm Square, Sector 66, Bhondsi, Gurugram, Haryana 122101, India",
  gstin: "[GSTIN]",
  grievanceOfficerName: "Hashim",
  grievanceOfficerEmail: "rimitananetwork@gmail.com",
  grievanceOfficerPhone: "+91 96904 79047",
  supportEmail: "rimitananetwork@gmail.com",
  countryOfOrigin: "India",
  // Platform operator legal name. Individual vendor legal names are shown on the product/invoice, not this value.
  sellerLegalName: "Rimitana Global Networks Private Limited",
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
