// app/api/thesportsdb-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SPORTSDB_API_KEY = process.env.NEXT_PUBLIC_SPORTSDB_KEY || '3';
const SPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || '';
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }
  
  try {
    // Build the URL with the API key in the path (TheSportsDB v1 format)
    const url = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/${endpoint}`;
    console.log(`[TheSportsDB Proxy] Fetching: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[TheSportsDB Proxy] API returned ${response.status}`);
      return NextResponse.json({ error: `API returned ${response.status}` }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[TheSportsDB Proxy] Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}