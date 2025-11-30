import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, requireAdmin } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAdmin(request);
        const { db } = await connectToDatabase();

        const settings = await db.collection('settings').findOne({ userId });

        return NextResponse.json({
            settings: settings || { geminiApiKey: '' }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}

export async function PUT(request) {
    try {
        const userId = await requireAdmin(request);
        const { geminiApiKey } = await request.json();
        const { db } = await connectToDatabase();

        await db.collection('settings').updateOne(
            { userId },
            { $set: { geminiApiKey, updatedAt: new Date() } },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
