import { ResumeUploadCard } from "../components/ResumeUploadCard";

export function IngestionPage() {
  return (
    <div className="h-full overflow-y-auto bg-bg-base">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">RecruitBot</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Resume ingestion</h1>
          <p className="mt-1 text-sm text-text-muted">Upload a resume PDF to make it searchable.</p>
        </header>
        <ResumeUploadCard />
      </main>
    </div>
  );
}
