import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, MapPin, Building2, LogOut } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader.jsx';
import Panel from '../../components/ui/Panel.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageTransition from '../../components/layout/PageTransition.jsx';

import dashboardService from '../../services/dashboard.service.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'RC'
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clinicName: '',
    contactName: '',
    email: '',
    phone: '',
    area: '',      // area_id
    areaName: '',  // display name
  });

  const [filters, setFilters] = useState({ areas: [] });

  useEffect(() => {
    const saved = localStorage.getItem('clinic_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm((f) => ({
          ...f,
          ...parsed,
          contactName: user?.displayName || parsed.contactName || '',
          email: user?.email || parsed.email || '',
        }));
      } catch {
        // ignore corrupt localStorage
      }
    } else if (user) {
      setForm((f) => ({
        ...f,
        contactName: user.displayName || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    dashboardService.getFilters({ allowFallback: false }).then(setFilters).catch(() => {
      toast.error('Could not load area options.');
    });
  }, []);

  const save = () => {
    localStorage.setItem('clinic_profile', JSON.stringify(form));
    toast.success('Profile updated');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/', { replace: true });
  };

  const selectedArea = filters.areas.find((a) => a.area_id === form.area);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clinic Portal"
        title="Clinic Profile"
        description="Information about your clinic and primary contact."
        actions={
          <Button variant="primary" icon={Save} onClick={save}>
            Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel>
            <SectionHeader
              title="Details"
              description="How your clinic appears across the platform."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Clinic name">
                <Input
                  value={form.clinicName}
                  onChange={(e) =>
                    setForm({ ...form, clinicName: e.target.value })
                  }
                />
              </Field>
              <Field label="Primary contact">
                <Input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} readOnly />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </Field>
              <Field label="Primary area">
                <Select
                  value={form.area}
                  onChange={(e) => {
                    const areaId = e.target.value;
                    const areaObj = filters.areas.find(
                      (a) => a.area_id === areaId
                    );
                    setForm({
                      ...form,
                      area: areaId,
                      areaName: areaObj?.area_name || '',
                    });
                  }}
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
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-ink text-white flex items-center justify-center text-[16px] font-semibold">
                {initials(form.clinicName)}
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-ink">
                  {form.clinicName}
                </div>
                <div className="text-[11.5px] text-mute mt-0.5">
                  Verified clinic
                </div>
              </div>
            </div>
            <div className="space-y-2.5 text-[12.5px] text-ink-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-mute" />
                Independent clinic
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-mute" />
                {selectedArea?.area_name || form.areaName || form.area || '—'}
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Badge variant="success" dot>
                Active
              </Badge>
              <Badge variant="info">Tier 1</Badge>
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Session" />
            <p className="text-[12.5px] text-mute mb-4">
              Sign out of EpiCast on this device.
            </p>
            <Button variant="danger" icon={LogOut} onClick={handleSignOut}>
              Sign out
            </Button>
          </Panel>
        </div>
      </div>
    </PageTransition>
  );
}