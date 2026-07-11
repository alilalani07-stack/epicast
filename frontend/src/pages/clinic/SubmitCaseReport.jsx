import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, ArrowLeft, CheckCircle2 } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';
import LocationSearch from '../../components/map/LocationSearch.jsx';

import reportsService from '../../services/reports.service.js';
import dashboardService from '../../services/dashboard.service.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function SubmitCaseReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    disease: '', area: '', count: '', notes: '',
    lat: null, lng: null, locationLabel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ diseases: [], areas: [] });

  useEffect(() => {
    let active = true;
    dashboardService.getFilters()
      .then((f) => { if (active) setFilters(f); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const onLocation = (r) => {
    setForm((f) => ({
      ...f,
      lat: r.lat,
      lng: r.lng,
      locationLabel: r.label,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.disease || !form.area || !form.count) {
      setError('Please fill in disease, area and case count.');
      return;
    }
    setLoading(true);
    try {
      await reportsService.createCase({
        disease_name: form.disease,
        area_id: form.area,
        case_count: parseInt(form.count, 10),
        notes: form.notes,
        lat: form.lat,
        lng: form.lng,
        locationLabel: form.locationLabel || undefined,
        clinic_id: user?.uid,
      });
      toast.success('Case report submitted');
      navigate('/clinic/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || 'Failed to submit';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clinic Portal"
        title="Submit Case Report"
        description="Report confirmed or suspected disease cases."
        actions={<Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel>
            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Disease" required>
                  <Select value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })}>
                    <option value="">Select disease…</option>
                    {filters.diseases.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Area" required>
                  <Select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                    <option value="">Select area…</option>
                    {filters.areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Specific location" hint="Optional — pin a precise place (e.g. Apollo Hospital Hyderabad).">
                <LocationSearch
                  placeholder="Search a place — Hyderabad results appear first"
                  compact
                  showCurrentLocation
                  onSelect={onLocation}
                />
                {form.locationLabel && (
                  <p className="mt-2 text-[11.5px] text-mute truncate">{form.locationLabel}</p>
                )}
              </Field>

              <Field label="Case count" required hint="Number of cases reported in this submission.">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 12"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: e.target.value })}
                />
              </Field>
              <Field label="Notes" hint="Optional context, observations or follow-up actions.">
                <Textarea
                  rows={6}
                  placeholder="Brief notes on the cases, sources, symptoms…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
                <Button variant="primary" type="submit" icon={Send} loading={loading}>Submit report</Button>
              </div>
            </form>
          </Panel>
        </div>

        <Panel>
          <div className="eyebrow mb-1">Guidelines</div>
          <h3 className="text-[16px] font-semibold tracking-tight text-ink">Reporting best practices</h3>
          <ul className="mt-5 space-y-3.5 text-[13px] text-ink-2">
            {[
              'Submit reports within 24 hours of confirmation.',
              'Report cases and deaths as separate submissions.',
              'Pin a specific location when possible.',
              "All data flows into the authority's intelligence layer.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" strokeWidth={1.75} />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PageTransition>
  );
}
