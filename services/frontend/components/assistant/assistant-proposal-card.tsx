"use client";

import { RecordWritingProposal } from "@/lib/store/assistant-store";
import { Check, X } from "lucide-react";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { useState } from "react";

interface Props {
  messageId: string;
  proposal: RecordWritingProposal;
}

export function AssistantProposalCard({ messageId, proposal }: Props) {
  const { updateMessageProposalStatus, sendMessage } = useAssistantStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          previousInteractionId: null, // Ideally we pass the interactionId here, but the backend doesn't strictly need it to execute
        }),
      });
      if (response.ok) {
        updateMessageProposalStatus(messageId, "approved");
      }
    } catch (err) {
      console.error("Failed to approve", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/agent/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal }),
      });
      if (response.ok) {
        updateMessageProposalStatus(messageId, "dismissed");
      }
    } catch (err) {
      console.error("Failed to dismiss", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (proposal.status === "approved") {
    return (
      <div className="mt-4 flex items-center space-x-3 text-[13px] font-semibold text-emerald-600 bg-emerald-50 px-4 py-3 rounded-[20px] border border-emerald-200 animate-in fade-in zoom-in duration-300">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-3.5 h-3.5" />
        </div>
        <span className="tracking-wide">Action Approved & Recorded</span>
      </div>
    );
  }

  if (proposal.status === "dismissed") {
    return (
      <div className="mt-4 flex items-center space-x-3 text-[13px] font-medium text-muted-foreground bg-secondary px-4 py-3 rounded-[20px] border border-border animate-in fade-in duration-300">
        <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center border border-border">
          <X className="w-3.5 h-3.5" />
        </div>
        <span className="tracking-wide">Action Dismissed</span>
      </div>
    );
  }

  return (
    <div className="mt-5 w-full bg-card rounded-[20px] border border-border overflow-hidden">
      <div className="bg-secondary px-5 py-3 border-b border-border flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">
          Proposal: {proposal.record_type.replace('_', ' ')}
        </h4>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="text-[12px] text-foreground font-mono bg-secondary p-4 rounded-[12px] border border-border break-all">
          <pre className="whitespace-pre-wrap">{JSON.stringify(proposal.payload, null, 2)}</pre>
        </div>
        
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="group relative flex-1 flex items-center justify-between h-12 px-2 bg-primary text-primary-foreground rounded-[16px] text-[13px] font-semibold transition-all duration-300 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="ml-4 tracking-wide">
              {isSubmitting ? "Processing..." : "Approve"}
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-[12px] bg-primary-foreground/20 transition-all duration-300">
              <Check className="w-4 h-4" />
            </div>
          </button>
          <button
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="flex items-center justify-center h-12 px-6 bg-background text-muted-foreground border border-border rounded-[16px] text-[13px] font-medium hover:text-foreground hover:bg-secondary active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
