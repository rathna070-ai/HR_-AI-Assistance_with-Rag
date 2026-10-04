import type { ApiResponse, BackendResume } from "@/types/api.types";
import type { CandidateProfile, Experience } from "@/types/candidate.types";
import apiClient from "./client";

// The doc's GET /candidate/:id maps to the backend's GET /v1/resumes/:id.
// Only stored fields are shown: projects and certifications are not stored by
// ingestion, so they stay empty (and their sections are hidden).
export const toCandidateProfile = (r: BackendResume): CandidateProfile => {
  const titles = r.jobTitles?.length ? r.jobTitles : r.role ? [r.role] : [];
  const experience: Experience[] = titles.map((title) => ({
    title,
    // The backend stores one employer: the current one, which belongs to the current role.
    company: title === r.role && r.company ? r.company : "",
  }));

  return {
    _id: r.id,
    name: r.name ?? "Unnamed candidate",
    email: r.email ?? undefined,
    phoneNumber: r.phone ?? undefined,
    location: r.location ?? undefined,
    title: r.role ?? undefined,
    company: r.company ?? undefined,
    education: r.education ? [{ degree: r.education, institution: "" }] : [],
    experience,
    skills: r.skills ?? [],
    projects: [],
    certifications: [],
    text: r.rawText,
    processedAt: r.ingestedAt,
    totalExperience: r.totalExperience ?? undefined,
    experienceSummary: r.experienceSummary ?? undefined,
  };
};

export const candidateApi = {
  async getCandidate(id: string): Promise<CandidateProfile> {
    const response = await apiClient.get<ApiResponse<BackendResume>>(`/v1/resumes/${id}`);
    return toCandidateProfile(response.data.data);
  },
};
