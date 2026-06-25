/**
 * Cloud-aware skill & certification taxonomy.
 *
 * Capabilities are canonical buckets (e.g. "kubernetes"). Many surface terms map
 * to the same capability so matching is cloud-aware: a job asking for "EKS" is
 * satisfied by a candidate who lists "Kubernetes"; "AZ-104" implies "azure"; an
 * "IaC" requirement is met by "Terraform".
 */

export type Capability = string;

/** canonical capability -> surface terms that imply it. A term may appear in several groups. */
export const CAPABILITY_GROUPS: Record<Capability, string[]> = {
  aws: [
    "aws",
    "amazon web services",
    "ec2",
    "s3",
    "lambda",
    "cloudformation",
    "dynamodb",
    "rds",
    "fargate",
    "eks",
  ],
  azure: [
    "azure",
    "aks",
    "azure devops",
    "azure functions",
    "entra",
    "az-104",
    "az-204",
    "az-305",
    "az-900",
  ],
  gcp: [
    "gcp",
    "google cloud",
    "gke",
    "bigquery",
    "cloud run",
    "vertex ai",
  ],
  kubernetes: [
    "kubernetes",
    "k8s",
    "eks",
    "aks",
    "gke",
    "helm",
    "openshift",
    "container orchestration",
  ],
  terraform: [
    "terraform",
    "iac",
    "infrastructure as code",
    "infrastructure-as-code",
    "opentofu",
    "pulumi",
    "cloudformation",
  ],
  docker: ["docker", "containers", "containerization", "podman", "containerd"],
  cicd: [
    "ci/cd",
    "cicd",
    "ci cd",
    "continuous integration",
    "continuous delivery",
    "continuous deployment",
    "github actions",
    "gitlab ci",
    "jenkins",
    "circleci",
    "argocd",
    "argo cd",
    "travis ci",
  ],
  config_mgmt: ["ansible", "chef", "puppet", "saltstack", "configuration management"],
  linux: ["linux", "unix", "rhel", "ubuntu", "centos"],
  scripting: ["bash", "shell scripting", "shell", "powershell"],
  python: ["python"],
  go: ["golang", "go programming"],
  networking: [
    "networking",
    "vpc",
    "dns",
    "load balancing",
    "load balancer",
    "tcp/ip",
    "firewall",
    "vpn",
    "bgp",
  ],
  observability: [
    "monitoring",
    "observability",
    "prometheus",
    "grafana",
    "datadog",
    "cloudwatch",
    "splunk",
    "elk",
    "opentelemetry",
    "new relic",
  ],
  security: [
    "security",
    "devsecops",
    "iam",
    "secrets management",
    "vault",
    "compliance",
    "soc 2",
  ],
  databases: [
    "postgres",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "sql",
  ],
  messaging: ["kafka", "rabbitmq", "sqs", "pub/sub", "event-driven"],
};

/** Certificate keyword -> capabilities it demonstrates. Matched as substrings. */
export const CERT_CAPABILITY_MAP: Array<{ keywords: string[]; caps: Capability[] }> = [
  { keywords: ["solutions architect", "saa", "sysops", "aws certified", "aws devops"], caps: ["aws"] },
  { keywords: ["az-104", "az-305", "az-204", "az-900", "azure administrator", "azure solutions"], caps: ["azure"] },
  { keywords: ["professional cloud architect", "associate cloud engineer", "google cloud certified"], caps: ["gcp"] },
  { keywords: ["cka", "ckad", "certified kubernetes"], caps: ["kubernetes"] },
  { keywords: ["terraform associate", "hashicorp"], caps: ["terraform"] },
];

// Build a reverse index: surface term -> set of capabilities.
const TERM_INDEX: Array<{ term: string; caps: Capability[] }> = [];
for (const [cap, terms] of Object.entries(CAPABILITY_GROUPS)) {
  for (const term of terms) TERM_INDEX.push({ term, caps: [cap] });
}
// Longer terms first so "azure devops" matches before "azure".
TERM_INDEX.sort((a, b) => b.term.length - a.term.length);

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9+/.\- ]+/g, " ").replace(/\s+/g, " ")} `;
}

/** Word-ish boundary check that tolerates the symbols common in tech terms. */
function contains(haystack: string, term: string): boolean {
  const idx = haystack.indexOf(term);
  if (idx === -1) return false;
  const before = haystack[idx - 1];
  const after = haystack[idx + term.length];
  const boundary = (c: string | undefined) =>
    c === undefined || /[^a-z0-9]/.test(c);
  return boundary(before) && boundary(after);
}

/** Every distinct surface term across all capability groups (ATS vocabulary). */
export const ALL_SURFACE_TERMS: string[] = [
  ...new Set(Object.values(CAPABILITY_GROUPS).flat()),
];

/** Surface terms (e.g. "terraform", "ci/cd") found in the text, for ATS matching. */
export function termsInText(text: string): string[] {
  const hay = norm(text);
  return ALL_SURFACE_TERMS.filter((t) => contains(hay, t));
}

/** All capabilities referenced anywhere in the given text. */
export function capabilitiesInText(text: string): Set<Capability> {
  const hay = norm(text);
  const found = new Set<Capability>();
  for (const { term, caps } of TERM_INDEX) {
    if (contains(hay, term)) caps.forEach((c) => found.add(c));
  }
  return found;
}

/** Capabilities implied by a list of certifications. */
export function capabilitiesFromCerts(certs: string[]): Set<Capability> {
  const found = new Set<Capability>();
  const joined = certs.map((c) => c.toLowerCase()).join(" | ");
  for (const { keywords, caps } of CERT_CAPABILITY_MAP) {
    if (keywords.some((k) => joined.includes(k))) caps.forEach((c) => found.add(c));
  }
  return found;
}

/** Everything the user can demonstrate: skills + certs, expanded to capabilities. */
export function buildUserCapabilities(
  skills: string[],
  certs: string[],
): Set<Capability> {
  const caps = capabilitiesInText(skills.join(" , "));
  capabilitiesFromCerts(certs).forEach((c) => caps.add(c));
  return caps;
}

/** Human-friendly label for a capability bucket. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  kubernetes: "Kubernetes",
  terraform: "Terraform / IaC",
  docker: "Docker",
  cicd: "CI/CD",
  config_mgmt: "Config management",
  linux: "Linux",
  scripting: "Scripting",
  python: "Python",
  go: "Go",
  networking: "Networking",
  observability: "Observability",
  security: "Security",
  databases: "Databases",
  messaging: "Messaging",
};

export function capabilityLabel(cap: Capability): string {
  return CAPABILITY_LABELS[cap] ?? cap;
}
