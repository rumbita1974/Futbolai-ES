// app/api/bsd-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BSD_API_KEY = process.env.NEXT_PUBLIC_BSD_API_KEY;
const BSD_BASE_URL = 'https://sports.bzzoiro.com/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || '';
  
  if (!BSD_API_KEY) {
    return NextResponse.json({ error: 'BSD API key not configured' }, { status: 500 });
  }
  
  try {
    const url = `${BSD_BASE_URL}${endpoint}?api_key=${BSD_API_KEY}`;
    console.log(`[BSD Proxy] Fetching: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[BSD Proxy] Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}