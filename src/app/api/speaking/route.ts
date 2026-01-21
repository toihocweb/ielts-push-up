import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { topic, band, part, model, instruction, question, original_answer, regenerate_type } = await request.json();

        if (regenerate_type !== 'answer_only' && ((!topic && !instruction) || !band || !part)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Band Descriptor Guidelines (simplified for prompt)
        const bandCriteria = {
            '6.0': "Competent. Mix of simple and complex structures. meaning is clear but with some inaccuracies. Vocabulary is sufficient.",
            '7.0': "Good. Frequent error-free sentences. Uses less common and idiomatic items with some awareness of style. Flexible.",
            '8.0': "Very Good. Fluent and sophisticated. Wide range of structures. Majority of sentences are error-free. Occasional minor errors only.",
            '9.0': "Expert. Native-like fluency. Precise and accurate. Full flexibility. No noticeable errors."
        };

        const specificCriteria = bandCriteria[band as keyof typeof bandCriteria] || bandCriteria['7.0'];

        let prompt;

        if (instruction && question && original_answer) {
            // Fine-tuning mode (EXISTING)
            prompt = `
      Act as an expert IELTS Examiner.
      Task: Rewrite the following IELTS Speaking Part ${part} answer based on the user's instruction: "${instruction}".
      
      **Context:**
      - Question: "${question}"
      - Original Answer: "${original_answer}"
      - Target Band Score: ${band}

      **Criteria for Band ${band}:**
      ${specificCriteria}

      **Requirements:**
      1. **Keep the Question Identical**: The question must be the same as provided.
      2. **Revised Answer**: A spoken response (natural, conversational) that incorporates the user's instruction while STRICTLY maintaining the vocabulary, grammar, and fluency level for **Band ${band}**.
      3. **Key Features**: Update the list of 3-4 keywords or grammatical structures to reflect the NEW answer.

      Return STRICTLY a JSON object with this format (no other text):
      {
        "question": "${question}",
        "answer": "...",
        "key_features": ["...", "..."]
      }
    `;
        } else if (regenerate_type === 'answer_only' && question) {
            // Regenerate Answer Only mode (NEW)
            prompt = `
             Act as an expert IELTS Examiner.
             Task: Provide a DIFFERENT Sample Answer for the following IELTS Speaking Part ${part} question.
             
             **Context:**
             - Question: "${question}"
             - Target Band Score: ${band}
       
             **Criteria for Band ${band}:**
             ${specificCriteria}
       
             **Requirements:**
             1. **Keep the Question Identical**: The question must be the same as provided: "${question}".
             2. **New Answer**: A spoken response (natural, conversational) that matches the **Band ${band}** score. It should be different from typical/generic answers if possible.
             3. **Key Features**: List 3-4 keywords or grammatical structures used in this new answer.
       
             Return STRICTLY a JSON object with this format (no other text):
             {
               "question": "${question}",
               "answer": "...",
               "key_features": ["...", "..."]
             }
           `;
        } else {
            // New Generation mode (UPDATED for Randomness)
            const seed = Date.now(); // Simple randomness
            prompt = `
      Act as an expert IELTS Examiner.
      Task: Generate a UNIQUE IELTS Speaking Part ${part} question about the topic: "${topic}".
      Then, provide a Sample Answer that strictly matches a **Band ${band}** score.

      **Random Seed:** ${seed} (Ensure the question is different from previous valid questions about "${topic}")

      **Criteria for Band ${band}:**
      ${specificCriteria}

      **Requirements:**
      1. **Question**: An authentic Part ${part} question related to "${topic}". Try to vary the angle (e.g., instead of just "Do you like...", ask "How has X changed...", "Is X popular...", etc.).
      2. **Answer**: A spoken response (natural, conversational) that demonstrates the exact level of vocabulary, grammar, and fluency for Band ${band}.
      3. **Key Features**: Briefly list 3-4 keywords or grammatical structures used in the answer.

      Return STRICTLY a JSON object with this format (no other text):
      {
        "question": "...",
        "answer": "...",
        "key_features": ["...", "..."]
      }
    `;
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are an IELTS Examiner. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            model: model || 'llama-3.3-70b-versatile',
            temperature: 0.9, // Increased temperature for more randomness
            stop: null,
            response_format: { type: 'json_object' }
        });

        const content = chatCompletion.choices[0]?.message?.content || '{}';
        const data = JSON.parse(content);

        return NextResponse.json(data);

    } catch (error) {
        console.error('Speaking API Error:', error);
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }
}
