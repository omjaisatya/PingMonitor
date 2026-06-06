import { useState } from "react";

// Helper to format
const formatMs = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export function ResponseTimeLineChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No response time trend data available for this range</p>
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.responseTime || 0);
  const maxVal = Math.max(...values, 100);
  const minVal = 0;

  const getX = (index) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    const scale = maxVal - minVal;
    return paddingTop + chartHeight - ((val - minVal) / scale) * chartHeight;
  };

  let linePath = "";
  let areaPath = "";

  if (data.length > 0) {
    linePath = `M ${getX(0)} ${getY(data[0].responseTime)}`;
    for (let i = 1; i < data.length; i++) {
      linePath += ` L ${getX(i)} ${getY(data[i].responseTime)}`;
    }

    areaPath = linePath;
    areaPath += ` L ${getX(data.length - 1)} ${paddingTop + chartHeight}`;
    areaPath += ` L ${getX(0)} ${paddingTop + chartHeight} Z`;
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round(minVal + (maxVal - minVal) * (i / 4));
    return { val, y: getY(val) };
  });

  const xTickInterval = Math.max(1, Math.floor(data.length / 5));
  const xTicks = data
    .map((d, i) => ({ label: d.date, x: getX(i), index: i }))
    .filter((_, idx) => idx % xTickInterval === 0 || idx === data.length - 1);

  const handleMouseMove = (e, point, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > rect.width - 80) {
      x -= 70;
    }

    setHoveredPoint({ ...point, index });
    setTooltipPos({ x, y });
  };

  return (
    <div className="chart-container" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={paddingLeft}
            y1={tick.y}
            x2={width - paddingRight}
            y2={tick.y}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={paddingLeft - 10}
            y={tick.y + 4}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            {formatMs(tick.val)}
          </text>
        ))}

        {xTicks.map((tick, i) => {
          const parts = tick.label.split("-");
          const labelFormatted =
            parts.length >= 3 ? `${parts[1]}/${parts[2]}` : tick.label;

          return (
            <text
              key={i}
              x={tick.x}
              y={paddingTop + chartHeight + 20}
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {labelFormatted}
            </text>
          );
        })}

        {areaPath && (
          <path
            d={areaPath}
            fill="url(#chart-area-grad)"
            style={{ transition: "all 0.3s ease" }}
          />
        )}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "all 0.3s ease" }}
          />
        )}

        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.responseTime);
          const isHovered = hoveredPoint && hoveredPoint.index === i;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isHovered ? 6 : 3.5}
              fill={isHovered ? "var(--accent)" : "var(--bg-card)"}
              stroke="var(--accent)"
              strokeWidth={isHovered ? 3 : 2}
              style={{
                transition: "r 0.15s ease, fill 0.15s ease",
                cursor: "pointer",
              }}
              onMouseMove={(e) => handleMouseMove(e, d, i)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}
      </svg>

      {hoveredPoint && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y - 50}px`,
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <div className="tooltip-date">{hoveredPoint.date}</div>
          <div className="tooltip-val">
            {formatMs(hoveredPoint.responseTime)}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusCodeDistribution({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No status code logs recorded yet</p>
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="dist-list">
      {data.map((item, i) => {
        const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
        const codeNum = parseInt(item.code);
        let colorClass = "code-other";

        if (codeNum >= 200 && codeNum < 300) {
          colorClass = "code-2xx";
        } else if (codeNum >= 300 && codeNum < 400) {
          colorClass = "code-3xx";
        } else if (codeNum >= 400 && codeNum < 500) {
          colorClass = "code-4xx";
        } else if (codeNum >= 500) {
          colorClass = "code-5xx";
        }

        return (
          <div key={i} className="dist-item">
            <div className="dist-header">
              <span className={`dist-code-badge ${colorClass}`}>
                {item.code}
              </span>
              <span className="dist-count">
                {item.count} check{item.count !== 1 ? "s" : ""} ({percent}%)
              </span>
            </div>
            <div className="dist-progress-track">
              <div
                className={`dist-progress-bar ${colorClass}`}
                style={{ width: `${percent}%`, transition: "width 0.6s ease" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PeakHoursChart({ data = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No performance logs for hourly trends</p>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.responseTime || 0), 100);

  const getBarHeight = (val) => {
    return (val / maxVal) * chartHeight;
  };

  const barWidth = chartWidth / 24 - 4;

  const handleMouseMove = (e, point) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > rect.width - 80) {
      x -= 70;
    }

    setHoveredBar(point);
    setTooltipPos({ x, y });
  };

  const formatHourLabel = (h) => {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  return (
    <div className="chart-container" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = paddingTop + chartHeight * p;
          return (
            <line
              key={idx}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          );
        })}

        {[0, 0.5, 1].map((p, idx) => {
          const val = Math.round(maxVal * (1 - p));
          const y = paddingTop + chartHeight * p;
          return (
            <text
              key={idx}
              x={paddingLeft - 10}
              y={y + 4}
              fill="var(--text-muted)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              {formatMs(val)}
            </text>
          );
        })}

        {data
          .filter((_, idx) => idx % 4 === 0)
          .map((d, idx) => {
            const x = paddingLeft + d.hour * (chartWidth / 24) + barWidth / 2;
            return (
              <text
                key={idx}
                x={x}
                y={paddingTop + chartHeight + 18}
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {d.hour}:00
              </text>
            );
          })}

        {data.map((d, i) => {
          const barH = getBarHeight(d.responseTime);
          const x = paddingLeft + d.hour * (chartWidth / 24) + 2;
          const y = paddingTop + chartHeight - barH;
          const isHovered = hoveredBar && hoveredBar.hour === d.hour;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH || 1}
              fill={isHovered ? "var(--green)" : "var(--accent)"}
              opacity={isHovered ? 1.0 : 0.75}
              rx="2"
              style={{
                transition: "fill 0.15s, opacity 0.15s, y 0.3s, height 0.3s",
                cursor: "pointer",
              }}
              onMouseMove={(e) => handleMouseMove(e, d)}
              onMouseLeave={() => setHoveredBar(null)}
            />
          );
        })}
      </svg>

      {hoveredBar && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y - 50}px`,
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <div className="tooltip-date">{formatHourLabel(hoveredBar.hour)}</div>
          <div className="tooltip-val">{formatMs(hoveredBar.responseTime)}</div>
        </div>
      )}
    </div>
  );
}
