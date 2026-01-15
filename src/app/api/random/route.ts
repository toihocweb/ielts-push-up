import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { model } = body;

        const prompt = `
      Generate a SINGLE, sophisticated English vocabulary word or short idiom suitable for the **IELTS Academic** exam (Band 8.0+).
      
      Output strictly a JSON object with this format:
      {
        "word": "serendipity"
      }
      
      Do not output any other text or explanation.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful language learning assistant. specific output format: JSON.' },
                { role: 'user', content: prompt }
            ],
            model: model || 'llama-3.3-70b-versatile',
            temperature: 1.2, // Higher temperature for more variety
            stop: null,
            response_format: { type: 'json_object' }
        });

        const content = chatCompletion.choices[0]?.message?.content || '{}';
        const json = JSON.parse(content);

        return NextResponse.json(json);
    } catch (error) {
        console.error('Groq API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
