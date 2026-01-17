'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import InstallPrompt from '@/components/InstallPrompt';

interface Result {
  original: string;
  translation: string;
  match_original: string;
  match_translation: string;
}

interface Model {
  id: string;
  object: string;
}

export default function Home() {
  const [mode, setMode] = useState<'vocab' | 'speaking'>('vocab'); // 'vocab' | 'speaking'

  // Vocab State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  // Speaking State
  const [speakingTopic, setSpeakingTopic] = useState('');
  const [speakingBand, setSpeakingBand] = useState('7.0');
  const [speakingPart, setSpeakingPart] = useState('1');
  const [speakingResult, setSpeakingResult] = useState<{ question: string; answer: string; key_features?: string[] } | null>(null);
  const [fineTuneInstruction, setFineTuneInstruction] = useState('');
  const [showFineTune, setShowFineTune] = useState(false);

  // Common State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-4-maverick-17b-128e-instruct');

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
    const handleMouseUp = async () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.toString().trim().length === 0) {
            setPopover(prev => ({ ...prev, visible: false }));
          }
        }, 100);
        return;
      }

      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Capture context (surrounding text)
      let context = '';
      if (selection.anchorNode && selection.anchorNode.parentElement) {
        context = selection.anchorNode.parentElement.textContent || '';
      }

      const x = rect.left + (rect.width / 2);
      const y = rect.top + window.scrollY - 10;

      setPopover({
        visible: true,
        x,
        y,
        text,
        data: null,
        loading: true
      });

      try {
        const response = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, context, model: selectedModel }),
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

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [selectedModel]);

  // Vocab Logic
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setPopover(p => ({ ...p, visible: false }));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: searchQuery, model: selectedModel }),
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      if (data.sentences) {
        setResults(data.sentences);
      } else {
        setError('Invalid response format');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleRandom = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Failed to fetch random word');

      const data = await response.json();
      if (data.sentence) {
        setQuery(data.sentence);
        await performSearch(data.sentence);
      } else {
        throw new Error('No sentence returned from API');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate random word. Please try again.');
      setLoading(false);
    }
  };

  // Speaking Logic
  const handleFineTune = async () => {
    if (!fineTuneInstruction.trim() || !speakingResult) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: speakingTopic, // Keep context
          band: speakingBand,
          part: speakingPart,
          model: selectedModel,
          instruction: fineTuneInstruction,
          question: speakingResult.question,
          original_answer: speakingResult.answer
        }),
      });

      if (!response.ok) throw new Error('Failed to fine-tune answer');

      const data = await response.json();
      setSpeakingResult(data);
      setFineTuneInstruction('');
      setShowFineTune(false);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakingGenerate = async () => {
    if (!speakingTopic.trim()) return;

    setLoading(true);
    setError('');
    setSpeakingResult(null);

    try {
      const response = await fetch('/api/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: speakingTopic,
          band: speakingBand,
          part: speakingPart,
          model: selectedModel
        }),
      });

      if (!response.ok) throw new Error('Failed to generate speaking');

      const data = await response.json();
      setSpeakingResult(data);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className={styles.highlight}>{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <main className={styles.container}>
      <InstallPrompt />
      {popover.visible && (
        <div
          className={styles.popover}
          style={{
            left: popover.x,
            top: popover.y,
            transform: 'translate(-50%, -100%) translateY(-10px)'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
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
        <h1 className={styles.title}>IELTS Push-Up</h1>
        <div className={styles.modeSwitcher}>
          <div
            className={styles.glider}
            style={{ transform: mode === 'vocab' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button
            className={`${styles.modeBtn} ${mode === 'vocab' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('vocab')}
          >
            Vocabulary
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'speaking' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('speaking')}
          >
            Speaking
          </button>
        </div>
        <p className={styles.subtitle}>Supercharge your vocabulary. Boost your Band Score.</p>
      </div>

      {mode === 'vocab' ? (
        <div key="vocab" className={styles.tabContent}>
          <div className={styles.searchWrapper}>
            <form onSubmit={handleSearch} className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter a word or phrase..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className={styles.searchIcon} aria-label="Search">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <button type="button" className={styles.shuffleBtn} onClick={handleRandom} title="Random IELTS Word">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l5 5M4 4l5 5" />
                </svg>
              </button>
            </form>
          </div>

          {loading && (
            <div className={styles.resultsGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeleton}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} style={{ width: '70%' }} />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>
          )}

          <div className={styles.resultsGrid}>
            {results.map((item, index) => (
              <div
                key={index}
                className={styles.card}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className={styles.sentence}>
                  {highlightText(item.original, item.match_original || query)}
                </p>
                <p className={styles.translation}>
                  {highlightText(item.translation, item.match_translation || '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div key="speaking" className={styles.tabContent}>
          <div className={styles.searchWrapper}>
            <div className={styles.speakingForm}>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter a Topic (e.g., Hometown, Technology, Music)"
                value={speakingTopic}
                onChange={(e) => setSpeakingTopic(e.target.value)}
              />

              <div className={styles.row}>
                <div className={styles.selectGroup}>
                  <select
                    className={styles.select}
                    value={speakingBand}
                    onChange={(e) => setSpeakingBand(e.target.value)}
                  >
                    <option value="6.0">Band 6.0</option>
                    <option value="6.5">Band 6.5</option>
                    <option value="7.0">Band 7.0</option>
                    <option value="7.5">Band 7.5</option>
                    <option value="8.0">Band 8.0</option>
                    <option value="9.0">Band 9.0</option>
                  </select>
                </div>
                <div className={styles.selectGroup}>
                  <select
                    className={styles.select}
                    value={speakingPart}
                    onChange={(e) => setSpeakingPart(e.target.value)}
                  >
                    <option value="1">Part 1</option>
                    <option value="2">Part 2</option>
                    <option value="3">Part 3</option>
                  </select>
                </div>
              </div>

              <button className={styles.generateBtn} onClick={handleSpeakingGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Answer'}
              </button>
            </div>
          </div>

          {loading && (
            <div className={styles.speakingResult}>
              <div className={styles.skeleton}>
                <div className={styles.skeletonLine} style={{ width: '40%', marginBottom: '1rem' }} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} style={{ width: '80%' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>
          )}

          {speakingResult && (
            <div className={styles.speakingResult}>
              <span className={styles.questionLabel}>Question</span>
              <p className={styles.question}>{speakingResult.question}</p>

              <span className={styles.answerLabel}>Band {speakingBand} Answer</span>
              <div className={styles.answer}>
                {speakingResult.answer}
              </div>

              {speakingResult.key_features && (
                <div className={styles.features}>
                  <p className={styles.featureTitle}>Key Features:</p>
                  <div className={styles.featureList}>
                    {speakingResult.key_features.map((feature: string, i: number) => (
                      <span key={i} className={styles.featureTag}>{feature}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.fineTuneSection}>
                {!showFineTune ? (
                  <button
                    className={styles.fineTuneBtn}
                    onClick={() => setShowFineTune(true)}
                  >
                    Fine-tune Answer
                  </button>
                ) : (
                  <div className={styles.fineTuneForm}>
                    <textarea
                      className={styles.fineTuneInput}
                      placeholder="e.g., Make it more formal, Add an idiom about rain..."
                      value={fineTuneInstruction}
                      onChange={(e) => setFineTuneInstruction(e.target.value)}
                    />
                    <div className={styles.fineTuneActions}>
                      <button
                        className={styles.generateBtn}
                        onClick={handleFineTune}
                        disabled={loading}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        {loading ? 'Refining...' : 'Regenerate'}
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setShowFineTune(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
