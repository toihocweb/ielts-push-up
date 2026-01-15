import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { text, model } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        const prompt = `
      Provide a concise dictionary definition for the text: "${text}".
      1. "ipa": IPA pronunciation (if applicable).
      2. "part_of_speech": Part of speech (e.g., Verb, Noun).
      3. "meaning": A simple, easy-to-understand English explanation.
      4. "translation": Vietnamese translation of the meaning.

      Return STRICTLY a JSON object with this format (no other text):
      {
        "ipa": "/.../",
        "part_of_speech": "...",
        "meaning": "...",
        "translation": "..."
      }
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful dictionary assistant. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            model: model || 'llama-3.3-70b-versatile',
            temperature: 0.3,
            stop: null,
            response_format: { type: 'json_object' }
        });

        const content = chatCompletion.choices[0]?.message?.content || '{}';
        const data = JSON.parse(content);

        return NextResponse.json(data);

    } catch (error) {
        console.error('Lookup API Error:', error);
        return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }
}
