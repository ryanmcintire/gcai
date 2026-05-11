import { AppShell } from "@/components/app-shell";
import { UploadForm } from "@/components/upload-form";

export default function Page() {
  return (
    <AppShell>
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
          Vendor contract triage
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Contract Benchmark Assistant
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Upload a vendor DOCX (≤10 MB) to get a structured triage report
          against B2B SaaS norms across 8 high-signal terms.
        </p>
      </header>
      <UploadForm />
    </AppShell>
  );
}
