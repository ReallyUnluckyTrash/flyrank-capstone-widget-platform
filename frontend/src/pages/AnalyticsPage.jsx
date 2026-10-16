import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3, ChevronDown, Globe2, Inbox, Plus, RefreshCw, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import Metric from '../components/Metric.jsx';
import Notice from '../components/Notice.jsx';
import PageHeading from '../components/PageHeading.jsx';
import SubmissionFeedRow from '../components/SubmissionFeedRow.jsx';
import TableSkeleton from '../components/TableSkeleton.jsx';
import { fmt, shortDate } from '../utils/format.js';
import { unwrap, unwrapList } from '../utils/data.js';
import styles from './AnalyticsPage.module.css';

export default function AnalyticsPage() {
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
        series: unwrapList(series),
        widgets: unwrapList(widgets),
        countries: unwrapList(countries),
        feed: unwrapList(feed),
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
  const countries = [...data.countries]
    .sort((a, b) => Number(b.submissions) - Number(a.submissions))
    .slice(0, 5);

  return (
    <div className={styles.root}>
      <PageHeading
        eyebrow="YOUR DATA, IN MOTION"
        title="Analytics overview"
        description="A live look at the submissions reaching your widgets."
        action={(
          <div className="heading-actions">
            <label className="select-wrap">
              <span className="sr-only">Date range</span>
              <select value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <button
              className="button secondary icon-label"
              onClick={() => analyticsQuery.refetch()}
              disabled={analyticsQuery.isFetching}
              aria-busy={analyticsQuery.isFetching}
            >
              <RefreshCw size={15} />
              <span>{analyticsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <Link className="button primary" to="/widgets/new"><Plus size={16} />New widget</Link>
          </div>
        )}
      />
      <Notice message={analyticsQuery.error?.message} />
      <div className="metric-grid">
        <Metric label="TOTAL SUBMISSIONS" value={fmt.format(total)} foot={`${fmt.format(valid)} accepted`} icon={Inbox} tone="mint" loading={loading} />
        <Metric label="ACTIVE WIDGETS" value={fmt.format(widgetsCount)} foot="Configured in this workspace" icon={WalletCards} tone="blue" loading={loading} />
        <Metric label="VALID SUBMISSIONS" value={fmt.format(valid)} foot={total ? `${((valid / total) * 100).toFixed(1)}% of all submissions` : 'No submissions yet'} icon={TrendingUp} tone="mint" loading={loading} />
        <Metric label="SPAM BLOCKED" value={fmt.format(spam)} foot={total ? `${((spam / total) * 100).toFixed(1)}% of all submissions` : 'Spam protection active'} icon={ShieldCheck} tone="peach" loading={loading} />
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SUBMISSION ACTIVITY</span>
              <h2>Daily volume</h2>
              <p>Submissions recorded each day, including flagged entries.</p>
            </div>
            <span className="legend"><i /> Submissions</span>
          </div>
          {loading && !data.series.length ? (
            <div className="chart-skeleton" role="status" aria-label="Loading submission activity">
              {[28, 52, 36, 72, 44, 86, 61, 39].map((height, index) => (
                <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 18}ms` }} />
              ))}
            </div>
          ) : data.series.length ? (
            <div className="volume-chart">
              <div className="chart-axis">
                {[peak, Math.round(peak * .66), Math.round(peak * .33), 0].map((value, index) => (
                  <div key={index}><span>{fmt.format(value)}</span><i /></div>
                ))}
              </div>
              <div className="chart-columns">
                {data.series.map((point, index) => (
                  <div className="chart-column" key={point.date} title={`${shortDate(point.date)}: ${point.submissions}`}>
                    <span
                      style={{
                        '--bar-height': `${Math.max((Number(point.submissions) / peak) * 100, 3)}%`,
                        '--bar-index': index,
                      }}
                    />
                    <small>
                      {index === 0 || index === data.series.length - 1 || index % Math.ceil(data.series.length / 5) === 0
                        ? shortDate(point.date)
                        : ''}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="Nothing to chart yet" description="Submission activity will appear here once your widgets start receiving entries." />
          )}
        </section>
        <section className="panel country-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">VISITOR LOCATIONS</span><h2>Where they come from</h2></div>
            <Globe2 size={18} className="muted-icon" />
          </div>
          {countries.length ? (
            <div className="country-list">
              {countries.map((country, index) => {
                const pct = total ? (Number(country.submissions) / total) * 100 : 0;
                return (
                  <div className="country-row" key={country.country}>
                    <div className="country-label">
                      <b>{country.country || 'Unknown'}</b>
                      <span>{fmt.format(Number(country.submissions))}</span>
                    </div>
                    <div className="progress-track">
                      <i
                        style={{
                          '--progress-width': `${pct}%`,
                          backgroundColor: ['#087d56', '#52a788', '#92c4ac', '#e8aa68', '#6599a0'][index % 5],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Globe2} title="No location data yet" description="Countries appear here after the first submission." />
          )}
          <div className="country-foot">
            <span>COUNTRY MATCHES</span>
            <b>{total ? `${Math.round((countries.reduce((sum, item) => sum + Number(item.submissions), 0) / total) * 100)}% of total` : 'No data'}</b>
          </div>
        </section>
      </div>
      <section className="panel data-panel">
        <div className="panel-heading panel-heading-row">
          <div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest submissions</h2></div>
          <Link className="text-link" to="/submissions">Browse widgets <ArrowRight size={15} /></Link>
        </div>
        {loading && !data.feed.length ? (
          <TableSkeleton label="Loading recent submissions" columns={6} rows={4} />
        ) : data.feed.length ? (
          <div className="table-scroll" aria-busy={analyticsQuery.isFetching}>
            <table className="data-table">
              <thead><tr><th>RECEIVED</th><th>WIDGET</th><th>SUBMISSION</th><th>LOCATION</th><th>STATUS</th><th /></tr></thead>
              <tbody>{data.feed.map((item) => <SubmissionFeedRow key={item.id} item={item} />)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title={loading ? 'Loading submissions' : 'Your stream is quiet'}
            description={loading ? 'Fetching the latest activity.' : 'New submissions will appear here as soon as they arrive.'}
          />
        )}
        <div className={`table-foot ${analyticsQuery.isFetching ? 'is-refreshing' : ''}`}>
          <span><i className="status-dot" /> Refreshes every 30 seconds</span>
          <span>Showing up to 7 latest entries</span>
        </div>
      </section>
    </div>
  );
}
