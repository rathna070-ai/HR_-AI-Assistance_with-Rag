import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils/cn";

interface UploadDropzoneProps {
  selectedFile: File | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}

// Drag-and-drop area plus a "Browse" button. The file input only offers PDFs;
// the full validation rules are applied when a file is selected.
export function UploadDropzone({ selectedFile, disabled, onFileSelected }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      data-testid="upload-dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-white/[0.12] bg-bg-base/60",
        disabled && "opacity-60",
      )}
    >
      {selectedFile ? (
        <FileText className="h-10 w-10 text-score-vector" aria-hidden />
      ) : (
        <UploadCloud className="h-10 w-10 text-text-muted" aria-hidden />
      )}
      <div>
        <p className="text-sm font-medium text-text-primary">
          {selectedFile ? selectedFile.name : "Drag & drop a resume PDF here"}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : "PDF only, up to 5MB"}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-text-primary transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed"
        aria-label="Browse for a PDF file"
      >
        {selectedFile ? "Choose a different PDF" : "Browse / Select PDF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        data-testid="file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          // Allow choosing the same file again later.
          event.target.value = "";
        }}
      />
    </div>
  );
}
