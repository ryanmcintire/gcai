"use client";

import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { assessContract, type AssessResult } from "@/app/actions";
import { Report } from "@/components/report";
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
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors",
          isDragging && "border-primary bg-primary/10",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <p className="text-sm font-medium">
          {isPending
            ? "Parsing DOCX and assessing terms…"
            : "Drop a .docx vendor contract here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground">
          Max 10 MB · .docx only
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={handleChange}
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {success && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={reset}>
              Upload another
            </Button>
          </div>
          <Report result={success.result} />
        </div>
      )}
    </div>
  );
}
