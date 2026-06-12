import { useEffect, useState, useMemo } from "react";
import {
  FiActivity,
  FiGlobe,
  FiBell,
  FiPieChart,
  FiServer,
  FiTerminal,
  FiLayers
} from "react-icons/fi";

export default function AuthShowcase() {
  const [totalChecks, setTotalChecks] = useState(100000);
  const [latencyAvg, setLatencyAvg] = useState(245);
  const [gatewayLatency, setGatewayLatency] = useState(14);
  const [landingPageLatency, setLandingPageLatency] = useState(122);
  const [dbLag, setDbLag] = useState(1.2);
  
  const [chartPoints, setChartPoints] = useState([75, 45, 55, 32, 68, 28, 42, 58, 35]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalChecks((prev) => prev + Math.floor(Math.random() * 4) + 1);
      
      setLatencyAvg((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(260, Math.max(230, prev + delta));
      });

      setGatewayLatency((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.min(22, Math.max(9, prev + delta));
      });

      setLandingPageLatency((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.min(138, Math.max(108, prev + delta));
      });

      setDbLag((prev) => {
        const delta = (Math.random() - 0.5) * 0.2;
        return parseFloat(Math.min(2.1, Math.max(0.4, prev + delta)).toFixed(2));
      });

      setChartPoints((prev) =>
        prev.map((y) => {
          const delta = (Math.random() - 0.5) * 12;
          return Math.min(85, Math.max(15, Math.round(y + delta)));
        })
      );
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const formattedChecks = useMemo(() => {
    return totalChecks.toLocaleString();
  }, [totalChecks]);

  const { pathD, fillD } = useMemo(() => {
    const xInterval = 300 / (chartPoints.length - 1);
    const coords = chartPoints.map((y, index) => `${index * xInterval} ${y}`);
    const pD = `M ${coords.join(" L ")}`;
    const fD = `${pD} L 300 100 L 0 100 Z`;
    return { pathD: pD, fillD: fD };
  }, [chartPoints]);

  return (
    <div className="auth-showcase">
      <div className="showcase-glow glow-1" />
      <div className="showcase-glow glow-2" />

      <div className="showcase-content">
        <div className="showcase-hero">
          <h2 className="showcase-headline">
            Monitor your infrastructure <span className="text-gradient">before users notice</span>
          </h2>
          <p className="showcase-description">
            PingMonitor is the developer-first status tracker that combines synthetic monitoring, API double-checks, and automated incident response in a unified workflow.
          </p>
        </div>

        <div className="dashboard-preview-container">
          <div className="dashboard-preview-header">
            <div className="preview-window-dots">
              <span className="dot red-dot" />
              <span className="dot yellow-dot" />
              <span className="dot green-dot" />
            </div>
            <div className="preview-window-title">live_dashboard_preview</div>
            <div className="preview-window-badge">
              <span className="pulse-dot" /> Live
            </div>
          </div>

          <div className="dashboard-preview-grid">
            <div className="preview-card">
              <div className="preview-card-header">
                <span className="card-icon-wrapper">
                  <FiActivity className="preview-card-icon text-green" />
                </span>
                <span className="preview-card-label">Global Uptime</span>
              </div>
              <div className="uptime-value-row">
                <span className="uptime-value">99.99%</span>
                <div className="monitor-metric text-green" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--auth-success)' }} />
                  Operational
                </div>
              </div>
              <div className="uptime-bars">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className={`uptime-bar ${i === 18 ? "warning" : i === 12 ? "danger" : ""}`}
                    title={i === 18 ? "Latency Delay (US-East)" : i === 12 ? "Outage 45s (EU-West)" : "100% Operational"}
                  />
                ))}
              </div>
            </div>

            <div className="preview-card">
              <div className="preview-card-header">
                <span className="card-icon-wrapper">
                  <FiServer className="preview-card-icon text-accent" />
                </span>
                <span className="preview-card-label">Active Monitors</span>
              </div>
              <ul className="monitors-list">
                <li>
                  <div className="monitor-status-dot green" />
                  <div className="monitor-details">
                    <span className="monitor-name">Primary API Gateway</span>
                    <span className="monitor-meta">api.pingmonitor.com</span>
                  </div>
                  <span className="monitor-metric text-green">{gatewayLatency}ms</span>
                </li>
                <li>
                  <div className="monitor-status-dot green" />
                  <div className="monitor-details">
                    <span className="monitor-name">Client App</span>
                    <span className="monitor-meta">pingmonitor.com</span>
                  </div>
                  <span className="monitor-metric text-green">{landingPageLatency}ms</span>
                </li>
                <li>
                  <div className="monitor-status-dot yellow" />
                  <div className="monitor-details">
                    <span className="monitor-name">US-East DB-Replica</span>
                    <span className="monitor-meta">db-replica-01.internal</span>
                  </div>
                  <span className="monitor-metric text-yellow">{dbLag}s lag</span>
                </li>
              </ul>
            </div>

            <div className="preview-card chart-card">
              <div className="preview-card-header">
                <span className="card-icon-wrapper">
                  <FiPieChart className="preview-card-icon text-accent" />
                </span>
                <div className="chart-title-area">
                  <span className="preview-card-label">Latency Breakdown</span>
                  <span className="chart-subtitle">Avg {latencyAvg}ms response time</span>
                </div>
              </div>
              <div className="svg-chart-container">
                <svg viewBox="0 0 300 100" className="preview-svg-chart">
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--auth-accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--auth-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  <line x1="0" y1="20" x2="300" y2="20" stroke="var(--auth-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="var(--auth-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="var(--auth-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  
                  <path
                    d={fillD}
                    fill="url(#chart-gradient)"
                    style={{ transition: 'd 1.8s ease-in-out' }}
                  />
                  
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--auth-accent)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    style={{ transition: 'd 1.8s ease-in-out' }}
                  />
                  
                  <circle cx="112.5" cy={chartPoints[3]} r="3" fill="var(--auth-bg)" stroke="var(--auth-accent)" strokeWidth="1.5" style={{ transition: 'cy 1.8s ease-in-out' }} />
                  <circle cx="225" cy={chartPoints[6]} r="3" fill="var(--auth-bg)" stroke="var(--auth-accent)" strokeWidth="1.5" style={{ transition: 'cy 1.8s ease-in-out' }} />
                </svg>
                <div className="chart-axes">
                  <span>15:40</span>
                  <span>15:42</span>
                  <span>15:44</span>
                  <span>15:46</span>
                  <span>15:48</span>
                </div>
              </div>
            </div>

            <div className="preview-card timeline-card">
              <div className="preview-card-header">
                <span className="card-icon-wrapper">
                  <FiTerminal className="preview-card-icon text-muted" />
                </span>
                <span className="preview-card-label">Recent Activity Feed</span>
              </div>
              <div className="timeline-events">
                <div className="timeline-item">
                  <div className="timeline-badge badge-ok">OK</div>
                  <div className="timeline-details">
                    <p className="timeline-title">SSL Cert Validated (256-bit)</p>
                    <span className="timeline-time">Just now</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-badge badge-warn">WARN</div>
                  <div className="timeline-details">
                    <p className="timeline-title">Latency peak US-East replica</p>
                    <span className="timeline-time">3 mins ago</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-badge badge-crit">RESOLVED</div>
                  <div className="timeline-details">
                    <p className="timeline-title">HTTP 504 Gateway timeout</p>
                    <span className="timeline-time">24 mins ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="showcase-stats-grid">
          <div className="showcase-stat-item">
            <span className="showcase-stat-number text-green">99.99%</span>
            <span className="showcase-stat-label">SLA Uptime SLA</span>
          </div>
          <div className="showcase-stat-item">
            <span className="showcase-stat-number">{formattedChecks}</span>
            <span className="showcase-stat-label">Checks Run</span>
          </div>
          <div className="showcase-stat-item">
            <span className="showcase-stat-number">10+</span>
            <span className="showcase-stat-label">Probe locations</span>
          </div>
        </div>

        <div className="showcase-features-grid">
          <div className="showcase-feature-card">
            <div className="showcase-feature-icon">
              <FiActivity />
            </div>
            <div className="showcase-feature-info">
              <h4>99.99% uptime monitoring</h4>
              <p>Highly accurate sub-second monitoring for endpoints, DNS records, database tunnels, and SSL lifespans.</p>
            </div>
          </div>
          <div className="showcase-feature-card">
            <div className="showcase-feature-icon">
              <FiBell />
            </div>
            <div className="showcase-feature-info">
              <h4>Real-time alerts</h4>
              <p>Routing rules immediately dispatch clean alert schemas to Slack, Discord, email, or webhook receivers.</p>
            </div>
          </div>
          <div className="showcase-feature-card">
            <div className="showcase-feature-icon">
              <FiGlobe />
            </div>
            <div className="showcase-feature-info">
              <h4>Status pages</h4>
              <p>Host fully automated, beautiful status pages to increase trustworthiness with userbases.</p>
            </div>
          </div>
          <div className="showcase-feature-card">
            <div className="showcase-feature-icon">
              <FiLayers />
            </div>
            <div className="showcase-feature-info">
              <h4>Incident management</h4>
              <p>Instantly alert team rotas, assign duty responders, and compile complete incident timelines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
