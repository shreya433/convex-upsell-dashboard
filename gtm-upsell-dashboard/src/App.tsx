import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { ALL_TEAMS } from "./teamsData";
import "./App.css";

type Candidate = {
  _id: Id<"candidates">;
  teamName: string;
  segment: "cost_inefficiency" | "concurrency_ceiling";
  tier: "low_touch" | "high_touch";
  plan: string;
  memberCount: number;
  functionCallsMonthly: number;
  currentMonthlyCost: number;
  nextTierCost: number;
  peakConcurrent: number;
  concurrencyLimit: number;
  signal: string;
  contacted: boolean;
};

type Tab = "all" | "strategy" | "cost" | "concurrency";
type SortKey = "calls" | "storage" | "concurrent" | "members";
type GroupKey = "plan" | "flagged";
type MetricKey = "count" | "totalCalls" | "avgCalls" | "avgStorage" | "avgConcurrent";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function calls(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString();
}

function accentFor(c: Candidate) {
  if (c.segment === "concurrency_ceiling") return "#ee342f";
  return c.tier === "high_touch" ? "#8d2676" : "#b8850f";
}

function getOutreach(c: Candidate): { subject: string; body: string } {
  if (c.segment === "concurrency_ceiling") {
    const ratio = (c.peakConcurrent / c.concurrencyLimit).toFixed(1);
    return {
      subject: "You're already maxed out on your deployment class",
      body: `Hey,\n\nTL;DR: your peak concurrent queries hit ${Math.round(c.peakConcurrent).toLocaleString()} last month. Your plan's deployment class tops out at ${c.concurrencyLimit}. You're ${ratio}x past it.\n\nThis isn't a "you should upgrade to save money" email — your bill's probably fine. It's a "this is likely why things feel slow or occasionally error out" email. More seats don't fix this, because the constraint isn't seats, it's the deployment class itself.\n\nBusiness gives you dedicated deployment classes (D1024, D2048) — isolated infrastructure sized for exactly this kind of load. Worth 15 minutes to see what dedicated would actually change for you?\n\n— Convex`,
    };
  }
  if (c.tier === "low_touch") {
    return {
      subject: "You paid more in overage than Pro costs",
      body: `Hey,\n\nTL;DR: you spent about ${money(c.currentMonthlyCost)} in Starter overage last month. Professional is a flat $25/dev and would've covered everything you used, with room to spare.\n\nNot trying to sell you features you don't need. You're just paying more for less right now. Switch anytime from team settings, no migration required.\n\n— Convex`,
    };
  }
  return {
    subject: "You're basically already a Business customer",
    body: `Hey,\n\nTL;DR: your usage last month puts your bill around ${money(c.currentMonthlyCost)}/mo, almost entirely metered overage on top of Professional. That's not a complaint — you're doing real volume.\n\nBut you're paying spike-protection rates for what is, for you, just normal traffic. Business gets you volume pricing that's meaningfully cheaper per-unit at this level, plus dedicated deployments if you want isolated infra.\n\nWorth 15 minutes to see the actual numbers side by side?\n\n— Convex`,
  };
}

function NavIcon({ kind }: { kind: Tab }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "all") return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></svg>;
  if (kind === "strategy") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M4 8h6M4 16h6M18 8h-6M18 16h-6" /></svg>;
  if (kind === "cost") return <svg {...p}><rect x="3" y="10" width="4" height="10" rx="1" /><rect x="10" y="5" width="4" height="15" rx="1" /><rect x="17" y="13" width="4" height="7" rx="1" /></svg>;
  return <svg {...p}><path d="M12 21a9 9 0 1 0 -9 -9" /><path d="M12 12l4 -3" /><path d="M12 3v2M21 12h-2" /></svg>;
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ done, total, size = 96 }: { done: number; total: number; size?: number }) {
  const stroke = size * 0.11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total === 0 ? 0 : done / total;
  const doneLength = circumference * pct;
  const center = size / 2;

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#ded9c4" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#8d2676"
          strokeWidth={stroke}
          strokeDasharray={`${doneLength} ${circumference - doneLength}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="donut-label">
        <span className="donut-num">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

function SplitDonut({ segments, size = 110 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const stroke = size * 0.13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const center = size / 2;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const length = (seg.value / total) * circumference;
          const dashoffset = -offset;
          offset += length;
          return (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
      </svg>
      <div className="donut-label">
        <span className="donut-num">{total}</span>
      </div>
    </div>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number; display: string; color: string }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="bar-chart">
      {bars.map((b) => (
        <div className="bar-row" key={b.label}>
          <span className="bar-label">{b.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(b.value / max) * 100}%`, background: b.color }} />
          </div>
          <span className="bar-value">{b.display}</span>
        </div>
      ))}
    </div>
  );
}

function FlowDiagram() {
  return (
    <div className="flow">
      <div className="flow-box">Usage data</div>
      <div className="flow-arrows">↙ &nbsp; ↘</div>
      <div className="flow-row">
        <div className="flow-box flow-box-yellow">Billing lens</div>
        <div className="flow-box flow-box-red">Infrastructure lens</div>
      </div>
    </div>
  );
}

function StatusPill({ children, color }: { children: React.ReactNode; color: "purple" | "yellow" | "red" | "green" }) {
  return <span className={`pill pill-${color}`}>{children}</span>;
}

function DashboardRow({ children }: { children: React.ReactNode }) {
  return <div className="dashboard-row">{children}</div>;
}

function Row({ c, maxCost, maxConcurrent }: { c: Candidate; maxCost: number; maxConcurrent: number }) {
  const markContacted = useMutation(api.candidates.markContacted);
  const [expanded, setExpanded] = useState(false);
  const isCost = c.segment === "cost_inefficiency";
  const magnitude = isCost ? c.currentMonthlyCost / maxCost : c.peakConcurrent / maxConcurrent;
  const accent = accentFor(c);
  const outreach = getOutreach(c);
  const pillColor = c.segment === "concurrency_ceiling" ? "red" : c.tier === "high_touch" ? "purple" : "yellow";
  const mailHref = "mailto:?subject=" + encodeURIComponent(outreach.subject) + "&body=" + encodeURIComponent(outreach.body);

  return (
    <div className="row">
      <div className="row-top">
        <span className="row-avatar" style={{ background: accent }}>
          {c.teamName.charAt(0)}
        </span>
        <button className="row-main" onClick={() => setExpanded((v) => !v)}>
          <span className="row-name">{c.teamName}</span>
          <span className="row-meta">
            {c.plan} · {c.memberCount} dev{c.memberCount > 1 ? "s" : ""} · {calls(c.functionCallsMonthly)} calls/mo
          </span>
          <div className="row-bar-track">
            <div className="row-bar-fill" style={{ width: `${magnitude * 100}%`, background: accent }} />
          </div>
        </button>
        <div className="row-signal">
          {isCost
            ? `${money(c.currentMonthlyCost)} → ${money(c.nextTierCost)}`
            : `${c.peakConcurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${c.concurrencyLimit}`}
        </div>
        <a className="row-mail" href={mailHref}>
          <MailIcon />
          Draft email
        </a>
        {c.contacted ? (
          <StatusPill color="green">Contacted</StatusPill>
        ) : (
          <button className="row-action" onClick={() => markContacted({ id: c._id })}>
            Mark contacted
          </button>
        )}
        <StatusPill color={pillColor}>{isCost ? (c.tier === "high_touch" ? "High touch" : "Low touch") : "Concurrency"}</StatusPill>
      </div>
      {expanded && (
        <div className="outreach">
          <strong>Subject:</strong> {outreach.subject}
          <pre>{outreach.body}</pre>
        </div>
      )}
    </div>
  );
}

function Panel({ title, sub, candidates }: { title: string; sub: string; candidates: Candidate[] }) {
  if (candidates.length === 0) return null;
  const maxCost = Math.max(...candidates.map((c) => c.currentMonthlyCost), 1);
  const maxConcurrent = Math.max(...candidates.map((c) => c.peakConcurrent), 1);
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <span className="panel-sub">{sub}</span>
      </div>
      {candidates.map((c) => (
        <Row key={c._id} c={c} maxCost={maxCost} maxConcurrent={maxConcurrent} />
      ))}
    </section>
  );
}

function EmailCard({ label, color, subject, body }: { label: string; color: "purple" | "yellow" | "red"; subject: string; body: string }) {
  const snippet = body.split("\n\n")[1] ?? body;
  const mailHref = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  return (
    <div className={`email-card email-card-${color}`}>
      <StatusPill color={color}>{label}</StatusPill>
      <strong className="email-subject">{subject}</strong>
      <p className="email-snippet">{snippet.slice(0, 140)}...</p>
      <a className="email-send" href={mailHref}>
        <MailIcon />
        Open email draft
      </a>
    </div>
  );
}

function AllAccountsTab() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("calls");
  const [desc, setDesc] = useState(true);

  const filtered = useMemo(() => {
    let rows = ALL_TEAMS.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    rows = [...rows].sort((a, b) => (desc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return rows;
  }, [search, sortKey, desc]);

  const flaggedCount = ALL_TEAMS.filter((t) => t.flagged).length;

  const [groupBy, setGroupBy] = useState<GroupKey>("plan");
  const [metric, setMetric] = useState<MetricKey>("count");

  const dashboardBars = useMemo(() => {
    const groups: Record<string, typeof ALL_TEAMS> = {};
    ALL_TEAMS.forEach((t) => {
      const key = groupBy === "plan" ? t.plan : t.flagged ? "Flagged" : "Not flagged";
      (groups[key] ??= []).push(t);
    });

    const metricLabel: Record<MetricKey, string> = {
      count: "Team count",
      totalCalls: "Total function calls/mo",
      avgCalls: "Avg function calls/mo",
      avgStorage: "Avg DB storage (GB)",
      avgConcurrent: "Avg peak concurrent",
    };

    const colorFor = (key: string) =>
      key === "Pro" || key === "Flagged" ? "#8d2676" : key === "Starter" ? "#b8850f" : key === "Free" ? "#8a8574" : "#a49f8e";

    const bars = Object.entries(groups).map(([key, rows]) => {
      let value = 0;
      let display = "";
      if (metric === "count") {
        value = rows.length;
        display = `${rows.length} teams`;
      } else if (metric === "totalCalls") {
        value = rows.reduce((s, r) => s + r.calls, 0);
        display = calls(value);
      } else if (metric === "avgCalls") {
        value = rows.reduce((s, r) => s + r.calls, 0) / rows.length;
        display = calls(value);
      } else if (metric === "avgStorage") {
        value = rows.reduce((s, r) => s + r.storage, 0) / rows.length;
        display = `${value.toFixed(1)}GB`;
      } else {
        value = rows.reduce((s, r) => s + r.concurrent, 0) / rows.length;
        display = value.toFixed(1);
      }
      return { label: key, value, display, color: colorFor(key) };
    });

    return { bars, title: `${metricLabel[metric]} by ${groupBy === "plan" ? "plan" : "flagged status"}` };
  }, [groupBy, metric]);

  return (
    <div className="content">
      <h1>All Accounts</h1>
      <DashboardRow>
        <div className="stat-card">
          <span className="stat-value">{ALL_TEAMS.length}</span>
          <span className="stat-label">total teams</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{flaggedCount}</span>
          <span className="stat-label">flagged as candidates</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{((flaggedCount / ALL_TEAMS.length) * 100).toFixed(1)}%</span>
          <span className="stat-label">of accounts flagged</span>
        </div>
      </DashboardRow>
      <p className="lede">
        This table is the result of an EDA pass on the raw data: 18,000 daily usage rows (200 teams x 90 days) were
        aggregated down to one row per team using the most recent 30-day window, then joined against each team's
        plan and deployment info. Every number below is a real value from that aggregation, not a sample.
      </p>

      <div className="card-block">
        <div className="dashboard-controls">
          <span className="card-title">{dashboardBars.title}</span>
          <div className="dashboard-selects">
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)}>
              <option value="plan">Group by plan</option>
              <option value="flagged">Group by flagged status</option>
            </select>
            <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
              <option value="count">Team count</option>
              <option value="totalCalls">Total function calls</option>
              <option value="avgCalls">Avg function calls</option>
              <option value="avgStorage">Avg DB storage</option>
              <option value="avgConcurrent">Avg peak concurrent</option>
            </select>
          </div>
        </div>
        <BarChart bars={dashboardBars.bars} />
      </div>

      <div className="table-controls">
        <input
          className="search-input"
          placeholder="Search by team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sort-controls">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="calls">Function calls</option>
            <option value="storage">DB storage</option>
            <option value="concurrent">Peak concurrent</option>
            <option value="members">Members</option>
          </select>
          <button className="sort-toggle" onClick={() => setDesc((v) => !v)}>
            {desc ? "High to low" : "Low to high"}
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Plan</th>
              <th>Members</th>
              <th>Calls/mo</th>
              <th>Storage</th>
              <th>Peak concurrent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.name} className={t.flagged ? "flagged-row" : ""}>
                <td>{t.name}</td>
                <td>{t.plan}</td>
                <td>{t.members}</td>
                <td>{calls(t.calls)}</td>
                <td>{t.storage}GB</td>
                <td>
                  {t.concurrent} / {t.limit}
                </td>
                <td>{t.flagged ? <StatusPill color="purple">Flagged</StatusPill> : <span className="muted">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategyTab({
  costCount,
  concurrencyCount,
  contactedCount,
  totalCount,
  lowExample,
  highExample,
  concurrencyExample,
}: {
  costCount: number;
  concurrencyCount: number;
  contactedCount: number;
  totalCount: number;
  lowExample?: Candidate;
  highExample?: Candidate;
  concurrencyExample?: Candidate;
}) {
  return (
    <div className="content">
      <h1>Same Data, Two Different Problems</h1>
      <DashboardRow>
        <Donut done={contactedCount} total={totalCount} />
        <div className="stat-card">
          <span className="stat-value">{totalCount}</span>
          <span className="stat-label">accounts flagged</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {costCount} / {concurrencyCount}
          </span>
          <span className="stat-label">cost vs concurrency</span>
        </div>
      </DashboardRow>
      <p className="lede">
        Billing and infrastructure are separate lenses on the same usage numbers, and they don't catch the same
        accounts.
      </p>

      <div className="threshold-strip">
        <div className="threshold-item">
          <span className="threshold-label">Free / Starter</span>
          <span className="threshold-value">1M calls/mo, 16 concurrent</span>
        </div>
        <div className="threshold-item">
          <span className="threshold-label">Professional - $25/dev/mo</span>
          <span className="threshold-value">25M calls/mo, 256 concurrent</span>
        </div>
        <div className="threshold-item">
          <span className="threshold-label">Business - $2,500/mo min</span>
          <span className="threshold-value">Volume pricing, dedicated infra</span>
        </div>
      </div>

      <div className="card-block card-block-split">
        <SplitDonut
          segments={[
            { label: "Cost inefficiency", value: costCount, color: "#8d2676" },
            { label: "Concurrency ceiling", value: concurrencyCount, color: "#ee342f" },
          ]}
        />
        <div className="split-note">
          <span className="card-title">One dataset, two segments</span>
          <p>
            {costCount} accounts get flagged purely on billing math -- they're paying more than the next tier would
            cost. {concurrencyCount} more get flagged on a completely different signal -- infrastructure limits --
            and none of them overlap with teams that were already caught by the cost check. That's the whole point
            of running two lenses instead of one.
          </p>
        </div>
      </div>

      <FlowDiagram />

      <div className="strategy-grid">
        <div className="strategy-card">
          <h3>Cost inefficiency</h3>
          <p>
            Teams already paying more in metered overage than the next plan would cost outright. Low-touch gets an
            automated email; high-touch gets a real conversation, since these accounts already spend Business-scale
            money at Professional's overage rate.
          </p>
        </div>
        <div className="strategy-card">
          <h3>Concurrency ceiling</h3>
          <p>
            A purely technical signal, independent of billing: teams past their deployment class's concurrency
            limit. Their spend looks completely normal, which is exactly why cost-based monitoring never catches
            them.
          </p>
        </div>
        <div className="strategy-card">
          <h3>Why keep them separate</h3>
          <p>
            A team can be cheap and still be throttled. Segmenting by what actually fixes the problem, not just
            which formula flagged the account, is what turns this into an outreach plan instead of a report.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Outreach templates</h2>
          <span className="panel-sub">The three motions, with real example accounts</span>
        </div>
        <div className="email-grid">
          {lowExample && (
            <EmailCard label="Low touch" color="yellow" subject={getOutreach(lowExample).subject} body={getOutreach(lowExample).body} />
          )}
          {highExample && (
            <EmailCard label="High touch" color="purple" subject={getOutreach(highExample).subject} body={getOutreach(highExample).body} />
          )}
          {concurrencyExample && (
            <EmailCard label="Concurrency" color="red" subject={getOutreach(concurrencyExample).subject} body={getOutreach(concurrencyExample).body} />
          )}
        </div>
      </section>
    </div>
  );
}

function CostTab({ candidates }: { candidates: Candidate[] }) {
  const highTouch = candidates.filter((c) => c.tier === "high_touch");
  const lowTouch = candidates.filter((c) => c.tier === "low_touch");
  const total = candidates.reduce((sum, c) => sum + c.currentMonthlyCost, 0);
  const highTotal = highTouch.reduce((sum, c) => sum + c.currentMonthlyCost, 0);
  const lowTotal = lowTouch.reduce((sum, c) => sum + c.currentMonthlyCost, 0);
  const contacted = candidates.filter((c) => c.contacted).length;

  return (
    <div className="content">
      <h1>Paying More for Less</h1>
      <DashboardRow>
        <Donut done={contacted} total={candidates.length} />
        <div className="stat-card">
          <span className="stat-value">{money(total)}/mo</span>
          <span className="stat-label">overage identified</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {highTouch.length} / {lowTouch.length}
          </span>
          <span className="stat-label">high vs low touch</span>
        </div>
      </DashboardRow>
      <p className="lede">
        {candidates.length} accounts, {money(total)}/mo in identified overage.
      </p>
      <BarChart
        bars={[
          { label: "High touch", value: highTotal, display: `${money(highTotal)}/mo`, color: "#8d2676" },
          { label: "Low touch", value: lowTotal, display: `${money(lowTotal)}/mo`, color: "#b8850f" },
        ]}
      />
      <Panel title="High touch" sub={`${highTouch.length} accounts`} candidates={highTouch} />
      <Panel title="Low touch" sub={`${lowTouch.length} accounts`} candidates={lowTouch} />
    </div>
  );
}

function ConcurrencyTab({ candidates }: { candidates: Candidate[] }) {
  const contacted = candidates.filter((c) => c.contacted).length;
  return (
    <div className="content">
      <h1>Bill's Fine. Infra Isn't.</h1>
      <DashboardRow>
        <Donut done={contacted} total={candidates.length} />
        <div className="stat-card">
          <span className="stat-value">{candidates.length}</span>
          <span className="stat-label">accounts flagged</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {Math.max(...candidates.map((c) => c.peakConcurrent / c.concurrencyLimit)).toFixed(1)}x
          </span>
          <span className="stat-label">worst overage</span>
        </div>
      </DashboardRow>
      <p className="lede">{candidates.length} accounts running past their deployment class's concurrency limit.</p>
      <BarChart
        bars={candidates.map((c) => ({
          label: c.teamName,
          value: c.peakConcurrent / c.concurrencyLimit,
          display: `${(c.peakConcurrent / c.concurrencyLimit).toFixed(1)}x limit`,
          color: "#ee342f",
        }))}
      />
      <Panel title="Flagged accounts" sub="Bill looks fine, infra doesn't" candidates={candidates} />
    </div>
  );
}

export default function App() {
  const candidates = useQuery(api.candidates.list) as Candidate[] | undefined;
  const seed = useMutation(api.candidates.seed);
  const [tab, setTab] = useState<Tab>("all");

  if (candidates === undefined) return <div className="loading">loading...</div>;

  if (candidates.length === 0) {
    return (
      <div className="loading">
        <p>No candidates loaded yet.</p>
        <button onClick={() => seed({})}>Seed data</button>
      </div>
    );
  }

  const costCandidates = candidates.filter((c) => c.segment === "cost_inefficiency");
  const concurrencyCandidates = candidates.filter((c) => c.segment === "concurrency_ceiling");
  const contactedCount = candidates.filter((c) => c.contacted).length;

  const lowExample = [...costCandidates.filter((c) => c.tier === "low_touch")].sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost)[0];
  const highExample = [...costCandidates.filter((c) => c.tier === "high_touch")].sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost)[0];
  const concurrencyExample = [...concurrencyCandidates].sort((a, b) => b.peakConcurrent / b.concurrencyLimit - a.peakConcurrent / a.concurrencyLimit)[0];

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All Accounts" },
    { id: "strategy", label: "Strategy" },
    { id: "cost", label: "Cost Inefficiency" },
    { id: "concurrency", label: "Concurrency Ceiling" },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand" />
        <nav>
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <NavIcon kind={t.id} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="main">
        {tab === "all" && <AllAccountsTab />}
        {tab === "strategy" && (
          <StrategyTab
            costCount={costCandidates.length}
            concurrencyCount={concurrencyCandidates.length}
            contactedCount={contactedCount}
            totalCount={candidates.length}
            lowExample={lowExample}
            highExample={highExample}
            concurrencyExample={concurrencyExample}
          />
        )}
        {tab === "cost" && <CostTab candidates={costCandidates} />}
        {tab === "concurrency" && <ConcurrencyTab candidates={concurrencyCandidates} />}
      </div>
    </div>
  );
}