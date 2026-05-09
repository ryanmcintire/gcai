import { UploadForm } from "@/components/upload-form";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Contract Benchmark Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a vendor DOCX (≤10 MB). Extracted text appears below — the
          structured assessment lands in a later milestone.
        </p>
      </header>
      <UploadForm />
    </main>
  );
}
