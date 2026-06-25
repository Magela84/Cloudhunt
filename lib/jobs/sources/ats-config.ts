import companies from "@/config/ats-companies.json";

export interface AtsCompanies {
  greenhouse: string[];
  lever: string[];
  ashby: string[];
}

export function getAtsCompanies(): AtsCompanies {
  return {
    greenhouse: companies.greenhouse ?? [],
    lever: companies.lever ?? [],
    ashby: companies.ashby ?? [],
  };
}
