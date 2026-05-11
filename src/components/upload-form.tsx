"use client";

import { AlertCircle, ArrowLeft, Loader2, Upload } from "lucide-react";
import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { assessContract, type AssessResult } from "@/app/actions";
import { Report } from "@/components/report";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const DOCX_EXT = ".docx";

type UiState =
  | { kind: "idle" }
  | { kind: "client_error"; message: string }
  | { kind: "result"; result: AssessResult };

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(DOCX_EXT)) {
    return "Only .docx files are supported";
  }
  if (file.size === 0) {
    return "File is empty";
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds 10 MB limit";
  }
  return null;
}

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UiState>({ kind: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const clientError = validateFile(file);
    if (clientError) {
      setState({ kind: "client_error", message: clientError });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await assessContract(formData);
      setState({ kind: "result", result });
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const errorMessage =
    state.kind === "client_error"
      ? state.message
      : state.kind === "result" && !state.result.ok
        ? state.result.error
        : null;

  const success =
    state.kind === "result" && state.result.ok ? state.result : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-busy={isPending}
        className={cn(
          "group/dropzone relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-center shadow-xs transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isDragging &&
            "border-brand/60 ring-2 ring-brand/30 ring-offset-2 ring-offset-background",
          isPending && "pointer-events-none opacity-70",
        )}
      >
        {isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2
              aria-hidden="true"
              className="size-7 animate-spin text-muted-foreground"
            />
            <p className="text-sm font-medium">
              Parsing DOCX and assessing terms…
            </p>
            <p className="text-xs text-muted-foreground">
              This usually takes 10–20 seconds.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover/dropzone:bg-brand/10 group-hover/dropzone:text-brand">
              <Upload aria-hidden="true" className="size-5" />
            </span>
            <p className="text-sm font-medium">
              Drop a .docx vendor contract here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Max 10 MB · .docx only
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={handleChange}
        />
      </div>

      {errorMessage && (
        <Alert
          tone="danger"
          role="alert"
          icon={<AlertCircle />}
          className="border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/40 dark:bg-destructive/10 dark:text-destructive"
        >
          {errorMessage}
        </Alert>
      )}

      {success && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeft aria-hidden="true" />
              Upload another
            </Button>
          </div>
          <Report result={success.result} />
        </div>
      )}
    </div>
  );
}
