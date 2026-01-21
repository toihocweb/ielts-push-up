'use client';

import { useState, useRef, useEffect } from 'react';
import { insertSample } from '@/lib/supabase';
import styles from './admin.module.css';
import Link from 'next/link';

export default function AdminPage() {
    const [part, setPart] = useState('1');
    const [topic, setTopic] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Rich Text Editor State
    const editorRef = useRef<HTMLDivElement>(null);
    const [toolbar, setToolbar] = useState<{ visible: boolean; x: number; y: number } | null>(null);

    // Initial load of answer into div
    useEffect(() => {
        if (editorRef.current && answer !== editorRef.current.innerHTML) {
            if (!editorRef.current.innerHTML) editorRef.current.innerHTML = answer;
        }
    }, []);

    const handleTextChange = () => {
        if (editorRef.current) {
            setAnswer(editorRef.current.innerHTML);
        }
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setToolbar(null);
            return;
        }

        // Check if selection is within our editor
        if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setToolbar({
                visible: true,
                x: rect.left + (rect.width / 2),
                y: rect.top - 10
            });
        } else {
            setToolbar(null);
        }
    };

    const applyHighlight = (color: string) => {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('hiliteColor', false, color);
        setToolbar(null);
        window.getSelection()?.removeAllRanges();
        handleTextChange();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic || !question || !answer) {
            setMessage('Please fill in all fields.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // Save answer as HTML (which allows for highlights)
            const { error } = await insertSample(part, topic, question, answer, null);
            if (error) throw error;
            setMessage('Success! Sample created.');
            setTopic('');
            setQuestion('');
            setAnswer('');
            if (editorRef.current) editorRef.current.innerHTML = '';
        } catch (err) {
            console.error(err);
            setMessage('Error creating sample.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            {/* Floating Toolbar */}
            {toolbar && (
                <div
                    className={styles.highlightToolbar}
                    style={{
                        position: 'fixed',
                        left: toolbar.x,
                        top: toolbar.y,
                        transform: 'translate(-50%, -100%)',
                        flexWrap: 'nowrap',  /* Force single row */
                        maxWidth: 'none',    /* Remove width constraint */
                        whiteSpace: 'nowrap'
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus/selection
                >
                    <button type="button" onClick={() => applyHighlight('#b91c1c')} style={{ background: '#b91c1c' }} className={styles.colorBtn} title="Red" />
                    <button type="button" onClick={() => applyHighlight('#c2410c')} style={{ background: '#c2410c' }} className={styles.colorBtn} title="Orange" />
                    <button type="button" onClick={() => applyHighlight('#a16207')} style={{ background: '#a16207' }} className={styles.colorBtn} title="Yellow" />
                    <button type="button" onClick={() => applyHighlight('#65a30d')} style={{ background: '#65a30d' }} className={styles.colorBtn} title="Lime" />
                    <button type="button" onClick={() => applyHighlight('#15803d')} style={{ background: '#15803d' }} className={styles.colorBtn} title="Green" />
                    <button type="button" onClick={() => applyHighlight('#0f766e')} style={{ background: '#0f766e' }} className={styles.colorBtn} title="Teal" />
                    <button type="button" onClick={() => applyHighlight('#1d4ed8')} style={{ background: '#1d4ed8' }} className={styles.colorBtn} title="Blue" />
                    <button type="button" onClick={() => applyHighlight('#4338ca')} style={{ background: '#4338ca' }} className={styles.colorBtn} title="Indigo" />
                    <button type="button" onClick={() => applyHighlight('#7e22ce')} style={{ background: '#7e22ce' }} className={styles.colorBtn} title="Purple" />
                    <button type="button" onClick={() => applyHighlight('#be185d')} style={{ background: '#be185d' }} className={styles.colorBtn} title="Pink" />
                </div>
            )}

            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <Link href="/" className={styles.backLink}>&larr; Back</Link>
                    <h1 className={styles.title}>Admin: Create Sample</h1>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Speaking Part</label>
                        <select className={styles.select} value={part} onChange={(e) => setPart(e.target.value)}>
                            <option value="1">Part 1</option>
                            <option value="2">Part 2</option>
                            <option value="3">Part 3</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Topic</label>
                        <input className={styles.input} type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Travel, Hometown" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Question</label>
                        <input className={styles.input} type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the question" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Sample Answer (Select text to highlight)</label>
                        <div
                            ref={editorRef}
                            className={styles.richEditor}
                            contentEditable
                            onInput={handleTextChange}
                            onMouseUp={handleMouseUp}
                            onBlur={handleTextChange}
                            data-placeholder="Write your answer here..."
                        />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            * Select text to see highlighting options.
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Create Sample'}
                    </button>

                    {message && <div className={styles.message}>{message}</div>}
                </form>
            </div>
        </main>
    );
}
