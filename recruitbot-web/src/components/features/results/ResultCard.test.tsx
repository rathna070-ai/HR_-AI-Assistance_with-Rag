import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultCard } from "@/components/features/results/ResultCard";

const mockResult = {
  candidateId: "c1",
  name: "Jane Doe",
  email: "jane@example.com",
  score: 0.92,
  experienceYears: 5,
  content: "Experienced Python developer…",
};

describe("ResultCard", () => {
  it("renders candidate name and score", () => {
    render(<ResultCard result={mockResult} rank={1} searchType="vector" onSelect={vi.fn()} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("0.92")).toBeInTheDocument();
  });

  it("calls onSelect with candidateId on click", () => {
    const onSelect = vi.fn();
    render(<ResultCard result={mockResult} rank={1} searchType="vector" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("truncates the snippet to 200 characters and renders it as text", () => {
    render(<ResultCard result={{ ...mockResult, content: "<b>x</b> " + "a".repeat(400) }} rank={1} searchType="vector" onSelect={vi.fn()} />);
    const snippet = screen.getByText(/^<b>x<\/b>/);
    expect(snippet.textContent!.length).toBeLessThanOrEqual(201);
    expect(snippet.querySelector("b")).toBeNull();
  });
});
