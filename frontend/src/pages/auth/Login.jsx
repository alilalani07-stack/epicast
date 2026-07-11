import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Field from '../../components/ui/Field.jsx';
import Panel from '../../components/ui/Panel.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES, resetPassword } from '../../services/auth.service.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { signIn } = useAuth();

  const initialRole = params.get('role') === 'clinic' ? ROLES.CLINIC : ROLES.AUTHORITY;
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setFieldError('Please enter your email first to reset password.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
      setFieldError(null);
    } catch (err) {
      setFieldError(err.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const r = params.get('role');
    if (r === ROLES.CLINIC || r === ROLES.AUTHORITY) setRole(r);
  }, [params]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFieldError(null);
    if (!email || !password) {
      setFieldError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn({ email, password, role });
      toast.success('Signed in');
      // Honor the original destination if the user was bounced from a protected route.
      const fromState = location.state?.from?.pathname;
      const dest = fromState || (role === ROLES.AUTHORITY ? '/authority/dashboard' : '/clinic/dashboard');
      // `replace` so Back from the dashboard does not return to /login.
      navigate(dest, { replace: true });
    } catch (err) {
      setFieldError(err.message || 'Could not sign you in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel padded={false} elevated className="overflow-hidden">
      <div className="px-9 pt-9 pb-6 border-b border-line">
        <div className="eyebrow mb-2">{role === ROLES.AUTHORITY ? 'Authority Access' : 'Clinic Access'}</div>
        <h1 className="display text-[32px] text-ink">Welcome back</h1>
        <p className="text-[14.5px] text-mute mt-3">
          Access epidemic intelligence and forecasting tools.
        </p>
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

        <Field label="Email address" required htmlFor="email">
          <Input
            id="email"
            type="email"
            icon={Mail}
            placeholder={role === ROLES.AUTHORITY ? 'you@authority.gov' : 'you@clinic.org'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" required htmlFor="password">
          <Input
            id="password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        {fieldError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {fieldError}
          </div>
        )}

        <div className="flex items-center justify-between text-[13px]">
          <label className="inline-flex items-center gap-2 text-mute cursor-pointer">
            <input type="checkbox" className="accent-ink w-3.5 h-3.5" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>
          <button type="button" onClick={handleResetPassword} className="text-mute hover:text-ink">Forgot password?</button>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={loading} iconRight={ArrowRight} className="w-full">
          Sign in
        </Button>

        <div className="text-center text-[13px] text-mute">
          Don't have an account?{' '}
          <Link to={`/register?role=${role}`} className="text-ink font-medium hover:underline">Create one</Link>
        </div>
      </form>
    </Panel>
  );
}
