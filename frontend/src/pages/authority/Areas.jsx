import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, MapPin, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import AsyncBoundary from '../../components/ui/AsyncBoundary.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import LocationSearch from '../../components/map/LocationSearch.jsx';

import useAsync from '../../hooks/useAsync.js';
import useDebounce from '../../hooks/useDebounce.js';
import areasService from '../../services/areas.service.js';

const riskBadge = (risk) =>
  ({ low: 'low', moderate: 'moderate', high: 'high', critical: 'critical' }[risk] || 'neutral');

// Hyderabad-flavored suggestions for the empty Create dialog.
const EXAMPLE_AREAS = ['Hitech City', 'Madhapur', 'Kukatpally', 'LB Nagar', 'Uppal'];

function AreaCardSkeleton() {
  return (
    <div className="p-6 bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function Areas() {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 200);
  const { data, loading, error, refetch } = useAsync(() => areasService.list({ q: debounced }), [debounced]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', id: '', lat: '', lng: '', label: '', population_density: '', state: '' });
  const [saving, setSaving] = useState(false);

  const areas = data || [];
  const stats = useMemo(() => {
    const total = areas.length;
    const high = areas.filter((a) => a.risk === 'high' || a.risk === 'critical').length;
    const pop = areas.reduce((sum, a) => sum + (a.population || 0), 0);
    return { total, high, pop };
  }, [areas]);

  const resetForm = () => setForm({ name: '', id: '', lat: '', lng: '', label: '', population_density: '', state: '' });

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name) return toast.error('Area name is required');
    setSaving(true);
    try {
      await areasService.create({
        area_name: form.name,
        area_id: form.id || `A-${Math.floor(100 + Math.random() * 900)}`,
        lat: parseFloat(form.lat) || 17.385,
        lon: parseFloat(form.lng) || 78.4867,
        facility_type: 'clinic',
        population_density: parseInt(form.population_density) || 0,
        state: form.state || 'Telangana',
      });
      toast.success('Area created');
      setOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Could not create area');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await areasService.remove(id);
      toast.success('Area deleted');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Could not delete area');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Management"
        title="Areas"
        description="Define and maintain the regions monitored by the platform."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            Create area
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatLite label="Total areas" value={stats.total} />
        <StatLite label="High / Critical risk" value={stats.high} />
        <StatLite label="Population covered" value={stats.pop.toLocaleString()} />
      </div>

      <Panel padded={false}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-line">
          <div className="flex-1 max-w-sm">
            <Input icon={Search} placeholder="Search areas…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="ml-auto text-[12.5px] text-mute">
            {areas.length} {areas.length === 1 ? 'area' : 'areas'}
          </div>
        </div>

        <AsyncBoundary
          loading={loading}
          error={error}
          onRetry={refetch}
          skeleton={
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-line">
              {Array.from({ length: 6 }).map((_, i) => <AreaCardSkeleton key={i} />)}
            </div>
          }
          isEmpty={!areas.length}
          empty={
            <EmptyState
              icon={MapPin}
              title="No areas yet"
              description="Create your first area to begin monitoring."
              action={<Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Create area</Button>}
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-line">
            {areas.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (i % 9) * 0.03 }}
                className="group p-6 bg-surface hover:bg-surface-2/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold tracking-tight truncate text-ink">{a.name}</h3>
                      <Badge variant={riskBadge(a.risk)} dot>{a.risk}</Badge>
                    </div>
                    <div className="text-[11.5px] text-faint mt-1">{a.id}</div>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-md flex items-center justify-center text-mute hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Delete area"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10.5px] text-faint uppercase tracking-wider">Population</div>
                    <div className="text-[13.5px] text-ink tabular-nums flex items-center gap-1.5 mt-1">
                      <Users className="w-3.5 h-3.5 text-mute" />
                      {(a.population || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-faint uppercase tracking-wider">Coordinates</div>
                    <div className="text-[13.5px] text-ink tabular-nums flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-mute" />
                      {a.lat?.toFixed(2)}, {a.lng?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AsyncBoundary>
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create new area"
        description="Search for a location or enter coordinates manually."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={submit}>Create area</Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5">
          <Field label="Find on map" hint="Search any place — Hyderabad results appear first.">
            <LocationSearch
              placeholder="e.g. Hitech City, Madhapur, Apollo Hospital Hyderabad"
              compact
              showCurrentLocation={false}
              onSelect={(r) => setForm((f) => ({
                ...f,
                name: f.name || r.name,
                lat: String(r.lat),
                lng: String(r.lng),
                label: r.label,
              }))}
            />
            {form.label && (
              <p className="mt-2 text-[11.5px] text-mute truncate">{form.label}</p>
            )}
          </Field>

          <Field label="Area name" required hint={`Suggestions: ${EXAMPLE_AREAS.join(', ')}`}>
            <Input
              placeholder="e.g. Hitech City"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Area code" hint="Optional — auto-generated if blank">
            <Input placeholder="A-116" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <Input type="number" step="any" placeholder="17.4435" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </Field>
            <Field label="Longitude">
              <Input type="number" step="any" placeholder="78.3772" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Population Density">
              <Input type="number" placeholder="215000" value={form.population_density} onChange={(e) => setForm({ ...form, population_density: e.target.value })} />
            </Field>
            <Field label="State">
              <Input placeholder="Telangana" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}

function StatLite({ label, value }) {
  return (
    <div className="bg-surface border border-line rounded-2xl px-6 py-5 shadow-soft">
      <div className="text-[11.5px] text-mute font-medium">{label}</div>
      <div className="display text-[32px] mt-2 text-ink tabular-nums">{value}</div>
    </div>
  );
}
