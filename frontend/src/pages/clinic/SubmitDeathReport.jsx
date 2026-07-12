import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, ArrowLeft, AlertTriangle } from 'lucide-react';

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

export default function SubmitDeathReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    disease: '',
    area: '',
    count: '',
    notes: '',
    lat: null,
    lng: null,
    locationLabel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ diseases: [], areas: [] });

  useEffect(() => {
    let active = true;
    dashboardService
      .getFilters({ allowFallback: false })
      .then((f) => {
        if (active) setFilters(f);
      })
      .catch(() => {
        if (active) toast.error('Could not load disease/area options.');
      });
    return () => {
      active = false;
    };
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
      setError('Please fill in disease, area and death count.');
      return;
    }

    const deathCount = parseInt(form.count, 10);
    if (!deathCount || deathCount < 1) {
      setError('Death count must be a positive number.');
      return;
    }

    const payload = {
      disease_name: form.disease,
      area_id: form.area,
      death_count: deathCount,
      notes: form.notes,
      lat: form.lat,
      lng: form.lng,
    };

    setLoading(true);
    try {
      await reportsService.createDeath(payload);
      toast.success('Death report submitted');
      navigate('/clinic/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || err?.response?.data?.detail || 'Failed to submit';
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
        title="Submit Death Report"
        description="Record disease-related fatalities. Reviewed by health authorities."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 mb-6">
              <AlertTriangle
                className="w-4 h-4 text-red-600 mt-0.5 shrink-0"
              />
              <div className="text-[12.5px] text-red-800 leading-relaxed">
                Death reports are reviewed promptly and may trigger automated
                alerts. Please double-check details before submission.
              </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Disease" required>
                  <Select
                    value={form.disease}
                    onChange={(e) =>
                      setForm({ ...form, disease: e.target.value })
                    }
                  >
                    <option value="">Select disease…</option>
                    {filters.diseases.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Area" required>
                  <Select
                    value={form.area}
                    onChange={(e) =>
                      setForm({ ...form, area: e.target.value })
                    }
                  >
                    <option value="">Select area…</option>
                    {filters.areas.map((a) => (
                      <option key={a.area_id} value={a.area_id}>
                        {a.area_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Specific location"
                hint="Optional — pin the precise location."
              >
                <LocationSearch
                  placeholder="Search a place — Hyderabad results appear first"
                  compact
                  showCurrentLocation
                  onSelect={onLocation}
                />
                {form.locationLabel && (
                  <p className="mt-2 text-[11.5px] text-mute truncate">
                    {form.locationLabel}
                  </p>
                )}
              </Field>

              <Field label="Death count" required>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  value={form.count}
                  onChange={(e) =>
                    setForm({ ...form, count: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Notes"
                hint="Optional notes on circumstances, comorbidities, etc."
              >
                <Textarea
                  rows={6}
                  placeholder="Brief notes…"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </Field>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  icon={Send}
                  loading={loading}
                >
                  Submit report
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <Panel>
          <div className="eyebrow mb-1">What happens next</div>
          <h3 className="text-[16px] font-semibold tracking-tight text-ink">
            After submission
          </h3>
          <ol className="mt-5 space-y-4 text-[13px] text-ink-2">
            {[
              'Submission is recorded against your clinic profile.',
              'Authority dashboards update after the next refresh.',
              'Severity thresholds may trigger advisories.',
              "You'll see it in your History within seconds.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-md bg-surface-2 border border-line flex items-center justify-center text-[11px] font-semibold tabular-nums text-mute">
                  {i + 1}
                </span>
                <span className="leading-relaxed mt-0.5">{t}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </PageTransition>
  );
}
