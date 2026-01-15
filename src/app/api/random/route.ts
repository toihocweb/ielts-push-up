import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { model } = body;

        const topics = [
            "Idiomatic Expressions (C1/C2)",
            "Business English & Professional Communication",
            "Expressing Opinions & Agreements",
            "Describing Emotions & Feelings",
            "Travel & Cultural Experiences",
            "Technology & Innovation",
            "Academic & Formal Writing Connectors",
            "Slang & Casual Conversation",
            "Phrasal Verbs in Context",
            "Describing Trends & Changes",
            "Negotiation & Persuasion Language",
            "Presentations & Public Speaking",
            "Meetings: Agenda, Updates & Action Items",
            "Interview Skills & Common Questions",
            "Networking & Small Talk for Professionals",
            "Customer Service & Handling Complaints",
            "Conflict Resolution & Diplomacy",
            "Leadership & Management Vocabulary",
            "Project Management & Deliverables",
            "Email Etiquette: Tone & Clarity",
            "Report Writing & Executive Summaries",
            "Storytelling & Narrative Techniques",
            "Debating: Structuring Arguments & Rebuttals",
            "Hedging & Cautious Language (e.g., likely, arguably)",
            "Emphasis & Nuance (intensifiers, softeners)",
            "Grammar for Precision (inversion, cleft sentences)",
            "Collocations for Natural Fluency",
            "Pronunciation: Connected Speech & Intonation",
            "Listening: Fast Speech & Different Accents",
            "Reading: Skimming, Scanning & Inference",
            "Writing: Coherence, Cohesion & Paragraphing",
            "Polite Requests & Saying No Professionally",
            "Cross-Cultural Communication & Etiquette",
            "Media & News: Discussing Current Events",
            "Finance & Economics Basics (inflation, budgeting)"
        ];


        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const timestamp = Date.now();

        const prompt = `
      Timestamp: ${timestamp}
      Topic: ${randomTopic}
      
      Generate a SINGLE, useful, natural English sentence related to the topic above.
      It should be suitable for a Band 8.0 IELTS candidate or a native speaker.
      
      CONSTRAINT: Keep the sentence SHORT (maximum 10 words).
      
      Avoid generic sentences like "How are you?". Give me something specific and interesting.
      
      Output strictly a JSON object with this format:
      {
        "sentence": "The generated sentence here."
      }
      
      Do not output any other text or explanation.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful language learning assistant. specific output format: JSON.' },
                { role: 'user', content: prompt }
            ],
            model: model || 'llama-3.3-70b-versatile',
            temperature: 1.3,
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
