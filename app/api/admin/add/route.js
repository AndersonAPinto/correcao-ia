import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-handlers';

export async function POST(request) {
    try {
        await requireAdmin(request);
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const result = await db.collection('users').updateOne(
            { email },
            { $set: { isAdmin: 1 } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
