/**
 * Cloud-engineering taxonomy used across onboarding suggestions, fit scoring,
 * and resume tailoring. Phase 3 extends this with the certification→skill map.
 */

export const TARGET_TITLE_SUGGESTIONS = [
  "Cloud Engineer",
  "DevOps Engineer",
  "Platform Engineer",
  "Site Reliability Engineer",
  "Cloud Infrastructure Engineer",
  "Cloud Architect",
  "Systems Engineer",
  "Infrastructure Engineer",
];

export const CLOUD_SKILL_SUGGESTIONS = [
  // AWS
  "AWS",
  "EC2",
  "S3",
  "EKS",
  "Lambda",
  "CloudFormation",
  "IAM",
  "RDS",
  // Azure
  "Azure",
  "AKS",
  "Azure DevOps",
  "Azure Functions",
  // GCP
  "GCP",
  "GKE",
  "BigQuery",
  // IaC / orchestration
  "Terraform",
  "Pulumi",
  "Ansible",
  "Kubernetes",
  "Docker",
  "Helm",
  // CI/CD & observability
  "CI/CD",
  "GitHub Actions",
  "Jenkins",
  "GitLab CI",
  "ArgoCD",
  "Prometheus",
  "Grafana",
  "Datadog",
  // Languages / scripting
  "Python",
  "Bash",
  "Go",
  "Linux",
  "Networking",
];

export const CERTIFICATION_SUGGESTIONS = [
  "AWS Cloud Practitioner",
  "AWS Solutions Architect Associate (SAA)",
  "AWS SysOps Administrator",
  "AWS DevOps Engineer Professional",
  "AWS Solutions Architect Professional",
  "Azure Fundamentals (AZ-900)",
  "Azure Administrator (AZ-104)",
  "Azure Solutions Architect (AZ-305)",
  "Google Associate Cloud Engineer",
  "Google Professional Cloud Architect",
  "Certified Kubernetes Administrator (CKA)",
  "HashiCorp Terraform Associate",
];

export const WORK_AUTH_SUGGESTIONS = [
  "U.S. Citizen",
  "Green Card / Permanent Resident",
  "Authorized to work (no sponsorship needed)",
  "Requires sponsorship now",
  "Will require sponsorship in future",
  "EU work authorization",
  "UK work authorization",
];

export const REMOTE_PREFERENCES = [
  { value: "REMOTE", label: "Remote only" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" },
  { value: "ANY", label: "No preference" },
] as const;
