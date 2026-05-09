import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="max-w-md p-6">
        <CardHeader>
          <CardTitle>Contract Benchmark Assistant</CardTitle>
          <CardDescription>
            Upload a vendor DOCX and triage 8 high-signal terms. Scaffold ready.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
