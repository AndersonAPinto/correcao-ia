import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const { db } = await connectToDatabase();

        // List all users
        const users = await db.collection('users').find({}, {
            projection: { email: 1, name: 1, isAdmin: 1, _id: 0 }
        }).toArray();

        return NextResponse.json({
            status: 'ok',
            mongodb: 'connected',
            users: users
        });
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            mongodb: 'disconnected',
            error: error.message
        }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { action } = await request.json();

        if (action === 'seed_users') {
            const { db } = await connectToDatabase();

            const usersToCreate = [
                {
                    email: 'admin@admin.com',
                    password: '12345678',
                    name: 'Admin',
                    isAdmin: 1,
                    assinatura: 'premium'
                },
                {
                    email: 'user@user.com',
                    password: '12345678',
                    name: 'User',
                    isAdmin: 0,
                    assinatura: 'free'
                }
            ];

            const results = [];

            for (const userData of usersToCreate) {
                const existingUser = await db.collection('users').findOne({ email: userData.email });

                if (existingUser) {
                    // Update password
                    const hashedPassword = hashPassword(userData.password);
                    await db.collection('users').updateOne(
                        { email: userData.email },
                        {
                            $set: {
                                password: hashedPassword,
                                isAdmin: userData.isAdmin,
                                assinatura: userData.assinatura,
                                name: userData.name
                            }
                        }
                    );
                    results.push({ email: userData.email, action: 'updated' });
                } else {
                    // Create new user
                    const userId = uuidv4();
                    const hashedPassword = hashPassword(userData.password);

                    await db.collection('users').insertOne({
                        id: userId,
                        email: userData.email,
                        password: hashedPassword,
                        name: userData.name,
                        isAdmin: userData.isAdmin,
                        assinatura: userData.assinatura,
                        createdAt: new Date()
                    });

                    // Create credits
                    await db.collection('creditos').insertOne({
                        id: uuidv4(),
                        userId,
                        saldoAtual: userData.isAdmin ? 10000 : 1000,
                        createdAt: new Date()
                    });

                    await db.collection('transacoes_creditos').insertOne({
                        id: uuidv4(),
                        userId,
                        tipo: 'credito',
                        quantidade: userData.isAdmin ? 10000 : 1000,
                        descricao: 'Créditos iniciais de boas-vindas',
                        createdAt: new Date()
                    });

                    results.push({ email: userData.email, action: 'created' });
                }
            }

            return NextResponse.json({
                status: 'ok',
                message: 'Users seeded successfully',
                results
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            error: error.message
        }, { status: 500 });
    }
}
