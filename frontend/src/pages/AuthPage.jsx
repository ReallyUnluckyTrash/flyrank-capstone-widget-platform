import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api, jsonBody, session } from '../api.js';
import Notice from '../components/Notice.jsx';

export default function AuthPage({ initialMode = 'login', onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        await api('/auth/signup', { method: 'POST', body: jsonBody({ email, password }) });
      }
      const tokens = await api('/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password, company_name: company || undefined }),
      });
      session.save(tokens);
      const profile = await api('/auth/protected/profile');
      onAuthenticated(profile);
      navigate('/analytics');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="auth-kicker">FLYRANK WIDGETS</span>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <p className="auth-description">
            {mode === 'login' ? 'Manage widgets and view submissions.' : 'Create an account to get started.'}
          </p>
          <Notice message={error} />
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && (
              <label>
                Company name <span className="optional">OPTIONAL</span>
                <input
                  autoComplete="organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Acme, Inc."
                />
              </label>
            )}
            <label>
              Work email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength="6"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            <button className="button primary auth-submit" disabled={busy}>
              {busy ? (
                <><span className="button-loader" />Working…</>
              ) : (
                <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={17} /></>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? 'New to Flyrank Widgets?' : 'Already have an account?'}{' '}
            <button onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
