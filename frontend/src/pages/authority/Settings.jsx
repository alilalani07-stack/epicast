import {
  useEffect, useState, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Save, LogOut, Check, AlertTriangle,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

// --- Design tokens ---
const REGIONS = [
  { value: 'IN-Central',   label: 'India · Central'   },
  { value: 'IN-North',     label: 'India · North'     },
  { value: 'IN-South',     label: 'India · South'     },
  { value: 'IN-East',      label: 'India · East'      },
  { value: 'IN-West',      label: 'India · West'      },
  { value: 'IN-Northeast', label: 'India · Northeast' },
];

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

  const initialProfile = useMemo(() => {
    const saved = localStorage.getItem('authority_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name:   user?.displayName || parsed.name   || 'Dr. E. Carter',
          email:  user?.email       || parsed.email  || 'e.carter@authority.gov',
          org:    parsed.org    || 'National Health Authority',
          region: parsed.region || 'IN-Central',
        };
      } catch {
        // ignore
      }
    }
    return {
      name:   user?.displayName || 'Dr. E. Carter',
      email:  user?.email       || 'e.carter@authority.gov',
      org:    'National Health Authority',
      region: 'IN-Central',
    };
  }, [user]);

  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const isDirty = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(initialProfile);
  }, [profile, initialProfile]);

  useEffect(() => {
    if (user) {
      setProfile((p) => ({
        ...p,
        name:  user.displayName || p.name,
        email: user.email       || p.email,
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
    localStorage.setItem('authority_profile', JSON.stringify(profile));
    setSaving(false);
    toast.success('Settings saved');
  }, [profile]);

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
            description="Manage your profile and account preferences."
          />
        </div>

        {/* Content */}
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
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
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
                    onClick={() => setProfile(initialProfile)}
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