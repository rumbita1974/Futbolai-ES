// app/api/football-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || '';
  
  if (!FOOTBALL_DATA_API_KEY) {
    console.error('[Proxy] FOOTBALL_DATA_API_KEY is not set');
    return NextResponse.json(
      { error: 'API key not configured on server' },
      { status: 500 }
    );
  }
  
  try {
    const url = `${FOOTBALL_DATA_BASE_URL}${endpoint}`;
    console.log(`[Proxy] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[Proxy] API returned ${response.status}: ${response.statusText}`);
      return NextResponse.json(
        { error: `API returned ${response.status}`, details: await response.text() },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: String(error) },
      { status: 500 }
    );
  }
}