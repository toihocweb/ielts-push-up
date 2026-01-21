'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './samples.module.css';
import { fetchSamples, SampleQuestion } from '@/lib/supabase';
import Link from 'next/link';


export default function SamplesPage() {
    const [samplePart, setSamplePart] = useState('1');
    const [samples, setSamples] = useState<SampleQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedSampleId, setExpandedSampleId] = useState<number | null>(null);

    const popoverRef = useRef<HTMLDivElement>(null);

    const [popover, setPopover] = useState<{
        visible: boolean;
        x: number;
        y: number;
        text: string;
        data: {
            ipa?: string;
            part_of_speech?: string;
            meaning?: string;
            translation?: string;
            synonyms?: string[];
        } | null;
        loading: boolean;
    }>({
        visible: false,
        x: 0,
        y: 0,
        text: '',
        data: null,
        loading: false
    });

    useEffect(() => {
        const loadSamples = async () => {
            setLoading(true);
            try {
                const { data, error } = await fetchSamples(samplePart);
                if (error) console.error('Error fetching samples:', error);
                if (data) setSamples(data as SampleQuestion[]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadSamples();
    }, [samplePart]);

    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        text: string;
        context: string;
    } | null>(null);

    // Context Menu Handler
    const handleContextMenu = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) return;

        // Allow default menu for inputs/textareas if we ever add them
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        e.preventDefault(); // Block default browser menu
        const text = selection.toString().trim();
        const context = selection.anchorNode?.parentElement?.textContent || '';

        setContextMenu({
            visible: true,
            x: e.clientX, // Mouse coordinates relative to viewport
            y: e.clientY,
            text,
            context
        });
        // Hide any existing result popover when opening new menu
        setPopover(prev => ({ ...prev, visible: false }));
    };

    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Close menus on click elsewhere
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Close context menu if clicked outside
            if (contextMenu?.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }

            // Close popover if clicked outside
            if (popover.visible && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopover(prev => ({ ...prev, visible: false }));
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [contextMenu, popover.visible]);

    const handleLookup = async () => {
        if (!contextMenu) return;

        const { text, context, x, y } = contextMenu;
        setContextMenu(null); // Hide menu

        // Position popover near the context menu click
        // Adjust y to account for scroll since popover uses absolute positioning relative to container usually?
        // Wait, the popover in original code used rect.top + window.scrollY. 
        // e.clientY is viewport relative. So we need window.scrollY.
        const popX = x;
        const popY = y + window.scrollY;

        setPopover({
            visible: true,
            x: popX,
            y: popY,
            text,
            data: null,
            loading: true
        });

        try {
            const response = await fetch('/api/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, context, model: 'meta-llama/llama-4-maverick-17b-128e-instruct' }),
            });
            const data = await response.json();
            setPopover(prev => {
                if (prev.text !== text) return prev;
                return { ...prev, loading: false, data };
            });
        } catch (err) {
            console.error(err);
            setPopover(prev => ({ ...prev, loading: false, visible: false }));
        }
    };

    return (
        <main className={styles.container} onContextMenu={handleContextMenu}>
            {/* Custom Context Menu */}
            {contextMenu && contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className={styles.contextMenu}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button onClick={handleLookup} className={styles.contextMenuBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        Look up "{contextMenu.text.length > 15 ? contextMenu.text.slice(0, 15) + '...' : contextMenu.text}"
                    </button>
                </div>
            )}

            {popover.visible && (
                <div
                    ref={popoverRef}
                    className={styles.popover}
                    style={{
                        left: popover.x,
                        top: popover.y,
                        transform: 'translate(-50%, -100%) translateY(-10px)'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setPopover(p => ({ ...p, visible: false }))}
                        style={{ position: 'absolute', top: 5, right: 8, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                        &times;
                    </button>

                    {popover.loading ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Looking up definitions...</div>
                    ) : popover.data ? (
                        <>
                            <div className={styles.popoverHeader}>
                                <span className={styles.popoverWord}>{popover.text}</span>
                                {popover.data.ipa && <span className={styles.popoverIpa}>{popover.data.ipa}</span>}
                            </div>
                            {popover.data.part_of_speech && <span className={styles.popoverType}>{popover.data.part_of_speech}</span>}
                            <div className={styles.popoverBody}>
                                {popover.data.meaning}
                                {popover.data.translation && (
                                    <div style={{ marginTop: '0.5rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                        {popover.data.translation}
                                    </div>
                                )}
                                {popover.data.synonyms && popover.data.synonyms.length > 0 && (
                                    <div className={styles.popoverSynonyms}>
                                        <span className={styles.synonymsLabel}>Synonyms:</span>
                                        <div className={styles.synonymsList}>
                                            {popover.data.synonyms.map((syn, i) => (
                                                <span key={i} className={styles.synonymTag}>{syn}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#ef4444' }}>Failed to load definition</div>
                    )}
                </div>
            )}

            <div className={styles.hero}>
                <h1 className={styles.title}>Lingo Groq</h1>
                <Link href="/" className={styles.backLink}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Practice
                </Link>
            </div>

            <div className={styles.tabContent}>
                <div className={styles.filterGroup}>
                    {['1', '2', '3'].map((p) => (
                        <button
                            key={p}
                            className={`${styles.filterBtn} ${samplePart === p ? styles.filterBtnActive : ''}`}
                            onClick={() => setSamplePart(p)}
                        >
                            Part {p}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>Loading samples...</div>
                ) : (
                    <div className={styles.resultsGrid}>
                        {samples.map((sample) => (
                            <div key={sample.id} className={styles.card}>
                                <div
                                    className={styles.sampleHeader}
                                    onClick={() => setExpandedSampleId(expandedSampleId === sample.id ? null : sample.id)}
                                >
                                    <span className={styles.sampleTopic}>{sample.topic}</span>
                                    <h3 className={styles.sampleQuestion}>{sample.question}</h3>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: expandedSampleId === sample.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>

                                {expandedSampleId === sample.id && (
                                    <div className={styles.sampleDetails}>
                                        <div className={styles.sampleAnswerSection} style={{ position: 'relative' }}>
                                            <span className={styles.answerLabel}>Sample Answer:</span>

                                            <div style={{ position: 'relative' }}>
                                                {/* Text Layer - Render HTML/Highlights */}
                                                <div
                                                    className={styles.sampleAnswer}
                                                    dangerouslySetInnerHTML={{ __html: sample.answer }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {samples.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No samples found for Part {samplePart}.</div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

