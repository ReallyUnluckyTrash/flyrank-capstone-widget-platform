import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, Bolt, Check, ChevronDown, CircleHelp, Code2, Copy, ExternalLink, Eye, FileText, Globe2, Inbox, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, TrendingUp, Users, WalletCards, X, Zap } from 'lucide-react';
import { api, getWidgetEmbedSnippet, jsonBody, session } from './api.js';

const locale = 'en-US';
const fmt = new Intl.NumberFormat(locale);
const shortDate = (value) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
const dateTime = (value) => new Date(value).toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const unwrap = (value) => value?.data ?? value;

async function fetchWidgets() {
  const [widgetResult, statResult] = await Promise.all([api('/widgets'), api('/dashboard/stats/widget')]);
  const stats = new Map((unwrap(statResult) || []).map((item) => [item.widget_id, Number(item.submissions)]));
  return (unwrap(widgetResult) || []).map((widget) => ({ ...widget, submission_count: stats.get(widget.id) || 0 }));
}

function Notice({ message, kind = 'error' }) {
  if (!message) return null;
  return <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'error' ? <CircleHelp size={16} /> : <Check size={16} />}{message}</div>;
}

function ModalDialog({ children, onClose, ariaLabel, className = '' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => [...dialog.querySelectorAll(focusableSelector)];
    (focusable()[0] || dialog).focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === items[0] || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          items[0].focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className={`modal-card ${className}`} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}>{children}</section></div>;
}

function App() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(Boolean(session.token));
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session.token) { setChecking(false); setProfile(null); return; }
    let active = true;
    api('/auth/protected/profile')
      .then((data) => { if (active) setProfile(data); })
      .catch(() => { if (active) setProfile(null); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  function signOut() {
    session.clear();
    queryClient.clear();
    setProfile(null);
    navigate('/login');
  }

  if (checking) return <div className="screen-loading"><span className="loader" />Restoring your workspace</div>;

  return <Routes>
    <Route path="/login" element={profile ? <Navigate to="/analytics" replace /> : <AuthPage onAuthenticated={setProfile} />} />
    <Route path="/signup" element={profile ? <Navigate to="/analytics" replace /> : <AuthPage initialMode="signup" onAuthenticated={setProfile} />} />
    <Route path="/" element={<Navigate to={profile ? '/analytics' : '/login'} replace />} />
    <Route path="/*" element={profile ? <Workspace profile={profile} onSignOut={signOut} mobileNav={mobileNav} setMobileNav={setMobileNav} /> : <Navigate to="/login" replace />} />
  </Routes>;
}

function AuthPage({ initialMode = 'login', onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'signup') await api('/auth/signup', { method: 'POST', body: jsonBody({ email, password }) });
      const tokens = await api('/auth/login', { method: 'POST', body: jsonBody({ email, password, company_name: company || undefined }) });
      session.save(tokens);
      const profile = await api('/auth/protected/profile');
      onAuthenticated(profile);
      navigate('/analytics');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-layout">
    <section className="auth-panel">
      <div className="auth-form-wrap">
        <span className="auth-kicker">FLYRANK WIDGETS</span>
        <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <p className="auth-description">{mode === 'login' ? 'Manage widgets and view submissions.' : 'Create an account to get started.'}</p>
        <Notice message={error} />
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <label>Company name <span className="optional">OPTIONAL</span><input autoComplete="organization" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme, Inc." /></label>}
          <label>Work email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
          <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
          <button className="button primary auth-submit" disabled={busy}>{busy ? <><span className="button-loader" />Working…</> : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={17} /></>}</button>
        </form>
        <p className="auth-switch">{mode === 'login' ? 'New to Flyrank Widgets?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      </div>
    </section>
  </main>;
}

const navItems = [
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/widgets', label: 'Widgets', icon: WalletCards },
  { to: '/submissions', label: 'Submissions', icon: Inbox },
];

function Workspace({ profile, onSignOut, mobileNav, setMobileNav }) {
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const title = location.pathname.startsWith('/widgets') ? 'Widget studio' : location.pathname.startsWith('/submissions') ? 'Submissions' : 'Analytics overview';
  const initials = (profile.email || 'U').slice(0, 1).toUpperCase();
  useEffect(() => {
    if (!mobileNav) return undefined;
    const sidebar = sidebarRef.current;
    const focusableSelector = 'a[href], button:not([disabled])';
    const focusable = () => [...sidebar.querySelectorAll(focusableSelector)];
    focusable()[0]?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileNav(false);
        menuButtonRef.current?.focus();
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        if (event.shiftKey && (document.activeElement === items[0] || !sidebar.contains(document.activeElement))) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !sidebar.contains(document.activeElement))) {
          event.preventDefault();
          items[0].focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNav, setMobileNav]);
  function closeMobileNav() {
    setMobileNav(false);
    menuButtonRef.current?.focus();
  }
  return <div className="app-shell">
    <aside ref={sidebarRef} id="workspace-nav" className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <Link to="/analytics" className="sidebar-brand"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span><span>FLYRANK WIDGETS</span></Link>
      <div className="workspace-select"><span className="workspace-avatar">{initials}</span><span><small>WORKSPACE</small><b>{profile.email.split('@')[1] || 'Personal'}</b></span></div>
      <span className="nav-heading">WORKSPACE</span>
      <nav className="side-nav" aria-label="Workspace">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item signout" onClick={onSignOut}><LogOut size={18} /><span>Sign out</span></button></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={closeMobileNav} />}
    <div className="main-column">
      <header className="topbar"><button ref={menuButtonRef} className="icon-button menu-toggle" aria-label="Open navigation" aria-expanded={mobileNav} aria-controls="workspace-nav" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>WORKSPACE</span><span className="breadcrumb-slash">/</span><b>{title}</b></div><div className="topbar-right"><div className="user-menu"><span className="user-avatar">{initials}</span><span><b>{profile.email}</b><small>Workspace owner</small></span></div><button className="icon-button mobile-signout" title="Sign out" aria-label="Sign out" onClick={onSignOut}><LogOut size={18} /></button></div></header>
      <main className="page-content"><Routes>
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="widgets" element={<WidgetsPage />} />
        <Route path="widgets/:id" element={<WidgetEditorPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="submissions/:id" element={<SubmissionsPage />} />
        <Route path="*" element={<Navigate to="/analytics" replace />} />
      </Routes></main>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function AnalyticsPage() {
  const [windowDays, setWindowDays] = useState(30);
  const analyticsQuery = useQuery({
    queryKey: ['analytics', windowDays],
    queryFn: async () => {
      const from = new Date(Date.now() - windowDays * 86400000).toISOString();
      const [overview, series, widgets, countries, feed] = await Promise.all([
        api('/dashboard/stats/overview'),
        api(`/dashboard/stats/timeseries?from=${encodeURIComponent(from)}`),
        api('/dashboard/stats/widget'),
        api('/dashboard/stats/country'),
        api('/dashboard/recent-submissions'),
      ]);
      return {
        overview: unwrap(overview),
        series: unwrap(series) || [],
        widgets: unwrap(widgets) || [],
        countries: unwrap(countries) || [],
        feed: unwrap(feed) || [],
      };
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  const data = analyticsQuery.data || { overview: null, series: [], widgets: [], countries: [], feed: [] };
  const loading = analyticsQuery.isLoading;

  const total = Number(data.overview?.total_submissions || 0);
  const spam = Number(data.overview?.spam_count || 0);
  const widgetsCount = Number(data.overview?.total_widgets || 0);
  const valid = Math.max(total - spam, 0);
  const peak = data.series.reduce((max, entry) => Math.max(max, Number(entry.submissions)), 1);
  const countries = [...data.countries].sort((a, b) => Number(b.submissions) - Number(a.submissions)).slice(0, 5);

  return <>
    <PageHeading eyebrow="YOUR DATA, IN MOTION" title="Analytics overview" description="A live look at the submissions reaching your widgets." action={<div className="heading-actions"><label className="select-wrap"><span className="sr-only">Date range</span><select value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><ChevronDown size={15} /></label><button className="button secondary icon-label" onClick={() => analyticsQuery.refetch()} disabled={analyticsQuery.isFetching} aria-busy={analyticsQuery.isFetching}><RefreshCw size={15} /><span>{analyticsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</span></button><Link className="button primary" to="/widgets/new"><Plus size={16} />New widget</Link></div>} />
    <Notice message={analyticsQuery.error?.message} />
    <div className="metric-grid">
      <Metric label="TOTAL SUBMISSIONS" value={fmt.format(total)} foot={`${fmt.format(valid)} accepted`} icon={Inbox} tone="mint" loading={loading} />
      <Metric label="ACTIVE WIDGETS" value={fmt.format(widgetsCount)} foot="Configured in this workspace" icon={WalletCards} tone="blue" loading={loading} />
      <Metric label="VALID SUBMISSIONS" value={fmt.format(valid)} foot={total ? `${((valid / total) * 100).toFixed(1)}% of all submissions` : 'No submissions yet'} icon={TrendingUp} tone="mint" loading={loading} />
      <Metric label="SPAM BLOCKED" value={fmt.format(spam)} foot={total ? `${((spam / total) * 100).toFixed(1)}% of all submissions` : 'Spam protection active'} icon={ShieldCheck} tone="peach" loading={loading} />
    </div>
    <div className="analytics-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">SUBMISSION ACTIVITY</span><h2>Daily volume</h2><p>Submissions recorded each day, including flagged entries.</p></div><span className="legend"><i /> Submissions</span></div>
        {loading && !data.series.length ? <div className="empty-chart"><span className="loader" /></div> : data.series.length ? <div className="volume-chart"><div className="chart-axis">{[peak, Math.round(peak * .66), Math.round(peak * .33), 0].map((value, index) => <div key={index}><span>{fmt.format(value)}</span><i /></div>)}</div><div className="chart-columns">{data.series.map((point, index) => <div className="chart-column" key={point.date} title={`${shortDate(point.date)}: ${point.submissions}`}><span style={{ height: `${Math.max((Number(point.submissions) / peak) * 100, 3)}%` }} /><small>{index === 0 || index === data.series.length - 1 || index % Math.ceil(data.series.length / 5) === 0 ? shortDate(point.date) : ''}</small></div>)}</div></div> : <EmptyState icon={BarChart3} title="Nothing to chart yet" description="Submission activity will appear here once your widgets start receiving entries." />}
      </section>
      <section className="panel country-panel"><div className="panel-heading"><div><span className="eyebrow">VISITOR LOCATIONS</span><h2>Where they come from</h2></div><Globe2 size={18} className="muted-icon" /></div>
        {countries.length ? <div className="country-list">{countries.map((country, index) => { const pct = total ? (Number(country.submissions) / total) * 100 : 0; return <div className="country-row" key={country.country}><div className="country-label"><b>{country.country || 'Unknown'}</b><span>{fmt.format(Number(country.submissions))}</span></div><div className="progress-track"><i style={{ width: `${pct}%`, backgroundColor: ['#087d56', '#52a788', '#92c4ac', '#e8aa68', '#6599a0'][index % 5] }} /></div></div>; })}</div> : <EmptyState icon={Globe2} title="No location data yet" description="Countries appear here after the first submission." />}
        <div className="country-foot"><span>COUNTRY MATCHES</span><b>{total ? `${Math.round((countries.reduce((sum, item) => sum + Number(item.submissions), 0) / total) * 100)}% of total` : 'No data'}</b></div>
      </section>
    </div>
    <section className="panel data-panel"><div className="panel-heading panel-heading-row"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest submissions</h2></div><Link className="text-link" to="/submissions">Browse widgets <ArrowRight size={15} /></Link></div>
      {data.feed.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>RECEIVED</th><th>WIDGET</th><th>SUBMISSION</th><th>LOCATION</th><th>STATUS</th><th /></tr></thead><tbody>{data.feed.map((item) => <tr key={item.id}><td className="mono">{dateTime(item.created_at)}</td><td className="strong">{item.widget_title}</td><td>{Object.values(item.data || {}).find((value) => String(value).includes('@')) || Object.values(item.data || {})[0] || '—'}</td><td>{[item.city, item.country].filter(Boolean).join(', ') || 'Unknown'}</td><td><span className={`status-pill ${item.is_spam ? 'blocked' : 'valid'}`}><i />{item.is_spam ? 'Blocked' : 'Accepted'}</span></td><td><Link className="row-action" to={`/submissions/${item.widget_id}`} title="View widget submissions" aria-label={`View submissions for ${item.widget_title}`}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div> : <EmptyState icon={Inbox} title={loading ? 'Loading submissions' : 'Your stream is quiet'} description={loading ? 'Fetching the latest activity.' : 'New submissions will appear here as soon as they arrive.'} />}
      <div className="table-foot"><span><i className="status-dot" /> Refreshes every 30 seconds</span><span>Showing up to 7 latest entries</span></div>
    </section>
  </>;
}

function Metric({ label, value, foot, icon: Icon, tone, loading }) {
  return <section className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><div className="metric-value">{loading ? <span className="metric-skeleton" /> : value}</div><div className="metric-foot">{foot}</div></section>;
}

function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={19} /></span><b>{title}</b><p>{description}</p>{action}</div>;
}

const defaultFields = [
  { name: 'name', label: 'Full name', type: 'text', required: true },
  { name: 'email', label: 'Work email', type: 'email', required: true },
];

function withClientId(field) {
  return { ...field, id: field.id || crypto.randomUUID() };
}

function WidgetsPage() {
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState(null);
  const [copied, setCopied] = useState('');
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const widgetsQuery = useQuery({
    queryKey: ['widgets'],
    queryFn: fetchWidgets,
  });
  const widgets = widgetsQuery.data || [];
  const deleteMutation = useMutation({
    mutationFn: (widget) => api(`/widgets/${widget.id}`, { method: 'DELETE' }),
    onSuccess: (_, widget) => {
      queryClient.setQueryData(['widgets'], (items = []) => items.filter((item) => item.id !== widget.id));
      setWidgetToDelete(null);
    },
  });

  useEffect(() => {
    if (location.state?.create) {
      setEditorOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const filtered = useMemo(() => widgets.filter((widget) => `${widget.title} ${widget.id}`.toLowerCase().includes(query.toLowerCase())), [widgets, query]);

  function removeWidget(widget) { deleteMutation.mutate(widget); }

  async function copySnippet(widget) {
    const snippet = getWidgetEmbedSnippet(widget.id);
    try { await navigator.clipboard.writeText(snippet); setCopied(widget.id); window.setTimeout(() => setCopied(''), 1600); }
    catch { setActionError('Clipboard access is unavailable in this browser.'); }
  }

  return <>
    <PageHeading eyebrow="CONFIGURE YOUR CAPTURE" title="Widgets" description="Create, refine, and publish the forms collecting your submissions." action={<button className="button primary" onClick={() => setEditorOpen(true)}><Plus size={16} />Create widget</button>} />
    <Notice message={actionError || widgetsQuery.error?.message} />
    <section className="panel widgets-panel"><div className="list-toolbar"><div className="list-summary"><span className="eyebrow">YOUR CONFIGURATIONS</span><h2>Widget library <span>{widgets.length}</span></h2></div><div className="list-filters"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search widgets" /></label><button className="icon-button filter-refresh" title="Refresh widgets" aria-label="Refresh widgets" onClick={() => widgetsQuery.refetch()} disabled={widgetsQuery.isFetching} aria-busy={widgetsQuery.isFetching}><RefreshCw size={16} /></button></div></div>
      {widgetsQuery.isLoading ? <div className="loading-row"><span className="loader" />Loading widget configurations</div> : filtered.length ? <div className="table-scroll"><table className="data-table widgets-table"><thead><tr><th>WIDGET</th><th>FIELDS</th><th>SUBMISSIONS</th><th>CREATED</th><th>STATUS</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{filtered.map((widget) => <WidgetRow key={widget.id} widget={widget} onEdit={() => navigate(`/widgets/${widget.id}`)} onDelete={() => { deleteMutation.reset(); setWidgetToDelete(widget); }} onCopy={() => copySnippet(widget)} copied={copied === widget.id} />)}</tbody></table></div> : <EmptyState icon={WalletCards} title={query ? 'No matching widgets' : 'No widgets configured'} description={query ? 'Try a different search term.' : 'Create your first capture form and publish it on your site.'} action={!query && <button className="button primary" onClick={() => setEditorOpen(true)}><Plus size={15} />Create widget</button>} />}
      <div className="table-foot"><span>Showing {filtered.length} of {widgets.length} widgets</span><span>Widget configurations are private to your workspace</span></div>
    </section>
    {editorOpen && <WidgetFormModal onClose={() => setEditorOpen(false)} onSaved={(saved) => { const widget = { ...saved, form_fields: Array.isArray(saved.form_fields) ? saved.form_fields : [], created_at: saved.created_at || new Date().toISOString(), submission_count: Number(saved.submission_count || 0) }; queryClient.setQueryData(['widgets'], (items = []) => [widget, ...items.filter((item) => item.id !== widget.id)]); queryClient.invalidateQueries({ queryKey: ['widgets'] }); setEditorOpen(false); navigate(`/widgets/${widget.id}`); }} />}
    {widgetToDelete && <ModalDialog ariaLabel="Confirm widget deletion" onClose={() => { if (!deleteMutation.isPending) setWidgetToDelete(null); }}><div className="modal-heading"><div><span className="eyebrow">DELETE WIDGET</span><h2>Delete “{widgetToDelete.title}”?</h2><p>This also permanently deletes its submissions.</p></div><button className="icon-button" aria-label="Close delete confirmation" disabled={deleteMutation.isPending} onClick={() => setWidgetToDelete(null)}><X size={18} /></button></div><Notice message={deleteMutation.error?.message} /><div className="modal-actions"><button className="button secondary" disabled={deleteMutation.isPending} onClick={() => setWidgetToDelete(null)}>Cancel</button><button className="button danger-button" disabled={deleteMutation.isPending} onClick={() => removeWidget(widgetToDelete)}>{deleteMutation.isPending ? 'Deleting…' : 'Delete widget'}</button></div></ModalDialog>}
  </>;
}

function WidgetRow({ widget, onEdit, onDelete, onCopy, copied }) {
  const fields = Array.isArray(widget.form_fields) ? widget.form_fields.filter((field) => !field.honeypot) : [];
  return <tr><td><div className="widget-name-cell"><span className="widget-symbol"><Bolt size={17} /></span><span><b>{widget.title}</b><small className="mono">{widget.id}</small></span></div></td><td>{fields.length} {fields.length === 1 ? 'field' : 'fields'}</td><td className="mono">{fmt.format(widget.submission_count || 0)}</td><td>{shortDate(widget.created_at)}</td><td><span className="status-pill valid"><i />Configured</span></td><td><div className="row-actions"><button className="row-action" title={copied ? 'Copied' : 'Copy embed snippet'} aria-label={copied ? 'Copied embed snippet' : 'Copy embed snippet'} onClick={onCopy}>{copied ? <Check size={16} /> : <Code2 size={16} />}</button><button className="row-action" title="Edit widget" aria-label="Edit widget" onClick={onEdit}><SlidersHorizontal size={16} /></button><button className="row-action danger-action" title="Delete widget" aria-label="Delete widget" onClick={onDelete}><Trash2 size={16} /></button></div></td></tr>;
}

function WidgetFormModal({ widget, onClose, onSaved }) {
  const [title, setTitle] = useState(widget?.title || '');
  const [description, setDescription] = useState(widget?.description || '');
  const [buttonText, setButtonText] = useState(widget?.button_text || 'Sign up');
  const [fields, setFields] = useState(() => (widget?.form_fields || defaultFields).filter((field) => !field.honeypot).map(withClientId));
  const [validationError, setValidationError] = useState('');
  const saveMutation = useMutation({
    mutationFn: (body) => widget
      ? api(`/widgets/${widget.id}`, { method: 'PATCH', body: jsonBody(body) })
      : api('/widgets', { method: 'POST', body: jsonBody(body) }),
  });
  const busy = saveMutation.isPending;
  const error = validationError || saveMutation.error?.message;
  const duplicateFieldIds = useMemo(() => {
    const counts = new Map();
    fields.forEach((field) => {
      const key = field.name.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set(fields.filter((field) => field.name.trim() && counts.get(field.name.trim().toLowerCase()) > 1).map((field) => field.id));
  }, [fields]);

  function submit(event) {
    event.preventDefault();
    saveMutation.reset();
    if (!fields.length || fields.some((field) => !field.name.trim() || !field.label.trim() || !field.type)) {
      setValidationError('Add at least one field with a label, key, and type.');
      return;
    }
    if (duplicateFieldIds.size) {
      setValidationError('Each field key must be unique.');
      return;
    }
    setValidationError('');
    const formFields = fields.map(({ id, ...field }) => field);
    saveMutation.mutate({ title, description, button_text: buttonText, form_fields: formFields }, {
      onSuccess: (response) => onSaved(unwrap(response)),
    });
  }

  return <ModalDialog ariaLabel={widget ? 'Edit widget configuration' : 'Create a widget'} className="builder-modal" onClose={onClose}><div className="modal-heading"><div><span className="eyebrow">{widget ? 'EDIT CONFIGURATION' : 'FAST PROVISION'}</span><h2>{widget ? 'Update widget' : 'Create a widget'}</h2><p>Set up the public capture form and its fields.</p></div><button className="icon-button" aria-label="Close widget form" onClick={onClose}><X size={18} /></button></div><Notice message={error} /><form onSubmit={submit} className="widget-form"><div className="builder-modal-grid"><div className="builder-fields"><label>Widget title<input required maxLength="120" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Product updates" /></label><label>Description <span className="optional">OPTIONAL</span><textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell visitors what happens when they sign up." /></label><label>Submit button text<input required maxLength="60" value={buttonText} onChange={(event) => setButtonText(event.target.value)} /></label><FieldConfigurator fields={fields} setFields={setFields} duplicateFieldIds={duplicateFieldIds} /></div><div className="field-preview"><div className="preview-toolbar"><span><i /> LIVE PREVIEW</span><span>WIDGET / FORM</span></div><div className="preview-card"><span className="preview-brand"><Zap size={12} fill="currentColor" /> FLYRANK WIDGET</span><h3>{title || 'Your widget title'}</h3><p>{description || 'Your description will appear here.'}</p>{fields.filter((field) => !field.honeypot).map((field) => <div className="preview-input" key={field.id}><span>{field.label || field.name}{field.required && <b> *</b>}</span><i /></div>)}<button type="button" className="preview-submit">{buttonText || 'Sign up'} <ArrowRight size={13} /></button><small>Protected by spam filtering</small></div></div></div><div className="form-hint"><ShieldCheck size={15} /> A honeypot field is added automatically to reduce spam.</div><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : widget ? 'Save changes' : 'Create widget'}<ArrowRight size={15} /></button></div></form></ModalDialog>;
}

function FieldConfigurator({ fields, setFields, duplicateFieldIds }) {
  function updateField(index, patch) {
    setFields((currentFields) => currentFields.map((field, current) => current === index ? { ...field, ...patch } : field));
  }
  function addField() {
    setFields((currentFields) => [...currentFields, withClientId({ name: `field_${currentFields.length + 1}`, label: 'New field', type: 'text', required: false })]);
  }
  function removeField(index) {
    setFields((currentFields) => currentFields.filter((_, current) => current !== index));
  }
  return <section className="field-configurator"><div className="field-config-heading"><span>CAPTURE FIELDS <b>{fields.length}</b></span><button type="button" onClick={addField}><Plus size={14} />Add field</button></div>{fields.length ? fields.map((field, index) => <div className="builder-field-row" key={field.id}><span className="field-type-icon"><FileText size={14} /></span><div className="builder-field-grid"><input aria-label="Field label" required value={field.label || ''} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="Field label" /><div><input aria-label="Field key" required aria-invalid={duplicateFieldIds.has(field.id)} value={field.name || ''} onChange={(event) => updateField(index, { name: event.target.value })} placeholder="field_key" />{duplicateFieldIds.has(field.id) && <small className="field-error">Field keys must be unique.</small>}</div><select aria-label="Field type" value={field.type || 'text'} onChange={(event) => updateField(index, { type: event.target.value })}><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="url">Website URL</option><option value="number">Number</option></select></div><label className="required-toggle"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} />Required</label><button type="button" className="row-action danger-action" title="Remove field" aria-label={`Remove ${field.label || field.name || 'field'}`} onClick={() => removeField(index)}><Trash2 size={15} /></button></div>) : <p className="fields-empty">Add at least one field to collect a submission.</p>}</section>;
}

function WidgetEditorPage() {
  const { id } = useParams();
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const widgetQuery = useQuery({
    queryKey: ['widget', id],
    queryFn: async () => unwrap(await api(`/widgets/${id}`)),
    enabled: id !== 'new',
  });
  const widget = widgetQuery.data;
  useEffect(() => {
    if (id === 'new') { navigate('/widgets', { replace: true, state: { create: true } }); return; }
    setEditing(false);
  }, [id, navigate]);
  async function copy() {
    if (!widget) return;
    try {
      await navigator.clipboard.writeText(getWidgetEmbedSnippet(widget.id));
      setCopied(true); window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionError('Clipboard access is unavailable in this browser.');
    }
  }
  return <>
    <div className="back-row"><Link to="/widgets"><ArrowLeft size={16} />All widgets</Link></div>
    <PageHeading eyebrow="WIDGET CONFIGURATION" title={widget?.title || 'Widget details'} description="Edit the form settings and copy the embed code for your site." action={widget && <button className="button secondary" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy embed'}</button>} />
    <Notice message={actionError || widgetQuery.error?.message} />
    {widgetQuery.isLoading && <div className="loading-row"><span className="loader" />Loading widget configuration</div>}
    {widget && <div className="editor-grid"><section className="panel editor-panel"><div className="panel-heading"><div><span className="eyebrow">FORM SCHEMA</span><h2>Configuration</h2></div><span className="id-tag">{widget.id.slice(0, 8)}</span></div><div className="detail-list"><Detail label="Display title" value={widget.title} /><Detail label="Description" value={widget.description || 'No description'} /><Detail label="Button text" value={widget.button_text} /><Detail label="Created" value={dateTime(widget.created_at)} /></div><h3 className="subsection-title">Capture fields <span>{(widget.form_fields || []).filter((field) => !field.honeypot).length}</span></h3><div className="field-list">{(widget.form_fields || []).filter((field) => !field.honeypot).map((field) => <div className="field-row" key={field.name}><span className="field-type-icon"><FileText size={15} /></span><span><b>{field.label}</b><small className="mono">{field.name} · {field.type}</small></span><span className={`field-required ${field.required ? 'required' : ''}`}>{field.required ? 'Required' : 'Optional'}</span></div>)}</div><button className="button primary editor-edit" onClick={() => setEditing(true)}><SlidersHorizontal size={15} />Edit configuration</button></section><section className="panel snippet-panel"><div className="panel-heading"><div><span className="eyebrow">PUBLISH</span><h2>Embed on your site</h2></div><Code2 size={18} className="muted-icon" /></div><p>Add this script to your page. It loads the published form from your widget configuration.</p><pre className="snippet-code"><code>{getWidgetEmbedSnippet(widget.id)}</code></pre><button className="button secondary" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy snippet'}</button><div className="snippet-note"><ShieldCheck size={16} /><span><b>Public configuration</b><small>The form can be loaded without an account. Only this widget's public fields are exposed.</small></span></div></section></div>}
    {editing && widget && <WidgetFormModal widget={widget} onClose={() => setEditing(false)} onSaved={(saved) => { queryClient.setQueryData(['widget', id], saved); queryClient.invalidateQueries({ queryKey: ['widgets'] }); setEditing(false); }} />}
  </>;
}
function Detail({ label, value }) { return <div className="detail-row"><span>{label}</span><b>{value}</b></div>; }

function SubmissionsPage() {
  const { id: routeId } = useParams();
  const [pageState, setPageState] = useState({ routeId, page: 1 });
  const selectedId = routeId || '';
  const navigate = useNavigate();
  const widgetsQuery = useQuery({
    queryKey: ['widgets'],
    queryFn: fetchWidgets,
  });
  const widgets = widgetsQuery.data || [];
  const selected = widgets.find((widget) => widget.id === selectedId);
  const page = pageState.routeId === routeId ? pageState.page : 1;
  const submissionsQuery = useQuery({
    queryKey: ['submissions', selectedId, page],
    queryFn: () => api(`/widgets/${selectedId}/submissions?page=${page}&page_size=25`),
    enabled: Boolean(selectedId),
  });
  const result = submissionsQuery.data;
  const loading = submissionsQuery.isLoading;

  useEffect(() => {
    setPageState((current) => current.routeId === routeId ? current : { routeId, page: 1 });
  }, [routeId]);

  function changeWidget(value) { navigate(value ? `/submissions/${value}` : '/submissions', { replace: true }); }
  function exportCsv() {
    const rows = result?.data || [];
    const keys = [...new Set(rows.flatMap((item) => Object.keys(item.data || {})))];
    const escape = (value) => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const csv = [['created_at', 'country', 'city', 'spam', ...keys].map(escape).join(','), ...rows.map((item) => [item.created_at, item.country, item.city, item.is_spam, ...keys.map((key) => item.data?.[key])].map(escape).join(','))].join('\n');
    const filename = (selected?.title || 'submissions')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .trim()
      .replace(/[. ]+$/g, '') || 'submissions';
    const safeFilename = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(filename) ? `_${filename}` : filename;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `${safeFilename}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  const entries = result?.data || [];
  const pagination = result?.pagination;
  return <>
    <PageHeading eyebrow="INCOMING DATA" title="Submissions" description="Inspect the entries captured by each widget." action={<div className="heading-actions">{selected && <button className="button secondary" onClick={exportCsv} disabled={!entries.length}><ArrowDownToLine size={15} />Export this page</button>}<button className="button secondary icon-only" onClick={() => submissionsQuery.refetch()} title="Refresh submissions" aria-label="Refresh submissions" disabled={!selectedId || submissionsQuery.isFetching} aria-busy={submissionsQuery.isFetching}><RefreshCw size={15} /></button></div>} />
    <Notice message={submissionsQuery.error?.message || widgetsQuery.error?.message} />
    <section className="panel submissions-panel"><div className="submission-toolbar"><div><span className="eyebrow">FILTER BY WIDGET</span><h2>{selected?.title || 'All widgets'}</h2></div><label className="select-wrap widget-select"><span className="sr-only">Choose widget</span><select value={selectedId} onChange={(event) => changeWidget(event.target.value)}><option value="">Choose a widget</option>{widgets.map((widget) => <option value={widget.id} key={widget.id}>{widget.title}</option>)}</select><ChevronDown size={15} /></label><button className="button secondary icon-only" onClick={() => submissionsQuery.refetch()} title="Refresh submissions" aria-label="Refresh submissions" disabled={!selectedId || submissionsQuery.isFetching} aria-busy={submissionsQuery.isFetching}><RefreshCw size={15} /></button></div>
      {loading ? <div className="loading-row"><span className="loader" />Loading submissions</div> : !selectedId ? <EmptyState icon={Inbox} title="Choose a widget" description="Select a widget above to inspect its submissions." action={<Link className="button primary" to="/widgets"><WalletCards size={15} />Manage widgets</Link>} /> : entries.length ? <div className="table-scroll"><table className="data-table submissions-table"><thead><tr><th>RECEIVED</th><th>CONTACT</th><th>LOCATION</th><th>FORM DATA</th><th>STATUS</th></tr></thead><tbody>{entries.map((item) => { const values = Object.entries(item.data || {}); const contact = values.find(([key]) => key.toLowerCase().includes('email'))?.[1] || values.find(([key]) => key.toLowerCase().includes('name'))?.[1] || 'Submission'; return <tr key={item.id}><td className="mono">{dateTime(item.created_at)}</td><td><b>{contact}</b><small className="mono block-id">{item.id.slice(0, 8)}</small></td><td>{[item.city, item.country].filter(Boolean).join(', ') || 'Unknown'}</td><td><div className="payload-values">{values.slice(0, 3).map(([key, value]) => <span key={key}><small>{key}</small>{String(value)}</span>)}</div></td><td><span className={`status-pill ${item.is_spam ? 'blocked' : 'valid'}`}><i />{item.is_spam ? 'Blocked' : 'Accepted'}</span></td></tr>; })}</tbody></table></div> : <EmptyState icon={Inbox} title="No submissions yet" description="When this widget receives its first entry, it will show up here." action={<Link className="button secondary" to={`/widgets/${selectedId}`}><Code2 size={15} />View embed code</Link>} />}
      {pagination && <div className="pagination"><span>{fmt.format(pagination.total)} total entries <span className="pagination-sep">·</span> Page {pagination.page} of {Math.max(pagination.total_pages, 1)}</span><div><button className="button secondary" disabled={page <= 1} onClick={() => setPageState({ routeId, page: page - 1 })}>Previous</button><button className="button secondary" disabled={page >= pagination.total_pages} onClick={() => setPageState({ routeId, page: page + 1 })}>Next</button></div></div>}
    </section>
  </>;
}

export default App;
