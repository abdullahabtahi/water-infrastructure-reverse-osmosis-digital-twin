import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Hammer } from "lucide-react";

export default function StubPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <Alert className="max-w-md bg-muted/10 border-border/50 shadow-sm rounded-2xl">
        <Hammer className="h-4 w-4" />
        <AlertTitle className="font-semibold tracking-tight">Under Construction</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          This module is part of a future implementation phase.
        </AlertDescription>
      </Alert>
    </main>
  );
}
