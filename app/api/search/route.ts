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
      console.error('[Search API] GROQ client not configured');
      return NextResponse.json({
        success: false,
        error: 'GROQ API not configured',
        data: {
          title: "Configuration Error",
          summary: "GROQ API key is not configured. Check your .env.local file.",
          source: "System"
        }
      }, { status: 500 });
    }

    console.log('[Search API] Calling GROQ API...');
    
    const completion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a football expert. Provide accurate information about football.
          Format response as JSON with: title, summary, stats (array), achievements (array), currentStatus, source.`
        },
        {
          role: "user",
          content: `Provide information about: "${query}"
          
          Return valid JSON only.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    console.log('[Search API] GROQ response:', content?.substring(0, 200));
    
    let parsedData;
    try {
      parsedData = JSON.parse(content || '{}');
    } catch (parseError) {
      console.error('[Search API] JSON parse error:', parseError);
      parsedData = {
        title: `Search: ${query}`,
        summary: content || "No response received",
        source: "GROQ AI (llama-3.3-70b-versatile)"
      };
    }
    
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
        title: "Error",
        summary: "Search service temporarily unavailable. Please try again.",
        source: "System"
      }
    }, { status: 500 });
  }
}