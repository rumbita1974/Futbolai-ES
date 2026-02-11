// app/api/clear-cache/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This is a server-side endpoint to help clear client cache
    return NextResponse.json({ 
      success: true, 
      message: 'Please clear your browser cache manually. This endpoint helps instruct the client.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}