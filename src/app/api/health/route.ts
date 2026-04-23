import { NextResponse } from 'next/server';

export async function GET() {
  const dsKey = process.env.DEEPSEEK_API_KEY || '';
  const gmKey = process.env.GEMINI_API_KEY || '';

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    keys: {
      DEEPSEEK_API_KEY: dsKey ? `YES (${dsKey.slice(0, 6)}...${dsKey.slice(-4)})` : 'NOT SET',
      GEMINI_API_KEY: gmKey ? `YES (${gmKey.slice(0, 6)}...${gmKey.slice(-4)})` : 'NOT SET',
    },
    deepseek_ready: !!dsKey,
    gemini_ready: !!gmKey,
  });
}
