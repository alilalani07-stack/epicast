import { useState, useRef, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import {
  Menu, Search, Command, X, CornerDownLeft,
  MapPin, FileText, AlertTriangle, LayoutDashboard, Clock, ArrowRight,
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AUTHORITY_NAV, CLINIC_NAV } from './navConfig.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

function flatten(nav) {
  return nav.flatMap((g) => g.items);
}

function useCurrentLabel() {
  const { pathname } = useLocation();
  const all = [...flatten(AUTHORITY_NAV), ...flatten(CLINIC_NAV)];
  const match = all.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'));
  return match?.label || 'Overview';
}

// --- Fuzzy search utility ---
// Tokenizes query, scores items by how many tokens match (label > keywords),
// and ranks exact matches highest. Handles word-order independence and typos
// up to 2 character edits for short words.
function fuseSearch(items, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return items.slice(0, 10).map((i) => ({ ...i, score: 0 }));

  const tokens = query.split(/\s+/).filter(Boolean);
  const scored = items.map((item) => {
    let score = 0;
    const label = item.label.toLowerCase();
    const keywords = item.keywords.toLowerCase();

    for (const token of tokens) {
      // Exact label match = highest score
      if (label === token) score += 100;
      else if (label.startsWith(token)) score += 80;
      else if (label.includes(token)) score += 60;
      // Keyword match
      else if (keywords.includes(token)) score += 40;
      // Fuzzy: allow 1 char diff for tokens <= 4, 2 chars for longer
      else {
        const maxDist = token.length <= 4 ? 1 : 2;
        const minLen = Math.max(label.length, keywords.length);
        const haystacks = [label, keywords];
        for (const hay of haystacks) {
          for (let i = 0; i <= hay.length - token.length + maxDist; i++) {
            const slice = hay.slice(i, i + token.length + maxDist);
            let dist = 0;
            for (let j = 0; j < token.length; j++) {
              if (!slice.includes(token[j])) dist++;
            }
            if (dist <= maxDist) {
              score += 20 - dist * 5;
              break;
            }
          }
        }
      }
    }
    return { ...item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

// --- Recent searches (localStorage) ---
const RECENT_KEY = 'epicast-search-recent';
function getRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function pushRecent(item) {
  try {
    const prev = getRecent().filter((r) => r.id !== item.id);
    const next = [{ id: item.id, label: item.label, to: item.to, category: item.category }, ...prev].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

// --- Search index ---
const CATEGORY_META = {
  Pages: { icon: LayoutDashboard, order: 1 },
  Diseases: { icon: AlertTriangle, order: 2 },
  Areas: { icon: MapPin, order: 3 },
  Recent: { icon: Clock, order: 0 },
};

function useSearchIndex() {
  return useMemo(() => {
    const pages = [...flatten(AUTHORITY_NAV), ...flatten(CLINIC_NAV)].map((n) => ({
      id: `page-${n.to}`,
      label: n.label,
      category: 'Pages',
      to: n.to,
      keywords: n.label.toLowerCase(),
    }));

    const diseases = [
      { id: 'dengue', label: 'Dengue', category: 'Diseases', to: '/authority/reports?filter=dengue', keywords: 'dengue fever mosquito breakbone' },
      { id: 'malaria', label: 'Malaria', category: 'Diseases', to: '/authority/reports?filter=malaria', keywords: 'malaria plasmodium mosquito' },
      { id: 'chikungunya', label: 'Chikungunya', category: 'Diseases', to: '/authority/reports?filter=chikungunya', keywords: 'chikungunya virus joint pain' },
      { id: 'typhoid', label: 'Typhoid', category: 'Diseases', to: '/authority/reports?filter=typhoid', keywords: 'typhoid salmonella fever' },
      { id: 'covid19', label: 'COVID-19', category: 'Diseases', to: '/authority/reports?filter=covid-19', keywords: 'covid coronavirus sars covid19' },
      { id: 'tuberculosis', label: 'Tuberculosis', category: 'Diseases', to: '/authority/reports?filter=tuberculosis', keywords: 'tb tuberculosis lung' },
      { id: 'influenza', label: 'Influenza', category: 'Diseases', to: '/authority/reports?filter=influenza', keywords: 'flu influenza h1n1 fever' },
      { id: 'leptospirosis', label: 'Leptospirosis', category: 'Diseases', to: '/authority/reports?filter=leptospirosis', keywords: 'leptospirosis rat urine' },
    ];

    const areas = [
      { id: 'area-madhapur', label: 'Madhapur', category: 'Areas', to: '/authority/dashboard?area=Madhapur', keywords: 'madhapur hyderabad tech city hitec' },
      { id: 'area-charminar', label: 'Charminar', category: 'Areas', to: '/authority/dashboard?area=Charminar', keywords: 'charminar old city hyderabad monument' },
      { id: 'area-banjara', label: 'Banjara Hills', category: 'Areas', to: '/authority/dashboard?area=Banjara+Hills', keywords: 'banjara hills hyderabad upscale' },
      { id: 'area-secunderabad', label: 'Secunderabad', category: 'Areas', to: '/authority/dashboard?area=Secunderabad', keywords: 'secunderabad railway' },
      { id: 'area-kukatpally', label: 'Kukatpally', category: 'Areas', to: '/authority/dashboard?area=Kukatpally', keywords: 'kukatpally metro' },
      { id: 'area-gachibowli', label: 'Gachibowli', category: 'Areas', to: '/authority/dashboard?area=Gachibowli', keywords: 'gachibowli financial district' },
      { id: 'area-jubilee', label: 'Jubilee Hills', category: 'Areas', to: '/authority/dashboard?area=Jubilee+Hills', keywords: 'jubilee hills film nagar' },
      { id: 'area-uppal', label: 'Uppal', category: 'Areas', to: '/authority/dashboard?area=Uppal', keywords: 'uppal metro stadium' },
    ];

    return [...pages, ...diseases, ...areas];
  }, []);
}

// --- Click outside hook ---
function useClickOutside(ref, handler) {
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, handler]);
}

// --- Command Palette ---
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState(getRecent);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const modalRef = useRef(null);
  const items = useSearchIndex();

  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => {
    if (!deferredQuery.trim()) {
      const rec = recent.map((r) => ({ ...r, score: 0, category: 'Recent' }));
      return rec.length ? rec : items.slice(0, 8).map((i) => ({ ...i, score: 0 }));
    }
    return fuseSearch(items, deferredQuery);
  }, [items, deferredQuery, recent]);

  useClickOutside(modalRef, onClose);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setRecent(getRecent());
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    setSelectedIndex((idx) => (filtered.length ? Math.min(idx, filtered.length - 1) : 0));
  }, [filtered.length]);

  const handleSelect = useCallback(
    (item) => {
      if (!item) return;
      pushRecent(item);
      navigate(item.to);
      onClose();
    },
    [navigate, onClose]
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (!filtered.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, filtered, selectedIndex, handleSelect]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  if (!open) return null;

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Results';
    acc[cat] = acc[cat] || [];
    acc[cat].push(item);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99)
  );

  const hasQuery = deferredQuery.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-start justify-center pt-[12vh] sm:pt-[15vh] bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl mx-4 bg-canvas rounded-xl shadow-2xl border border-line overflow-hidden flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <Search className="w-5 h-5 text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search areas, diseases, pages…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-faint"
            aria-label="Search"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded hover:bg-surface-2 text-mute"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-6 rounded bg-surface-2 border border-line text-[11px] text-faint">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {filtered.length === 0 && hasQuery ? (
            <div className="px-4 py-8 text-center">
              <div className="text-mute text-[14px] mb-4">No results for "{deferredQuery}"</div>
              <div className="text-[12px] text-faint mb-2">Try searching for</div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Dengue', 'Madhapur', 'Reports', 'COVID-19'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-2.5 py-1 rounded-md bg-surface-2 border border-line text-[13px] text-ink hover:bg-surface"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            categories.map((cat) => {
              const Icon = CATEGORY_META[cat]?.icon || FileText;
              return (
                <div key={cat} className="mb-1">
                  <div className="px-4 py-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-faint font-semibold">
                    <Icon className="w-3.5 h-3.5" />
                    {cat}
                  </div>
                  {grouped[cat].map((item) => {
                    const globalIdx = filtered.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={globalIdx}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                          isSelected ? 'bg-surface-2' : 'hover:bg-surface-2/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px] text-ink truncate">{item.label}</span>
                          {item.category === 'Recent' && (
                            <Clock className="w-3 h-3 text-faint shrink-0" />
                          )}
                        </div>
                        {isSelected && <CornerDownLeft className="w-4 h-4 text-mute shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-line flex items-center gap-4 text-[11px] text-faint">
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-surface-2 border border-line">↑</kbd>
            <kbd className="px-1 rounded bg-surface-2 border border-line">↓</kbd>
            <span>to navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-surface-2 border border-line">↵</kbd>
            <span>to select</span>
          </span>
          {hasQuery && (
            <span className="ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Navbar ---

export default function Navbar({ onMenuClick }) {
  const label = useCurrentLabel();
  const { user } = useAuth();
  const display = user?.displayName || user?.email || 'EC';
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[1200] h-[72px] glass border-b border-line">
        <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-10 h-10 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-surface-2"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[14px]">
            <Link to="/" className="text-mute hover:text-ink transition-colors">EpiCast</Link>
            <span className="text-line-strong">/</span>
            <span className="text-ink font-medium">{label}</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2 h-10 px-3.5 bg-surface border border-line rounded-lg text-[13.5px] text-mute hover:text-ink hover:border-line-strong transition-all shadow-soft min-w-[280px]"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
            <span>Search areas, diseases, alerts…</span>
            <kbd className="ml-auto inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-surface-2 border border-line text-[11px] text-faint">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          {/* Notification bell and profile avatar removed per request */}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}