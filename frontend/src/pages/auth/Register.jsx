import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Field from '../../components/ui/Field.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../services/auth.service.js';

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register } = useAuth();

  const initialRole = params.get('role') === 'authority' ? ROLES.AUTHORITY : ROLES.CLINIC;
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ name: '', org: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  useEffect(() => {
    const r = params.get('role');
    if (r === ROLES.CLINIC || r === ROLES.AUTHORITY) setRole(r);
  }, [params]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setFieldError(null);
    if (!form.email || !form.password) {
      setFieldError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        displayName: form.name || form.email.split('@')[0],
        role,
      });
      toast.success('Account created');
      // `replace` so Back from the dashboard does not return to /register.
      navigate(role === ROLES.AUTHORITY ? '/authority/dashboard' : '/clinic/dashboard', { replace: true });
    } catch (err) {
      setFieldError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel padded={false} elevated>
      <div className="px-9 pt-9 pb-6 border-b border-line">
        <div className="eyebrow mb-2">{role === ROLES.AUTHORITY ? 'Authority Access' : 'Clinic Access'}</div>
        <h1 className="display text-[32px] text-ink">Create an account</h1>
        <p className="text-[14.5px] text-mute mt-3">Join EpiCast to monitor outbreaks and submit reports.</p>
      </div>

      <form onSubmit={onSubmit} className="p-9 space-y-6">
        <Tabs
          tabs={[
            { value: ROLES.AUTHORITY, label: 'Authority' },
            { value: ROLES.CLINIC, label: 'Clinic' },
          ]}
          value={role}
          onChange={setRole}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <Input icon={User} placeholder="Dr. E. Carter" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Organization" required>
            <Input
              icon={Building2}
              placeholder={role === ROLES.AUTHORITY ? 'Health Authority' : 'Riverside Clinic'}
              value={form.org}
              onChange={set('org')}
            />
          </Field>
        </div>

        <Field label="Email address" required>
          <Input type="email" icon={Mail} placeholder="you@org.com" value={form.email} onChange={set('email')} />
        </Field>

        <Field label="Password" required hint="At least 6 characters">
          <Input type="password" icon={Lock} placeholder="••••••••" value={form.password} onChange={set('password')} />
        </Field>

        {fieldError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {fieldError}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" loading={loading} iconRight={ArrowRight} className="w-full">
          Create account
        </Button>

        <div className="text-center text-[13px] text-mute">
          Already have an account?{' '}
          <Link to={`/login?role=${role}`} className="text-ink font-medium hover:underline">Sign in</Link>
        </div>
      </form>
    </Panel>
  );
}
