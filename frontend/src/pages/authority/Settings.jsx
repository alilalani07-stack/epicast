import {
  useEffect, useState, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Save, LogOut, Copy, Check, RefreshCw, AlertTriangle,
  Eye, EyeOff, Shield, Bell, Mail, FileBarChart, Zap,
} from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Divider from '../../components/ui/Divider.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

// --- Design tokens ---
const REGIONS = [
  { value: 'IN-Central', label: 'India · Central' },
  { value: 'IN-North', label: 'India · North' },
  { value: 'IN-South', label: 'India · South' },
  { value: 'IN-East', label: 'India · East' },
  { value: 'IN-West', label: 'India · West' },
  { value: 'IN-Northeast', label: 'India · Northeast' },
];

const NOTIFICATION_PREFS = [
  {
    key: 'pushAlerts',
    label: 'Push alerts',
    description: 'Real-time alerts for new critical and high severity events.',
    icon: Bell,
  },
  {
    key: 'emailDigest',
    label: 'Daily email digest',
    description: 'A summary of activity delivered to your inbox each morning.',
    icon: Mail,
  },
  {
    key: 'weeklyReport',
    label: 'Weekly intelligence report',
    description: 'Friday recap of trends, forecasts and notable shifts.',
    icon: FileBarChart,
  },
  {
    key: 'autoAck',
    label: 'Auto-acknowledge low alerts',
    description: 'Automatically acknowledge low severity alerts after 24h.',
    icon: Zap,
  },
];

// --- Toggle with reduced-motion support ---
function Toggle({ checked, onChange, label, description, icon: Icon }) {
  const reducedMotion = useReducedMotion();

  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer py-4 group">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${checked ? 'bg-ink text-white' : 'bg-surface-2 text-mute'} transition-colors`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-ink group-hover:text-ink/80 transition-colors">{label}</div>
          {description && <p className="text-[12.5px] text-mute mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-ink/20 ${
          checked ? 'bg-ink' : 'bg-surface-3 border border-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft ${
            reducedMotion ? '' : 'transition-transform duration-200'
          } ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </label>
  );
}

// --- Copy field with reveal ---
function CopyField({ value, label, hint }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [value]);

  const displayValue = revealed ? value : value.slice(0, 8) + '•'.repeat(value.length - 12) + value.slice(-4);

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input value={displayValue} readOnly className="flex-1 font-mono text-[13px] bg-surface-2/30" />
        <button
          onClick={() => setRevealed(!revealed)}
          className="p-2.5 rounded-lg hover:bg-surface-2 text-mute hover:text-ink transition-colors"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={handleCopy}
          className={`p-2.5 rounded-lg transition-colors ${
            copied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'hover:bg-surface-2 text-mute hover:text-ink'
          }`}
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
}

// --- Confirmation modal ---
function ConfirmModal({ open, title, description, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md bg-canvas rounded-xl shadow-2xl border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
              <p className="text-[13px] text-mute mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 bg-surface/50 border-t border-line flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initialProfile = useMemo(() => ({
    name: user?.displayName || 'Dr. E. Carter',
    email: user?.email || 'e.carter@authority.gov',
    org: 'National Health Authority',
    region: 'IN-Central',
  }), [user]);

  const initialPrefs = useMemo(() => ({
    pushAlerts: true,
    emailDigest: true,
    weeklyReport: false,
    autoAck: false,
  }), []);

  const [profile, setProfile] = useState(initialProfile);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [apiKey] = useState('epi_live_sk_2a8f4e9d1c3b7a5d6e0f8g2h4i6j0k1l');

  const isDirty = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(initialProfile) ||
           JSON.stringify(prefs) !== JSON.stringify(initialPrefs);
  }, [profile, prefs, initialProfile, initialPrefs]);

  useEffect(() => {
    if (user) {
      setProfile((p) => ({
        ...p,
        name: user.displayName || p.name,
        email: user.email || p.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const save = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success('Settings saved');
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/', { replace: true });
  }, [signOut, navigate]);

  return (
    <PageTransition>
      <div className="h-[calc(100vh-72px)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0">
          <PageHeader
            eyebrow="Account"
            title="Settings"
            description="Manage your profile, preferences and notification rules."
          />
        </div>

        {/* Content — aligned to start, no centering, scrolls internally if needed */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                <Panel>
                  <SectionHeader
                    title="Profile"
                    description="How you appear across the platform."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Field label="Full name">
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={profile.email} readOnly className="bg-surface-2/30" />
                    </Field>
                    <Field label="Organization">
                      <Input
                        value={profile.org}
                        onChange={(e) => setProfile({ ...profile, org: e.target.value })}
                      />
                    </Field>
                    <Field label="Region">
                      <Select
                        value={profile.region}
                        onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                      >
                        {REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </Panel>

                <Panel>
                  <SectionHeader
                    title="Notifications"
                    description="Choose what you receive and when."
                  />
                  <div className="divide-y divide-line mt-2">
                    {NOTIFICATION_PREFS.map((pref) => (
                      <Toggle
                        key={pref.key}
                        checked={prefs[pref.key]}
                        onChange={(v) => setPrefs({ ...prefs, [pref.key]: v })}
                        label={pref.label}
                        description={pref.description}
                        icon={pref.icon}
                      />
                    ))}
                  </div>
                </Panel>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Panel>
                  <SectionHeader
                    title="API access"
                    description="For integrations and pipelines."
                  />
                  <div className="mt-4 space-y-4">
                    <CopyField
                      value={apiKey}
                      label="API key"
                      hint="Rotate any time. Last rotated 14 days ago."
                    />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[12.5px] text-amber-800">
                      <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>Never share this key in client-side code or public repositories.</span>
                    </div>
                    <Button
                      variant="outline"
                      icon={RefreshCw}
                      onClick={() => setShowRotateConfirm(true)}
                      className="w-full"
                    >
                      Rotate key
                    </Button>
                  </div>
                </Panel>

                <Panel className="border-red-200">
                  <SectionHeader
                    title="Danger zone"
                    description="Irreversible account actions."
                  />
                  <div className="mt-4 p-4 rounded-xl bg-red-50/50 border border-red-100">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[13.5px] font-medium text-red-900">Sign out</div>
                        <p className="text-[12.5px] text-red-700/70 mt-1 leading-relaxed">
                          End your session on this device.
                        </p>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={LogOut}
                          onClick={() => setShowSignOutConfirm(true)}
                          className="mt-3"
                        >
                          Sign out
                        </Button>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky save bar */}
        <AnimatePresence>
          {isDirty && (
            <div className="shrink-0 fixed bottom-0 left-0 right-0 z-[100] border-t border-line bg-canvas/95 backdrop-blur-md">
              <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
                <div className="text-[13px] text-mute">
                  <span className="font-medium text-ink">Unsaved changes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setProfile(initialProfile); setPrefs(initialPrefs); }}
                  >
                    Discard
                  </Button>
                  <Button
                    variant="primary"
                    icon={saving ? undefined : Save}
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmations */}
      <ConfirmModal
        open={showRotateConfirm}
        title="Rotate API key?"
        description="Your current key will be invalidated immediately. Any integrations using it will fail until updated."
        confirmLabel="Rotate key"
        onConfirm={() => {
          setShowRotateConfirm(false);
          toast.success('API key rotated');
        }}
        onCancel={() => setShowRotateConfirm(false)}
      />
      <ConfirmModal
        open={showSignOutConfirm}
        title="Sign out?"
        description="You'll be signed out of EpiCast on this device. Any unsaved changes will be lost."
        confirmLabel="Sign out"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </PageTransition>
  );
}