import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phrase, model } = body;

    if (!phrase) {
      return NextResponse.json({ error: 'Phrase is required' }, { status: 400 });
    }

    const prompt = `
      Generate 5 distinct, **IELTS Academic level** English sentences using the phrase or word: "${phrase}".
      The input "${phrase}" can be in English or Vietnamese.
      The sentences should be sophisticated, suitable for an IELTS Writing or Speaking exam (Band 7+).
      
      For each sentence:
      1. "original": The English sentence.
      2. "translation": The Vietnamese translation.
      3. "match_original": The exact substring within the "original" English sentence that corresponds to the meaning of "${phrase}".
      4. "match_translation": The exact substring within the "translation" Vietnamese sentence that corresponds to the meaning of "${phrase}".

      Return STRICTLY a JSON object with this format (no other text):
      {
        "sentences": [
          { 
            "original": "The kids were fighting over the toy.", 
            "translation": "Những đứa trẻ đã đánh nhau vì đồ chơi đó.",
            "match_original": "fighting",
            "match_translation": "đánh nhau"
          }
        ]
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful language learning assistant. specific output format: JSON.' },
        { role: 'user', content: prompt }
      ],
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.7,
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
