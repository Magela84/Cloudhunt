import type { ResumeSections } from "@/lib/validations";

/** Empty structured-resume shape, safe to import from client or server code. */
export const EMPTY_SECTIONS: ResumeSections = {
  summary: "",
  experience: [],
  skills: [],
  education: [],
  certifications: [],
};
