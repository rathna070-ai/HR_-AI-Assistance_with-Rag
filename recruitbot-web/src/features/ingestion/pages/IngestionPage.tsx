import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { ResumeUploadCard } from "../components/ResumeUploadCard";

export function IngestionPage() {
  return (
    <div className="h-full overflow-y-auto bg-bg-base">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">RecruitBot</p>
            <h1 className="mt-1 text-2xl font-semibold text-text-primary">Resume ingestion</h1>
            <p className="mt-1 text-sm text-text-muted">Upload a resume PDF to make it searchable.</p>
          </div>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-2 text-sm text-text-primary transition-colors hover:bg-white/[0.06]"
          >
            <Search className="h-4 w-4" aria-hidden />
            Go to candidate search
          </Link>
        </header>
        <ResumeUploadCard />
      </main>
    </div>
  );
}
