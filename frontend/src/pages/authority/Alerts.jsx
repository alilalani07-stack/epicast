import {
  useState, useEffect, useRef, useCallback, useMemo, useDeferredValue,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Check, CheckCheck, X, Bell, AlertTriangle,
  Inbox, Archive, ChevronRight, Command, CornerDownLeft, Clock,
  MoreHorizontal, Trash2, Eye, ListFilter, LayoutList, Maximize2,
  Minimize2, RefreshCw, ArrowUp, ArrowDown, GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import { AlertFeedSkeleton } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import AlertCard from '../../components/alerts/AlertCard.jsx';

import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import alertsService from '../../services/alerts.service.js';

// --- Constants & Design Tokens ---
const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 };
const SEVERITY_META = {
  critical:   { color: 'bg-red-500',  text: 'text-red-700',  bg: 'bg-red-50',  border: 'border-red-200',  label: 'Critical' },
  high:       { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', label: 'High' },
  moderate:   { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Moderate' },
  low:        { color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Low' },
};
const STATUS_META = {
  all:          { icon: Inbox, color: 'text-ink' },
  new:          { icon: Bell, color: 'text-orange-600' },
  acknowledged: { icon: Check, color: 'text-blue-600' },
  resolved:     { icon: Archive, color: 'text-emerald-600' },
};

// --- Hooks ---

function useAlertKeyboard({ alerts, selectedId, onSelect, onAck, onResolve, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      const idx = alerts.findIndex((a) => a.id === selectedId);
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = alerts[Math.min(idx + 1, alerts.length - 1)];
        if (next) onSelect(next.id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = alerts[Math.max(idx - 1, 0)];
        if (prev) onSelect(prev.id);
      } else if (e.key === 'a' && selectedId) {
        e.preventDefault();
        const a = alerts.find((x) => x.id === selectedId);
        if (a && a.status !== 'resolved') onAck(a);
      } else if (e.key === 'r' && selectedId) {
        e.preventDefault();
        const a = alerts.find((x) => x.id === selectedId);
        if (a && a.status !== 'resolved') onResolve(a);
      } else if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Let command palette handle this
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [alerts, selectedId, onSelect, onAck, onResolve, onClose]);
}

// --- Command Palette for Alerts ---
function AlertCommandPalette({ alerts, open, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q);
  const inputRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!deferredQ.trim()) return alerts.slice(0, 10);
    const t = deferredQ.toLowerCase();
    return alerts.filter((a) =>
      String(a.id).includes(t) ||
      (a.title || '').toLowerCase().includes(t) ||
      (a.message || '').toLowerCase().includes(t) ||
      (a.area || '').toLowerCase().includes(t) ||
      (a.disease || '').toLowerCase().includes(t)
    ).slice(0, 12);
  }, [alerts, deferredQ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? {} : { opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: reducedMotion ? 0 : 0.15 }}
        className="w-full max-w-lg mx-4 bg-canvas rounded-xl shadow-2xl border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Search className="w-5 h-5 text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to alert by ID, disease, area…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-faint"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded bg-surface-2 border border-line text-[11px] text-faint">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-mute text-[14px]">No alerts match "{deferredQ}"</div>
          ) : (
            filtered.map((a, i) => (
              <button
                key={a.id}
                onClick={() => { onSelect(a.id); onClose(); }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-surface-2 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_META[a.severity]?.color || 'bg-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink truncate">{a.title || a.message || `Alert #${a.id}`}</div>
                  <div className="text-[11.5px] text-faint">{a.disease || a.disease_name} · {a.area || a.area_id}</div>
                </div>
                <Badge variant={a.status === 'resolved' ? 'success' : a.status === 'acknowledged' ? 'info' : 'warning'} className="text-[11px] shrink-0">
                  {a.status}
                </Badge>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-line text-[11px] text-faint flex items-center gap-3">
          <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-surface-2 border border-line">↑</kbd><kbd className="px-1 rounded bg-surface-2 border border-line">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-surface-2 border border-line">↵</kbd> select</span>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Component ---

export default function Alerts() {
  const reducedMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'all');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [density, setDensity] = useState('comfortable'); // 'compact' | 'comfortable'
  const [showPalette, setShowPalette] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounced = useDebounce(q, 200);
  const listRef = useRef(null);

  // Sync URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== 'all') next.set('status', status);
    if (severity !== 'all') next.set('severity', severity);
    if (debounced) next.set('q', debounced);
    setSearchParams(next, { replace: true });
  }, [status, severity, debounced, setSearchParams]);

  // Fetch
  const { data, loading, error, refetch } = useAsync(
    () => alertsService.list({ severity }),
    [severity]
  );

  const alertList = data?.alerts || [];

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let out = alertList;
    if (status !== 'all') out = out.filter((a) => a.status === status);
    if (debounced) {
      const t = debounced.toLowerCase();
      out = out.filter((a) =>
        String(a.id).includes(t) ||
        (a.title || '').toLowerCase().includes(t) ||
        (a.message || '').toLowerCase().includes(t) ||
        (a.area || a.area_id || '').toLowerCase().includes(t) ||
        (a.disease || a.disease_name || '').toLowerCase().includes(t)
      );
    }
    return out.sort((a, b) => {
      const sev = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      if (sev !== 0) return sev;
      return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
    });
  }, [alertList, status, debounced]);

  // Grouped by severity for sticky headers
  const grouped = useMemo(() => {
    const groups = {};
    for (const a of filtered) {
      groups[a.severity] = groups[a.severity] || [];
      groups[a.severity].push(a);
    }
    return Object.entries(groups).sort((a, b) => SEVERITY_ORDER[a[0]] - SEVERITY_ORDER[b[0]]);
  }, [filtered]);

  const counts = useMemo(() => ({
    all: alertList.length,
    new: alertList.filter((a) => a.status === 'new').length,
    acknowledged: alertList.filter((a) => a.status === 'acknowledged').length,
    resolved: alertList.filter((a) => a.status === 'resolved').length,
  }), [alertList]);

  const selectedAlert = filtered.find((a) => a.id === selectedId) || null;

  // Actions
  const onAck = useCallback(async (a) => {
    try {
      await alertsService.acknowledge(a.id);
      toast.success(`Acknowledged #${a.id}`);
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to acknowledge');
    }
  }, [refetch]);

  const onResolve = useCallback(async (a) => {
    try {
      await alertsService.resolve(a.id);
      toast.success(`Resolved #${a.id}`);
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to resolve');
    }
  }, [refetch]);

  const bulkAck = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setRefreshing(true);
    await Promise.all(ids.map((id) => alertsService.acknowledge(id).catch(() => null)));
    toast.success(`Acknowledged ${ids.length} alerts`);
    setSelectedIds(new Set());
    setRefreshing(false);
    refetch();
  }, [selectedIds, refetch]);

  const bulkResolve = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setRefreshing(true);
    await Promise.all(ids.map((id) => alertsService.resolve(id).catch(() => null)));
    toast.success(`Resolved ${ids.length} alerts`);
    setSelectedIds(new Set());
    setRefreshing(false);
    refetch();
  }, [selectedIds, refetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Keyboard
  useAlertKeyboard({
    alerts: filtered,
    selectedId,
    onSelect: setSelectedId,
    onAck,
    onResolve,
    onClose: () => setSelectedId(null),
  });

  // Global shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Scroll selected into view
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-alert-id="${selectedId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      filtered.forEach((a) => next.delete(a.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach((a) => next.add(a.id));
      setSelectedIds(next);
    }
  };

  const rowPadding = density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4';
  const iconSize = density === 'compact' ? 'w-7 h-7' : 'w-8 h-8';
  const textSize = density === 'compact' ? 'text-[12.5px]' : 'text-[13.5px]';

  return (
    <PageTransition>
      <div className="h-[calc(100vh-72px)] flex flex-col overflow-hidden bg-canvas">
        {/* Header */}
        <div className="shrink-0">
          <PageHeader
            eyebrow="Operations"
            title="Alerts"
            description="Real-time outbreak alerts requiring triage and resolution."
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-surface-2 text-mute hover:text-ink transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="h-4 w-px bg-line" />
                <button
                  onClick={() => setDensity(d => d === 'comfortable' ? 'compact' : 'comfortable')}
                  className="p-2 rounded-lg hover:bg-surface-2 text-mute hover:text-ink transition-colors"
                  title={density === 'comfortable' ? 'Compact view' : 'Comfortable view'}
                >
                  {density === 'comfortable' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-faint">
                  <kbd className="px-1 rounded bg-surface-2 border border-line">⌘</kbd>
                  <kbd className="px-1 rounded bg-surface-2 border border-line">K</kbd>
                </div>
              </div>
            }
          />
        </div>

        {/* Filter bar */}
        <div className="shrink-0 px-4 lg:px-6 py-3 border-b border-line bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="min-w-0 flex-1">
              <Tabs
                tabs={[
                  { value: 'all', label: `All ${counts.all}` },
                  { value: 'new', label: `New ${counts.new}` },
                  { value: 'acknowledged', label: `Ack ${counts.acknowledged}` },
                  { value: 'resolved', label: `Done ${counts.resolved}` },
                ]}
                value={status}
                onChange={(v) => { setStatus(v); setSelectedId(null); setSelectedIds(new Set()); }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex-1 sm:max-w-xs">
                <Input
                  icon={Search}
                  placeholder="Search alerts…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-mute shrink-0" />
                <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full sm:w-40">
                  <option value="all">All severity</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                </Select>
                <button
                  onClick={() => setShowPalette(true)}
                  className="hidden sm:flex p-2 rounded-lg hover:bg-surface-2 text-mute hover:text-ink transition-colors"
                  title="Command palette"
                >
                  <Command className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-line">
                  <div className="text-[13px] text-ink">
                    <span className="font-semibold tabular-nums">{selectedIds.size}</span>
                    <span className="text-mute ml-1">selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={Check} onClick={bulkAck} disabled={refreshing}>
                      Acknowledge
                    </Button>
                    <Button variant="primary" size="sm" icon={CheckCheck} onClick={bulkResolve} disabled={refreshing}>
                      Resolve
                    </Button>
                    <Button variant="ghost" size="sm" icon={X} onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content: list + detail */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* List pane */}
          <div className={`flex-1 min-h-0 flex flex-col ${selectedId ? 'lg:max-w-[55%] xl:max-w-[50%]' : ''}`}>
            <div className="shrink-0 px-4 lg:px-6 py-2 border-b border-line flex items-center justify-between gap-3 bg-surface/30">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-line text-ink focus:ring-2 focus:ring-ink/20 transition-all"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <span className="text-[12px] text-faint group-hover:text-mute transition-colors">Select all</span>
              </label>
              <div className="text-[12px] text-faint tabular-nums">
                {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
              <AsyncBoundary
                loading={loading}
                error={error}
                onRetry={refetch}
                skeleton={
                  <div className="divide-y divide-line">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className={`${rowPadding} flex items-center gap-3`}>
                        <div className="w-4 h-4 rounded bg-surface-2 shimmer" />
                        <div className={`${iconSize} rounded-lg bg-surface-2 shimmer shrink-0`} />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-2/3 bg-surface-2 shimmer rounded" />
                          <div className="h-3 w-1/3 bg-surface-2 shimmer rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
                isEmpty={!filtered.length}
                empty={
                  <div className="h-full flex items-center justify-center px-6 py-12">
                    <EmptyState
                      icon={status === 'resolved' ? Archive : status === 'new' ? Bell : Inbox}
                      title={status === 'resolved' ? 'All cleared' : status === 'new' ? 'No new alerts' : 'No alerts'}
                      description={status === 'all' ? "You're all caught up." : 'Try adjusting your filters.'}
                    />
                  </div>
                }
              >
                <div className="divide-y divide-line">
                  {grouped.map(([severityKey, items]) => (
                    <div key={severityKey}>
                      {/* Sticky severity header */}
                      <div className="sticky top-0 z-10 px-4 lg:px-6 py-2 bg-canvas/95 backdrop-blur-sm border-b border-line flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${SEVERITY_META[severityKey]?.color || 'bg-slate-400'}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                          {SEVERITY_META[severityKey]?.label || severityKey}
                        </span>
                        <span className="text-[11px] text-faint tabular-nums ml-auto">{items.length}</span>
                      </div>

                      {items.map((a) => {
                        const isSelected = selectedId === a.id;
                        const isChecked = selectedIds.has(a.id);
                        const meta = SEVERITY_META[a.severity] || SEVERITY_META.low;

                        return (
                          <div
                            key={a.id}
                            data-alert-id={a.id}
                            onClick={() => setSelectedId(a.id)}
                            className={`
                              group flex items-start gap-3 cursor-pointer transition-all
                              ${rowPadding}
                              ${isSelected ? 'bg-surface-2' : 'hover:bg-surface-2/40'}
                            `}
                          >
                            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-line text-ink focus:ring-2 focus:ring-ink/20 transition-all"
                                checked={isChecked}
                                onChange={() => {
                                  const next = new Set(selectedIds);
                                  if (next.has(a.id)) next.delete(a.id);
                                  else next.add(a.id);
                                  setSelectedIds(next);
                                }}
                              />
                            </div>

                            <div className={`${iconSize} rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.border} border`}>
                              <AlertTriangle className={`w-4 h-4 ${meta.text}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`${textSize} font-medium text-ink truncate`}>
                                  {a.title || a.message || `Alert #${a.id}`}
                                </span>
                                <Badge variant={a.severity} dot className="text-[11px] shrink-0">
                                  {a.severity}
                                </Badge>
                                {a.status !== 'new' && (
                                  <Badge
                                    variant={a.status === 'resolved' ? 'success' : 'info'}
                                    className="text-[11px] shrink-0"
                                  >
                                    {a.status}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[12px] text-mute mt-1 flex items-center gap-2 flex-wrap">
                                <span>{a.disease || a.disease_name}</span>
                                <span className="text-line">·</span>
                                <span>{a.area || a.area_id}</span>
                                <span className="text-line">·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {a.date || a.createdAt || '—'}
                                </span>
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {a.status !== 'resolved' && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onAck(a); }}
                                    className="p-1.5 rounded-md hover:bg-surface text-mute hover:text-ink transition-colors"
                                    title="Acknowledge (a)"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onResolve(a); }}
                                    className="p-1.5 rounded-md hover:bg-surface text-mute hover:text-emerald-600 transition-colors"
                                    title="Resolve (r)"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <ChevronRight className={`w-4 h-4 text-faint transition-transform ${isSelected ? 'translate-x-0.5' : ''}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </AsyncBoundary>
            </div>
          </div>

          {/* Detail pane */}
          <AnimatePresence>
            {selectedAlert && (
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? {} : { opacity: 0, x: 30 }}
                transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-[1100] lg:static lg:z-auto lg:flex lg:w-[45%] xl:w-[50%]"
              >
                <div className="absolute inset-0 bg-black/20 lg:hidden" onClick={() => setSelectedId(null)} />
                <Panel className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] lg:w-full lg:static lg:h-full flex flex-col overflow-hidden shadow-2xl lg:shadow-none border-l border-line">
                  {/* Detail header */}
                  <div className="shrink-0 px-5 py-4 border-b border-line flex items-start justify-between gap-3 bg-surface/30">
                    <div className="min-w-0">
                      <div className="eyebrow mb-1 flex items-center gap-2">
                        <span className="tabular-nums">#{selectedAlert.id}</span>
                        <span className="text-line">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {selectedAlert.createdAt || selectedAlert.date || '—'}
                        </span>
                      </div>
                      <h2 className="text-[17px] font-semibold text-ink leading-snug">
                        {selectedAlert.title || selectedAlert.message || `Alert #${selectedAlert.id}`}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-2 rounded-lg hover:bg-surface-2 text-mute hover:text-ink transition-colors shrink-0"
                      aria-label="Close detail"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Detail content */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-5">
                    {/* Status bar */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border flex items-center gap-1.5 ${SEVERITY_META[selectedAlert.severity]?.bg || 'bg-slate-50'} ${SEVERITY_META[selectedAlert.severity]?.border || 'border-slate-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${SEVERITY_META[selectedAlert.severity]?.color || 'bg-slate-400'}`} />
                        {selectedAlert.severity}
                      </div>
                      <Badge
                        variant={selectedAlert.status === 'resolved' ? 'success' : selectedAlert.status === 'acknowledged' ? 'info' : 'warning'}
                        className="text-[12px]"
                      >
                        {selectedAlert.status}
                      </Badge>
                    </div>

                    {/* Message */}
                    {selectedAlert.message && (
                      <div className="mb-6 p-4 rounded-xl bg-surface-2/50 border border-line">
                        <p className="text-[13.5px] text-ink leading-relaxed">{selectedAlert.message}</p>
                      </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <DetailField label="Disease" value={selectedAlert.disease || selectedAlert.disease_name || '—'} />
                      <DetailField label="Area" value={selectedAlert.area || selectedAlert.area_id || '—'} />
                      <DetailField label="Cases" value={selectedAlert.count ?? selectedAlert.cases ?? '—'} mono />
                      <DetailField label="Trend" value={selectedAlert.trend ? `${selectedAlert.trend > 0 ? '+' : ''}${selectedAlert.trend}%` : '—'} mono />
                      <DetailField label="Submitted by" value={selectedAlert.submittedBy || '—'} />
                      <DetailField label="Updated" value={selectedAlert.updatedAt || selectedAlert.date || '—'} />
                    </div>

                    {/* Action history */}
                    <div className="mb-6">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-surface-2 border border-line flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="w-3 h-3 text-mute" />
                          </div>
                          <div>
                            <div className="text-[13px] text-ink">Alert created</div>
                            <div className="text-[11.5px] text-faint mt-0.5">{selectedAlert.createdAt || selectedAlert.date || '—'}</div>
                          </div>
                        </div>
                        {selectedAlert.status !== 'new' && (
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-[13px] text-ink">Acknowledged</div>
                              <div className="text-[11.5px] text-faint mt-0.5">{selectedAlert.acknowledgedAt || '—'}</div>
                            </div>
                          </div>
                        )}
                        {selectedAlert.status === 'resolved' && (
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-[13px] text-ink">Resolved</div>
                              <div className="text-[11.5px] text-faint mt-0.5">{selectedAlert.resolvedAt || '—'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail footer actions */}
                  <div className="shrink-0 px-5 py-4 border-t border-line bg-surface/30 flex items-center gap-2">
                    {selectedAlert.status !== 'resolved' ? (
                      <>
                        <Button
                          variant="secondary"
                          icon={Check}
                          onClick={() => onAck(selectedAlert)}
                          disabled={selectedAlert.status === 'acknowledged'}
                          className="flex-1"
                        >
                          {selectedAlert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                        </Button>
                        <Button
                          variant="primary"
                          icon={CheckCheck}
                          onClick={() => onResolve(selectedAlert)}
                          className="flex-1"
                        >
                          Resolve
                        </Button>
                      </>
                    ) : (
                      <div className="w-full flex items-center gap-2 text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
                        <CheckCheck className="w-4 h-4" />
                        This alert has been resolved and archived.
                      </div>
                    )}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Command Palette */}
      <AlertCommandPalette
        alerts={alertList}
        open={showPalette}
        onClose={() => setShowPalette(false)}
        onSelect={setSelectedId}
      />
    </PageTransition>
  );
}

function DetailField({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10.5px] text-faint uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-[13.5px] text-ink break-words ${mono ? 'tabular-nums' : ''}`}>{value}</div>
    </div>
  );
}