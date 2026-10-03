import { learnerOnboardingApproved } from "@/lib/privacy/policy";
export const DEFAULT_PLATFORM_ADMIN_EMAIL="labellesolutionservices@gmail.com";
export function verifiedPlatformAdminEmailRequired(){
  return String(process.env.CCJ_REQUIRE_VERIFIED_PLATFORM_ADMIN||'').trim().toLowerCase()==='true';
}
export function configuredAdminEmails() {
  return new Set([DEFAULT_PLATFORM_ADMIN_EMAIL,...String(process.env.PLATFORM_ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)]);
}
export function newProfileProvisioningAllowed(user: {email?:unknown;emailVerified?:unknown}) {
  return learnerOnboardingApproved() || (user.emailVerified===true && typeof user.email==="string" && configuredAdminEmails().has(user.email.trim().toLowerCase()));
}
