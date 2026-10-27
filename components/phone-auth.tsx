'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { useForge } from '@/components/forge-provider';
import { api } from '@/lib/api';
export function PhoneAuth() {
  const { workspace, loading, action, busy, formError, setFormError } = useForge();
  const [step, setStep] = useState<'phone' | 'name' | 'otp'>('phone'),
    [phone, setPhone] = useState(''),
    [name, setName] = useState(''),
    [checking, setChecking] = useState(false),
    [otp, setOtp] = useState('');
  async function lookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d ()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      setFormError('Enter a phone number with 7–15 digits.');
      return;
    }
    setChecking(true);
    setFormError('');
    try {
      const result = await api<{ registered: boolean; name?: string }>('/auth/demo-phone/check', {
        phone,
      });
      setName(result.registered ? result.name! : '');
      setStep(result.registered ? 'otp' : 'name');
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  function nameNext(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Enter your name to continue.');
      return;
    }
    setFormError('');
    setName(name.trim());
    setStep('otp');
  }
  const back = (
    <button
      type="button"
      className="text-link"
      onClick={() => {
        setStep('phone');
        setFormError('');
      }}
    >
      <ArrowLeft size={15} />
      Change phone number
    </button>
  );
  const error = formError && (
    <p className="form-error" role="alert">
      {formError}
    </p>
  );
  return (
    <>
      <div className="eyebrow account-auth-eyebrow">ACCOUNT ACCESS</div>
      <h2>
        {step === 'phone'
          ? workspace.user
            ? 'Switch account.'
            : 'Welcome to EventForge.'
          : step === 'name'
            ? 'Create your profile.'
            : 'Enter your OTP.'}
      </h2>
      <p className="account-auth-copy">
        {step === 'phone' ? (
          'Enter your phone number to continue.'
        ) : step === 'name' ? (
          'Tell us your name to finish setting up your account.'
        ) : (
          <>
            Continue as <strong>{name}</strong> with {phone}.
          </>
        )}
      </p>
      {loading ? (
        <div className="loading">
          <Loader2 className="spin" />
          Loading account access
        </div>
      ) : !workspace.demoAuthEnabled ? (
        <p className="form-error">Phone access is currently unavailable.</p>
      ) : step === 'phone' ? (
        <form className="form" onSubmit={lookup}>
          <label>
            Phone number
            <div className="phone-input">
              <Phone size={17} />
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                autoFocus
              />
            </div>
          </label>
          {error}
          <button className="button black" disabled={checking}>
            {checking ? (
              <>
                <Loader2 size={17} className="spin" />
                Please wait...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      ) : step === 'name' ? (
        <form className="form" onSubmit={nameNext}>
          <label>
            Your name
            <input
              name="name"
              required
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              autoFocus
            />
          </label>
          {error}
          <button className="button black">
            Continue to OTP
            <ArrowRight size={17} />
          </button>
          {back}
        </form>
      ) : (
        <form className="form" onSubmit={(e) => action(e, '/auth/demo-phone', 'You’re signed in.')}>
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="name" value={name} />
          <label>
            4-digit OTP
            <div className="otp-input">
              <input
                className="otp-native-input"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={4}
                maxLength={4}
                pattern="[0-9]{4}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoFocus
              />
              <div className="otp-boxes" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={i === Math.min(otp.length, 3) ? 'otp-current' : ''}>
                    {otp[i] || <span className="otp-placeholder">–</span>}
                  </span>
                ))}
              </div>
            </div>
          </label>
          {error}
          <button className="button black" disabled={busy || otp.length !== 4}>
            {busy ? (
              <>
                <Loader2 size={17} className="spin" />
                Signing in...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={17} />
              </>
            )}
          </button>
          {back}
        </form>
      )}
    </>
  );
}
