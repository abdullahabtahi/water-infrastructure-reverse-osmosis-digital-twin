import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const ai = new GoogleGenAI({
  enterprise: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const bq = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'spatial-cat-489006-a4',
});

// The fully qualified resource name of the ADK agent
const AGENT_NAME = process.env.RO_ASSISTANT_AGENT_NAME || 'projects/spatial-cat-489006-a4/locations/global/agents/ro-assistant';

const TIME_SENSITIVE_REGEX = /\b(now|current|today|this cycle)\b/i;

export async function POST(req: NextRequest) {
  try {
    const { input, previousInteractionId } = await req.json();

    if (!input) {
      return new Response(JSON.stringify({ error: 'Missing input text' }), { status: 400 });
    }

    const isTimeSensitive = TIME_SENSITIVE_REGEX.test(input);
    let questionEmbedding: number[] | null = null;

    // 1. Check cache if not time-sensitive
    if (!isTimeSensitive) {
      try {
        const embedRes = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: input,
        });
        questionEmbedding = embedRes.embeddings?.[0]?.values || null;

        if (questionEmbedding) {
          const query = `
            SELECT base.answer_json, distance
            FROM VECTOR_SEARCH(
              TABLE \`spatial-cat-489006-a4.ro_embeddings.qa_cache\`,
              'question_embedding',
              (SELECT @embedding as question_embedding),
              top_k => 1,
              distance_type => 'COSINE'
            )
            WHERE distance < 0.08
          `;
          const [rows] = await bq.query({
            query,
            params: { embedding: questionEmbedding },
          });

          if (rows.length > 0) {
            console.log("Semantic Cache Hit! Distance:", rows[0].distance);
            const cachedChunks = typeof rows[0].answer_json === 'string' 
              ? JSON.parse(rows[0].answer_json) 
              : rows[0].answer_json;

            const stream = new ReadableStream({
              start(controller) {
                // Return exactly as the interactions API would
                for (const chunk of cachedChunks) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
                controller.close();
              }
            });

            return new Response(stream, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });
          }
        }
      } catch (cacheErr) {
        console.error("Cache read error:", cacheErr);
        // Fallthrough on cache error
      }
    }

    // 2. Call the Agent Runtime via the Interactions API
    const responseStream = await ai.interactions.create({
      agent: AGENT_NAME,
      input: input,
      store: true,
      stream: true,
      background: true,
      ...(previousInteractionId && { previousInteractionId }),
    });

    const accumulatedChunks: any[] = [];

    // Create a ReadableStream to stream Server-Sent Events (SSE) back to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of (responseStream as any)) {
            accumulatedChunks.push(chunk);
            const chunkStr = JSON.stringify(chunk);
            controller.enqueue(new TextEncoder().encode(`data: ${chunkStr}\n\n`));
          }
          controller.close();

          // 3. Write back to cache asynchronously
          if (!isTimeSensitive && questionEmbedding && accumulatedChunks.length > 0) {
            const insertQuery = `
              INSERT INTO \`spatial-cat-489006-a4.ro_embeddings.qa_cache\` 
              (question_embedding, question_text, answer_json, cached_at, is_time_sensitive) 
              VALUES (@embedding, @text, PARSE_JSON(@answer), CURRENT_TIMESTAMP(), @timeSensitive)
            `;
            bq.query({
              query: insertQuery,
              params: {
                embedding: questionEmbedding,
                text: input,
                answer: JSON.stringify(accumulatedChunks),
                timeSensitive: isTimeSensitive
              }
            }).catch(e => console.error("Cache write error:", e));
          }

        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("Agent interactions API error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
