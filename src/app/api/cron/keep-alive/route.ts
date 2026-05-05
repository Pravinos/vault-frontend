import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron Function - Keeps backend alive every 30 minutes
 * Configured in vercel.json
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiUrl = process.env.API_URL;
  const endpoint = `${apiUrl}/api/v1/auth/login`;
  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vault-KeepAlive/1.0',
      },
    });

    console.log(`[${timestamp}] Keep-alive ping - Status: ${response.status}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Backend keep-alive ping successful',
        statusCode: response.status,
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${timestamp}] Keep-alive ping failed:`, errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: 'Backend keep-alive ping failed',
        error: errorMessage,
        timestamp,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
