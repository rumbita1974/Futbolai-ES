import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;
const groqClient = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('[Search API] Processing query:', query);

    if (!groqClient) {
      return NextResponse.json({
        success: true,
        data: {
          answer: `Football information about: ${query}`,
          stats: ["Data loaded from Wikipedia", "AI-powered analysis"],
          source: "Demo Mode (GROQ not configured)"
        }
      });
    }

    const completion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a football expert with access to Wikipedia. 
          Provide accurate, factual information about football players, teams, tournaments, and statistics.
          Always cite information from Wikipedia when possible.
          Format response as structured JSON with: title, summary, stats, achievements, currentStatus.`
        },
        {
          role: "user",
          content: `Provide Wikipedia-sourced information about: "${query}"
          
          Include:
          1. Key statistics and data (from Wikipedia)
          2. Current status (2024)
          3. Major achievements/trophies
          4. Recent performance
          
          Return ONLY valid JSON, no other text.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const parsedData = JSON.parse(content || '{}');
    
    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process search query',
      data: {
        answer: "Search service temporarily unavailable. Try: 'Lionel Messi stats' or 'World Cup 2026'",
        source: "Fallback"
      }
    }, { status: 500 });
  }
}