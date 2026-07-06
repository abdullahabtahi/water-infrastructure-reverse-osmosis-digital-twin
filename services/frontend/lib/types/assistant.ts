import { z } from 'zod';

export const CapabilityResultSchema = z.object({
  capability: z.enum(['data_analyst', 'simulation', 'economics', 'document', 'coordinator']),
  value: z.any().nullable().optional(),
  evidence: z.any().nullable().optional(),
  confidence_interval: z.any().nullable().optional(),
  provenance: z.string().optional(),
  range_exceeded: z.boolean().optional(),
  explanation: z.string().optional()
});

export const RecordWritingProposalSchema = z.object({
  action: z.string(),
  details: z.string(),
  approved: z.boolean().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  isStreaming: z.boolean().optional(),
  sourcedFigures: z.array(CapabilityResultSchema).optional(),
  proposal: RecordWritingProposalSchema.optional()
});

export type CapabilityResult = z.infer<typeof CapabilityResultSchema>;
export type RecordWritingProposal = z.infer<typeof RecordWritingProposalSchema>;
export type Message = z.infer<typeof MessageSchema>;
