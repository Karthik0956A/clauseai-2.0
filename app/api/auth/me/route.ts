import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const session = await verifySessionToken(token);

    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            name: session.name,
            email: session.email,
        }
    });
}
