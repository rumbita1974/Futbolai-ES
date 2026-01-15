import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getWeeklyMatches, getLatestResults, getUpcomingMatches } from '@/services/matchesService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly';

    let data;

    switch (type) {
      case 'weekly':
        data = await getWeeklyMatches();
        break;
      case 'latest':
        const limit = parseInt(searchParams.get('limit') || '10');
        data = await getLatestResults(limit);
        break;
      case 'upcoming':
        const days = parseInt(searchParams.get('days') || '30');
        data = await getUpcomingMatches(days);
        break;
      default:
        data = await getWeeklyMatches();
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Highlights API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch matches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
