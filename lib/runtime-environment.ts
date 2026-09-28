export type DeploymentEnvironment = "development" | "preview" | "production" | "test";

export function resolveDeploymentEnvironment(input: {
  vercelEnv?: string | null;
  nodeEnv?: string | null;
  ci?: string | null;
}): DeploymentEnvironment {
  const vercel = String(input.vercelEnv || "").trim().toLowerCase();
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  if (vercel === "development") return "development";

  const node = String(input.nodeEnv || "").trim().toLowerCase();
  if (node === "test") return "test";
  if (node === "production") return "production";
  return "development";
}

export function productionIdentityMustMatch(environment: DeploymentEnvironment) {
  return environment === "production";
}
