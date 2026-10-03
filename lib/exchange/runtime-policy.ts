import { resolveDeploymentEnvironment } from "@/lib/runtime-environment";
export function intelligenceRuntimeAvailability() {
  const mode=process.env.CCJ_INTELLIGENCE_RUNTIME_MODE||"disabled";
  if(mode==="governed_halibut") return {available:false,code:"governed_intelligence_not_connected"};
  const explicitEnvironment=process.env.VERCEL_ENV||process.env.NODE_ENV;
  const recognizedSandbox=["preview","development","test"].includes(explicitEnvironment||"");
  const environment=resolveDeploymentEnvironment({vercelEnv:process.env.VERCEL_ENV,nodeEnv:process.env.NODE_ENV});
  if(mode==="legacy_synthetic_sandbox" && recognizedSandbox && environment!=="production") {
    return {available:true,code:"adult_synthetic_provider_sandbox"};
  }
  return {available:false,code:"intelligence_runtime_disabled"};
}
export function requireSyntheticProviderRuntime() {
  const status=intelligenceRuntimeAvailability();
  if(!status.available) throw new Error(status.code);
}
