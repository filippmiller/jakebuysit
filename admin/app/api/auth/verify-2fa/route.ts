import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tempToken, code } = await request.json();

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and 2FA code are required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid 2FA code format' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080/api/v1';
    const response = await fetch(`${backendUrl}/admin/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '2FA verification failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      token: data.token,
      user: data.user,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
