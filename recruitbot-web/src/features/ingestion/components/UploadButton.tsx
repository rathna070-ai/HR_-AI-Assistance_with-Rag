import { Loader2, Upload } from "lucide-react";

interface UploadButtonProps {
  disabled?: boolean;
  isUploading?: boolean;
  onClick: () => void;
}

export function UploadButton({ disabled, isUploading, onClick }: UploadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isUploading}
      aria-label="Upload resume"
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
      {isUploading ? "Uploading..." : "Upload Resume"}
    </button>
  );
}
