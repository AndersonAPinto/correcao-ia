import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, requireAdmin } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAdmin(request);
        const { db } = await connectToDatabase();

        const settings = await db.collection('settings').findOne({ userId });

        return NextResponse.json({
            settings: settings || { geminiApiKey: '', openRouterApiKey: '', openRouterModel: '' }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}

export async function PUT(request) {
    try {
        const userId = await requireAdmin(request);
        const { geminiApiKey, openRouterApiKey, openRouterModel } = await request.json();
        const { db } = await connectToDatabase();

        const updateFields = { updatedAt: new Date() };
        if (geminiApiKey !== undefined) updateFields.geminiApiKey = geminiApiKey;
        if (openRouterApiKey !== undefined) updateFields.openRouterApiKey = openRouterApiKey;
        if (openRouterModel !== undefined) updateFields.openRouterModel = openRouterModel;

        await db.collection('settings').updateOne(
            { userId },
            { $set: updateFields },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
