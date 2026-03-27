import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both old { question } and new { messages } format
    let chatMessages: ChatMessage[];
    if (body.messages && Array.isArray(body.messages)) {
      chatMessages = body.messages;
    } else if (body.question && typeof body.question === 'string') {
      chatMessages = [{ role: 'user', content: body.question }];
    } else {
      return Response.json({ error: 'Messages or question is required' }, { status: 400 });
    }

    if (chatMessages.length === 0) {
      return Response.json({ error: 'At least one message is required' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    // Fetch all documents from Supabase
    const supabase = getSupabaseServer();
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('title, content, language, updated_at')
      .order('updated_at', { ascending: false });

    if (dbError) {
      return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Build context from documents
    const docsContext = (documents || [])
      .map((doc, i) => `--- File ${i + 1}: ${doc.title} (${doc.language}) ---\n${doc.content || '(empty)'}`)
      .join('\n\n');

    const systemPrompt = `You are an AI assistant integrated into a text editor. The user has the following documents in their editor. Answer their question based on these documents. Be concise and helpful. Respond in the same language as the user's question. You have access to the full conversation history, so you can reference previous messages.

=== DOCUMENTS ===
${docsContext || '(No documents yet)'}
=== END DOCUMENTS ===`;

    // Send full conversation history to Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    });

    // Return as streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('AI ask error:', err);
    return Response.json({ error: 'AI request failed' }, { status: 500 });
  }
}
