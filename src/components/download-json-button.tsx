"use client";

import { Button } from "@/components/ui/button";
import type { AssessmentResult } from "@/types/assessment";

export interface DownloadJsonButtonProps {
  result: AssessmentResult;
}

export function downloadName(filename: string): string {
  if (filename.toLowerCase().endsWith(".docx")) {
    return filename.slice(0, -5) + ".assessment.json";
  }
  return "assessment.json";
}

export function DownloadJsonButton({ result }: DownloadJsonButtonProps) {
  const handleClick = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName(result.filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Download JSON
    </Button>
  );
}
