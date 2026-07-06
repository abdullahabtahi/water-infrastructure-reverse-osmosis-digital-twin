import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({
  enterprise: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const AGENT_NAME = process.env.RO_ASSISTANT_AGENT_NAME || 'projects/spatial-cat-489006-a4/locations/global/agents/ro-assistant';

export async function POST(req: NextRequest) {
  try {
    const { proposal, previousInteractionId } = await req.json();

    if (!proposal) {
      return new Response(JSON.stringify({ error: 'Missing proposal' }), { status: 400 });
    }

    // Call the Agent Runtime to execute the tool with approved=True
    const interaction = await ai.interactions.create({
      agent: AGENT_NAME,
      input: `[SYSTEM OVERRIDE]: The operator has clicked the APPROVE chip for proposal ID: ${proposal.proposal_id || 'unknown'}. You must now call the record_decision tool with approved=True and payload=${JSON.stringify(proposal.payload)}. Do not ask for further confirmation.`,
      store: true,
      background: true,
      ...(previousInteractionId && { previousInteractionId }),
    });

    return new Response(JSON.stringify({ success: true, response: interaction }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Agent interactions API error (approve):", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
