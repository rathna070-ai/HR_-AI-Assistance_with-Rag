import { describe, expect, it } from "vitest";
import { toCandidateProfile } from "./candidate.api";

const resume = {
  id: "6abba27fa24280e1b4ab36ac",
  fileName: "a.pdf",
  rawText: "text",
  name: "Mukesh Kanna",
  email: "m@example.com",
  phone: "9000000000",
  location: "Chennai",
  skills: ["Selenium", "Java"],
  company: "Mphasis",
  role: "Associate Senior Software Engineer",
  education: "B.E Computer Science",
  totalExperience: 5.6,
  jobTitles: ["Associate Senior Software Engineer", "Junior QA Analyst"],
  experienceSummary: "Over 5 years of testing.",
};

describe("toCandidateProfile", () => {
  it("maps the stored resume to the profile shape", () => {
    const p = toCandidateProfile(resume);
    expect(p).toMatchObject({
      _id: resume.id,
      name: "Mukesh Kanna",
      phoneNumber: "9000000000",
      title: resume.role,
      company: "Mphasis",
      skills: ["Selenium", "Java"],
    });
    expect(p.education).toEqual([{ degree: "B.E Computer Science", institution: "" }]);
  });

  it("attaches the stored employer only to the current role", () => {
    const p = toCandidateProfile(resume);
    expect(p.experience).toEqual([
      { title: "Associate Senior Software Engineer", company: "Mphasis" },
      { title: "Junior QA Analyst", company: "" },
    ]);
  });

  it("leaves unstored sections empty and handles missing values", () => {
    const p = toCandidateProfile({ ...resume, name: null, email: null, education: null, jobTitles: [], role: null });
    expect(p.name).toBe("Unnamed candidate");
    expect(p.email).toBeUndefined();
    expect(p.education).toEqual([]);
    expect(p.experience).toEqual([]);
    expect(p.projects).toEqual([]);
    expect(p.certifications).toEqual([]);
  });
});
