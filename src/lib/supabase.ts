
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SampleQuestion {
    id: number;
    part: string;
    topic: string;
    question: string;
    answer: string;
    annotations?: any;
}

// Mock data is removed in favor of real DB
// export const MOCK_SAMPLES: SampleQuestion[] = [
//     { id: 1, part: '1', topic: 'Hometown', question: 'Where is your hometown?', sample_answer: "My hometown is Hanoi, the capital city of Vietnam. It's a bustling metropolis with a rich history and culture." },
//     { id: 2, part: '1', topic: 'Hometown', question: 'What do you like most about your hometown?', sample_answer: "I love the street food there. It's incredibly diverse and delicious, especially the Pho." },
//     { id: 3, part: '2', topic: 'Travel', question: 'Describe a memorable trip you took.', sample_answer: "One memorable trip was to Da Nang..." },
//     { id: 4, part: '3', topic: 'Technology', question: 'How has technology changed education?', sample_answer: "Technology has revolutionized education by making information more accessible..." },
// ];

export async function saveUserAnswer(questionId: number, answer: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials missing. Answer not saved to DB.');
        return { error: 'Supabase not configured' };
    }

    const { data, error } = await supabase
        .from('user_answers')
        .insert([
            { question_id: questionId, answer: answer, created_at: new Date() }
        ]);

    return { data, error };
}

export async function insertSample(part: string, topic: string, question: string, answer: string, annotations: any) {
    const { data, error } = await supabase
        .from('samples')
        .insert([
            { part, topic, question, answer, annotations }
        ])
        .select();
    return { data, error };
}

export async function fetchSamples(part: string) {
    const { data, error } = await supabase
        .from('samples')
        .select('*')
        .eq('part', part)
        .order('created_at', { ascending: false });
    return { data, error };
}
