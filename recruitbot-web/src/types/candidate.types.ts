export interface Experience {
  company: string;
  title: string;
  duration?: string;
  description?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
}

export interface CandidateProfile {
  _id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  title?: string;
  company?: string;
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  projects?: { title: string; description: string }[];
  certifications?: string[];
  text?: string;
  processedAt?: string;
  // From the backend's stored resume (not in the doc's sample).
  totalExperience?: number;
  experienceSummary?: string;
}
