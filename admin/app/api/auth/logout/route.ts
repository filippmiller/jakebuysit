import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080/api/v1';
      try {
        await fetch(`${backendUrl}/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Backend logout error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
