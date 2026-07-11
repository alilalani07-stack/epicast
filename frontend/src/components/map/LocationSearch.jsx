import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Loader2, LocateFixed } from 'lucide-react';
import clsx from 'clsx';
import { searchLocations } from '../../services/location.service.js';
import useDebounce from '../../hooks/useDebounce.js';

/**
 * Reusable location search with autocomplete dropdown.
 *
 * Props:
 *   placeholder?       Input placeholder.
 *   defaultValue?      Initial text in the input.
 *   onSelect(result)   Called with { name, label, lat, lng } on pick.
 *   onClear?()         Called when the user clears the input.
 *   showCurrentLocation? Show a "Use current location" button (default true).
 *   compact?           Smaller height variant.
 *   autoFocus?
 *   className?
 *
 * Result object shape:
 *   { id, name, label, lat, lng, type, category }
 */
export default function LocationSearch({
  placeholder = 'Search a place… (e.g. Madhapur, Charminar)',
  defaultValue = '',
  onSelect,
  onClear,
  showCurrentLocation = true,
  compact = false,
  autoFocus = false,
  className,
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [geoLoading, setGeoLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = useId();

  const debounced = useDebounce(value, 280);

  /* ── Fetch suggestions ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const q = debounced.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    searchLocations(q, { limit: 8 })
      .then((rs) => {
        if (cancelled) return;
        setResults(rs);
        setActiveIndex(rs.length ? 0 : -1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Search failed.');
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debounced]);

  /* ── Close on outside click ───────────────────────────────────── */
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  /* ── Handlers ─────────────────────────────────────────────────── */
  const pick = useCallback((r) => {
    if (!r) return;
    setValue(r.name);
    setOpen(false);
    setResults([]);
    onSelect?.(r);
    inputRef.current?.blur();
  }, [onSelect]);

  const clear = () => {
    setValue('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support geolocation.');
      return;
    }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const { latitude, longitude } = pos.coords;
        const r = {
          id: `geo-${latitude}-${longitude}`,
          name: 'Current location',
          label: `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude,
        };
        setValue(r.name);
        setOpen(false);
        onSelect?.(r);
      },
      (err) => {
        setGeoLoading(false);
        setError(err?.message || 'Could not retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        pick(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────── */
  const hasQuery = value.trim().length >= 2;
  const showDropdown = open && (loading || error || results.length > 0 || hasQuery);

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" strokeWidth={1.75} />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className={clsx(
            'w-full bg-surface border border-line rounded-xl text-[13.5px] text-ink placeholder:text-faint',
            'shadow-soft transition-colors duration-150',
            'focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(10,10,10,0.06)]',
            'hover:border-line-strong',
            compact ? 'h-10 pl-10 pr-20' : 'h-12 pl-11 pr-24'
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-mute animate-spin" />
          )}
          {value && !loading && (
            <button
              type="button"
              onClick={clear}
              className="w-7 h-7 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-surface-2 transition"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {showCurrentLocation && (
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={geoLoading}
              className="w-7 h-7 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-surface-2 transition disabled:opacity-50"
              aria-label="Use my current location"
              title="Use my current location"
            >
              {geoLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <LocateFixed className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            id={listboxId}
            role="listbox"
            className="absolute z-[600] mt-2 left-0 right-0 bg-surface border border-line rounded-xl shadow-lift overflow-hidden"
          >
            {error ? (
              <div className="px-4 py-3.5 text-[12.5px] text-red-700">{error}</div>
            ) : loading && !results.length ? (
              <div className="px-4 py-3.5 flex items-center gap-2 text-[12.5px] text-mute">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching places…
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3.5 text-[12.5px] text-mute">
                No matching places. Try a different search.
              </div>
            ) : (
              <ul className="max-h-[320px] overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li
                    key={r.id}
                    id={`${listboxId}-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                    className={clsx(
                      'px-3 py-2.5 flex items-start gap-3 cursor-pointer transition-colors',
                      i === activeIndex ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                    )}
                  >
                    <span className="mt-0.5 w-7 h-7 rounded-md bg-canvas border border-line flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-mute" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-ink truncate">{r.name}</div>
                      <div className="text-[11.5px] text-mute truncate">{r.label}</div>
                    </div>
                    <span className="text-[10.5px] text-faint uppercase tracking-wider mt-1 shrink-0">
                      {r.type || r.category || 'place'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-3 py-2 border-t border-line bg-surface-2/40 text-[10.5px] text-faint">
              Powered by OpenStreetMap · Nominatim
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
