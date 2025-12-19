import { NextResponse } from 'next/server';
import { groqService } from '@/services/groqService';

export async function GET() {
  try {
    console.log('[World Cup API] Fetching data from GROQ...');
    
    // Fetch data using your existing groqService
    const data = await groqService.getWorldCupData();
    
    return NextResponse.json({
      success: true,
      data: data,
      source: data.source || 'GROQ API',
      timestamp: new Date().toISOString(),
      message: 'World Cup data fetched successfully'
    });
    
  } catch (error: any) {
    console.error('[World Cup API] Error:', error);
    
    // Return fallback data with error info
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch World Cup data',
      data: groqService.getFallbackData(),
      source: 'Fallback Data',
      timestamp: new Date().toISOString(),
      message: 'Using fallback data due to API error'
    }, { status: 500 });
  }
}