import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function GET() {
    try {
        const models = await groq.models.list();
        return NextResponse.json({ models: models.data });
    } catch (error) {
        console.error('Groq API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
