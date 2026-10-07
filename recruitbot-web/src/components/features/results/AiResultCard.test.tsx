import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiSearchResult } from "@/types/search.types";
import { AiResultCard } from "./AiResultCard";

const result: AiSearchResult = {
  rank: 1,
  candidateId: "c1",
  name: "Arun Raj",
  role: "Test Engineer",
  company: "Acme",
  email: "arun@example.com",
  phone: "9000000000",
  experienceYears: 4,
  skills: ["Java", "Selenium", "SQL"],
  matchedSkills: ["Selenium"],
  sources: ["bm25", "vector"],
  relevanceScore: 0.92,
  reason: "Four years of Selenium automation.",
  bm25Score: 7.1,
  vectorScore: 0.81,
  snippet: "text",
  duplicates: [{ resumeId: "c2", fileName: "Arun Raj updated.pdf" }],
};

const done = { status: "done" as const, text: "Strong fit for automation testing." };

describe("AiResultCard", () => {
  it("shows the relevance score, match reason, summary and sources", () => {
    render(<AiResultCard result={result} summary={done} onSelect={vi.fn()} />);
    expect(screen.getByText("0.92")).toBeInTheDocument();
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByTestId("match-reason")).toHaveTextContent("Four years of Selenium automation.");
    expect(screen.getByTestId("candidate-summary")).toHaveTextContent("Strong fit for automation testing.");
    expect(screen.getByText("Keyword match")).toBeInTheDocument();
    expect(screen.getByText("Semantic match")).toBeInTheDocument();
  });

  it("lists matched skills first and marks them", () => {
    render(<AiResultCard result={result} summary={done} onSelect={vi.fn()} />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toBe("Selenium (matches your query)");
  });

  it("shows the other resumes of the same person", () => {
    render(<AiResultCard result={result} summary={done} onSelect={vi.fn()} />);
    expect(screen.getByTestId("duplicate-note")).toHaveTextContent("+1 more resume");
    expect(screen.getByTestId("duplicate-note")).toHaveTextContent("Arun Raj updated.pdf");
  });

  it("shows loading and unavailable summary states", () => {
    const { rerender } = render(<AiResultCard result={result} summary={{ status: "loading" }} onSelect={vi.fn()} />);
    expect(screen.getByTestId("candidate-summary")).toHaveAttribute("data-state", "loading");
    rerender(<AiResultCard result={result} summary={{ status: "error" }} onSelect={vi.fn()} />);
    expect(screen.getByTestId("candidate-summary")).toHaveTextContent("Summary unavailable");
  });

  it("falls back to the BM25 score without a reason when re-ranking was unavailable", () => {
    render(<AiResultCard result={{ ...result, relevanceScore: null, reason: null }} summary={done} onSelect={vi.fn()} />);
    expect(screen.getByText("BM25 Score")).toBeInTheDocument();
    expect(screen.queryByTestId("match-reason")).not.toBeInTheDocument();
  });

  it("opens the profile from the name button", () => {
    const onSelect = vi.fn();
    render(<AiResultCard result={result} summary={done} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Arun Raj/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("c1");
  });
});
