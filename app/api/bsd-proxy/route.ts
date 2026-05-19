// app/api/bsd-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BSD_API_KEY = process.env.NEXT_PUBLIC_BSD_API_KEY;
const BSD_BASE_URL = 'https://sports.bzzoiro.com/api/v2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Get the full relative path (e.g., "teams/?name=Real%20Madrid")
  const endpoint = searchParams.get('endpoint') || '';
  
  if (!BSD_API_KEY) {
    console.error('[BSD Proxy] Missing API key');
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }
  
  try {
    // Build the URL without the API key in the query string
    const url = `${BSD_BASE_URL}${endpoint}`;
    console.log(`[BSD Proxy] Fetching: ${url}`);
    
    // Send the API key in the Authorization header (THIS IS THE FIX)
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${BSD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log(`[BSD Proxy] Response status: ${response.status}`);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[BSD Proxy] Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}