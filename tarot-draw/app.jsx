const { useEffect, useMemo, useRef, useState } = React;

// (No external textures needed in text-only mode)

// Tarot deck definition
const MAJOR_ARCANA = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
];

const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const RANKS = [
  "Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"
];

function buildDeck() {
  const deck = [];
  for (let i = 0; i < MAJOR_ARCANA.length; i++) {
    deck.push({ id: i, code: `MA${String(i).padStart(2, "0")}`, arcana: "Major", name: MAJOR_ARCANA[i] });
  }
  let id = MAJOR_ARCANA.length;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: id++, code: `${suit.substring(0,2).toUpperCase()}-${rank}`, arcana: "Minor", name: `${rank} of ${suit}`, suit, rank });
    }
  }
  return deck;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleWithOrientation(arr) {
  // Shuffle and assign upright/reversed orientation per card
  const order = shuffle(arr);
  return order.map((c) => ({ ...c, reversed: Math.random() < 0.5 }));
}

function parsePositions(input, deckLen) {
  const nums = (input.match(/\d+/g) || [])
    .map((n) => parseInt(n, 10))
    .filter((n) => n >= 1 && n <= deckLen);
  const seen = new Set();
  const res = [];
  for (const n of nums) {
    if (!seen.has(n)) { seen.add(n); res.push(n - 1); }
  }
  return res;
}

function TarotApp() {
  const fullDeck = useMemo(() => buildDeck(), []);
  const [shuffledDeck, setShuffledDeck] = useState(() => shuffleWithOrientation(fullDeck));
  const [input, setInput] = useState("");
  const [dealt, setDealt] = useState([]);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [showDeck, setShowDeck] = useState(false);
  const [deckAnimating, setDeckAnimating] = useState(false);
  const [animDeck, setAnimDeck] = useState([]);
  const animTimersRef = useRef([]);
  const [drawCount, setDrawCount] = useState(5);

  const doShuffle = () => {
    setDealt([]);
    setInput("");
    setError(null);
    // clear any in-flight timers from a previous animation
    animTimersRef.current.forEach((id) => clearTimeout(id));
    animTimersRef.current = [];
    const targetDeck = shuffleWithOrientation(fullDeck);
    if (!showDeck) {
      setShuffledDeck(targetDeck);
      return;
    }
    // Animate from current shuffledDeck to targetDeck over 1s in 7 steps.
    const STEPS = 7;
    const INTERVAL = Math.round(1000 / STEPS);
    const startDeck = shuffledDeck.slice();
    const startIndex = new Map(startDeck.map((c, i) => [c.id, i]));
    const targetIndex = new Map(targetDeck.map((c, i) => [c.id, i]));
    const startOrient = new Map(startDeck.map((c) => [c.id, !!c.reversed]));
    const targetOrient = new Map(targetDeck.map((c) => [c.id, !!c.reversed]));

    setDeckAnimating(true);
    setAnimDeck(startDeck.map((c) => ({ ...c })));

    for (let s = 1; s <= STEPS; s++) {
      const id = setTimeout(() => {
        const progress = s / STEPS;
        // Compute a sortable key per card that linearly interpolates its index toward the target
        const withKeys = startDeck.map((c) => {
          const si = startIndex.get(c.id);
          const ti = targetIndex.get(c.id);
          const key = si + (ti - si) * progress + (c.id * 1e-6);
          // Orientation flips for cards whose final orientation differs: flip each step (visual) and land on target at the end
          const so = startOrient.get(c.id);
          const to = targetOrient.get(c.id);
          let rev = so;
          if (so !== to) rev = (s < STEPS) ? (s % 2 === 1 ? !so : so) : to;
          return { card: c, key, reversed: rev };
        });
        withKeys.sort((a, b) => a.key - b.key);
        const next = withKeys.map((k) => ({ ...k.card, reversed: k.reversed }));
        setAnimDeck(next);
        if (s === STEPS) {
          setShuffledDeck(targetDeck);
          setDeckAnimating(false);
        }
      }, s * INTERVAL);
      animTimersRef.current.push(id);
    }
  };

  const dealFromPicks = (picks) => {
    const seen = new Set();
    const out = [];
    for (const idx0 of picks) {
      if (idx0 < 0 || idx0 >= shuffledDeck.length) continue;
      if (seen.has(idx0)) continue;
      seen.add(idx0);
      const card = shuffledDeck[idx0];
      out.push({ card, reversed: !!card.reversed, position: idx0 + 1 });
    }
    if (out.length === 0) {
      setError("Enter positions like: 1, 5, 10 (within 1-78)");
      return;
    }
    setDealt(out);
    setError(null);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const onDeal = () => {
    const picks = parsePositions(input, shuffledDeck.length);
    if (picks.length === 0) {
      setError("Enter positions like: 1, 5, 10 (within 1-78)");
      return;
    }
    dealFromPicks(picks);
  };

  const onDrawRandom = () => {
    const n = Math.max(1, Math.min(31, parseInt(drawCount, 10) || 1));
    const max = shuffledDeck.length;
    const picksSet = new Set();
    const picks = [];
    while (picks.length < n && picksSet.size < max) {
      const pos1 = Math.floor(Math.random() * max) + 1; // 1-based
      if (!picksSet.has(pos1)) {
        picksSet.add(pos1);
        picks.push(pos1 - 1); // store as 0-based
      }
    }
    const text = picks.map((i) => i + 1).join(', ');
    setInput(text);
    dealFromPicks(picks);
  };

  const onReset = () => {
    // stop any ongoing shuffle animation
    animTimersRef.current.forEach((id) => clearTimeout(id));
    animTimersRef.current = [];
    setDeckAnimating(false);
    setAnimDeck([]);

    // reset dealt/input/errors
    setDealt([]);
    setInput("");
    setError(null);

    // restore deck to original unshuffled, upright order
    setShuffledDeck(fullDeck.map((c) => ({ ...c, reversed: false })));
  };

  useEffect(() => {
    // already shuffled on load via useState init
  }, []);

  return (
    <div className="theme-dark min-h-screen w-full">
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 glass-panel">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-4">
            <div className="text-xl font-semibold tracking-wide">Tarot Draw</div>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="https://text.is/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                title="Open notepad"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="M9 7h6M7 11h10M7 15h10" />
                </svg>
                <span className="sr-only">Notepad</span>
              </a>
              <button onClick={doShuffle} className="btn btn-primary" title="Shuffle the full deck">Shuffle</button>
              <button onClick={onReset} className="btn btn-outline" title="Reset to unshuffled deck">Reset</button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          {/* Controls */}
          <section className="mb-8">
            <div className="flex flex-col gap-3">
              <label className="block">
                <div className="mb-2 text-sm" style={{color: 'var(--text-muted)'}}>Pick positions (comma/space separated)</div>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onDeal(); }}
                  placeholder="e.g., 1, 3, 7, 10"
                  className="w-full px-4 py-2 panel outline-none"
                />
              </label>

              <div className="flex items-center gap-2">
                <button onClick={onDeal} className="btn btn-primary" title="Deal the selected cards">Deal</button>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-sm" style={{color: 'var(--text-muted)'}}>Draw</label>
                  <select
                    value={drawCount}
                    onChange={(e) => setDrawCount(parseInt(e.target.value, 10))}
                    className="panel px-2 py-2 text-sm"
                    title="How many positions to draw"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button onClick={onDrawRandom} className="btn btn-outline" title="Fill with N random positions and deal">Draw random</button>
                </div>
              </div>
            </div>
            {error && <div className="mt-3 text-rose-300 text-sm">{error}</div>}
            <p className="mt-3 text-sm" style={{color: 'var(--text-muted)'}}>Tip: positions are from the current shuffled order (1-78).</p>
          </section>

          {/* Spread output (text only) */}
          <section ref={tableRef} className="mb-10 scroll-anchor">
            <h2 className="text-lg font-semibold mb-2">Spread</h2>
            {dealt.length === 0 ? (
              <div className="text-sm" style={{color: 'var(--text-muted)'}}>No cards dealt yet.</div>
            ) : (
              <div className="panel p-3 text-sm">
                {dealt.map(d => `${d.card.name}${d.reversed ? ' (Reversed)' : ''}`).join(', ')}
              </div>
            )}
          </section>

          {/* Deck order (text) as spoiler */}
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold">Deck Order (1-78)</h2>
              <button
                className="btn btn-outline"
                onClick={() => setShowDeck((v) => !v)}
                title={showDeck ? 'Hide deck order' : 'Show deck order'}
              >
                {showDeck ? 'Hide' : 'Show'}
              </button>
            </div>
            {showDeck ? (
              <div className="panel p-3 text-sm" style={{lineHeight: 1.6}}>
                {(deckAnimating ? animDeck : shuffledDeck).map((c, idx) => (
                  <div
                    key={c.id}
                    className={deckAnimating ? 'shuffle-tick' : ''}
                    style={deckAnimating ? { animation: 'shufflePulse 0.12s ease-in-out' } : undefined}
                  >
                    {idx + 1}. {c.name}{c.reversed ? ' (Reversed)' : ''}
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel p-3 text-sm" style={{color: 'var(--text-muted)'}}>
                Hidden (spoiler)
              </div>
            )}
          </section>
        </main>

        <footer className="px-4 py-10 text-center text-xs text-zinc-300">
          Card data is generic; no copyrighted card art is used.
        </footer>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TarotApp />);
