import { NextRequest, NextResponse } from 'next/server';
import { getCalls, getCall, getStats } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('stats') === '1') {
    return NextResponse.json({ ok: true, data: getStats() });
  }

  const id = searchParams.get('id');
  if (id) {
    const call = getCall(id);
    if (!call) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: call });
  }

  return NextResponse.json({ ok: true, data: getCalls() });
}
