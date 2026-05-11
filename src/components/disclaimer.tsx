import { Info } from "lucide-react";

import { Alert } from "@/components/ui/alert";

export function Disclaimer() {
  return (
    <Alert tone="warning" icon={<Info />}>
      <span className="text-xs">
        This is an automated triage tool. Not legal advice. Verify all findings
        against the source contract.
      </span>
    </Alert>
  );
}
