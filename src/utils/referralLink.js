// Careers-portal referral link for an employee's referral code. Must match
// vueportal EmployeeInformationTabs.vue's `referralLink`; the portal's
// application form reads `?ref=` and validates the code (only active codes
// are accepted — an inactive one is silently dropped).
export const buildReferralLink = (code) => `https://recruitment.addessa.com/careers?ref=${code}`;

// navigator.clipboard only exists in a secure context (HTTPS / localhost);
// over plain HTTP fall back to a hidden textarea + execCommand('copy').
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Copy failed");
}
