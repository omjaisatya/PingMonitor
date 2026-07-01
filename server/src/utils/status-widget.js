(function () {
  // Find script element
  var script = document.currentScript || document.querySelector('script[src*="status-widget.js"]');
  if (!script) return;

  var statusPage = script.getAttribute('data-status-page');
  var position = script.getAttribute('data-position') || 'bottom-right'; 
  var theme = script.getAttribute('data-theme') || 'dark'; 
  var host = window.location.origin;
  
  if (script.src && script.src.indexOf('http') === 0) {
    var parser = document.createElement('a');
    parser.href = script.src;
    host = parser.protocol + '//' + parser.host;
  }

  if (!statusPage) {
    console.error('PingMonitor Widget Error: data-status-page attribute is required.');
    return;
  }

  fetch(host + '/api/public/status/' + statusPage)
    .then(function (response) {
      if (!response.ok) throw new Error('Status page not found');
      return response.json();
    })
    .then(function (data) {
      renderWidget(data);
    })
    .catch(function (err) {
      console.warn('PingMonitor Widget Error:', err.message);
    });

  function renderWidget(data) {
    var statusColors = {
      all_operational: '#10b981',
      partial_outage: '#f59e0b',
      major_outage: '#ef4444',
      unknown: '#6b7280'
    };
    var statusTexts = {
      all_operational: 'All Systems Operational',
      partial_outage: 'Partial System Outage',
      major_outage: 'Major System Outage',
      unknown: 'Status Unknown'
    };

    var status = data.systemStatus || 'unknown';
    var color = statusColors[status] || statusColors.unknown;
    var statusText = statusTexts[status] || statusTexts.unknown;
    var linkUrl = host + '/status/' + statusPage;

    var container = document.createElement('a');
    container.href = linkUrl;
    container.target = '_blank';
    container.rel = 'noopener noreferrer';
    container.id = 'ping-monitor-status-widget';
    
    var dot = document.createElement('span');
    dot.className = 'ping-dot';

    var textSpan = document.createElement('span');
    textSpan.innerText = statusText;

    container.appendChild(dot);
    container.appendChild(textSpan);

    var style = document.createElement('style');
    var isDark = theme === 'dark';
    var bgColor = isDark ? '#13131c' : '#ffffff';
    var textColor = isDark ? '#e8e8f0' : '#1f2937';
    var borderColor = isDark ? '#1e1e2e' : '#e5e7eb';
    var shadowColor = 'rgba(0, 0, 0, 0.15)';

    var posStyle = position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;';

    style.innerHTML = 
      '#ping-monitor-status-widget {' +
      '  position: fixed;' +
      '  bottom: 20px;' +
      '  ' + posStyle +
      '  z-index: 999999;' +
      '  display: flex;' +
      '  align-items: center;' +
      '  gap: 10px;' +
      '  padding: 10px 16px;' +
      '  background-color: ' + bgColor + ';' +
      '  border: 1px solid ' + borderColor + ';' +
      '  border-radius: 50px;' +
      '  box-shadow: 0 4px 12px ' + shadowColor + ';' +
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '  font-size: 13px;' +
      '  font-weight: 600;' +
      '  color: ' + textColor + ';' +
      '  text-decoration: none;' +
      '  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);' +
      '}' +
      '#ping-monitor-status-widget:hover {' +
      '  transform: translateY(-2px);' +
      '  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);' +
      '  border-color: ' + color + ';' +
      '}' +
      '#ping-monitor-status-widget .ping-dot {' +
      '  width: 8px;' +
      '  height: 8px;' +
      '  border-radius: 50%;' +
      '  background-color: ' + color + ';' +
      '  position: relative;' +
      '  display: inline-block;' +
      '}' +
      '#ping-monitor-status-widget .ping-dot::after {' +
      '  content: "";' +
      '  position: absolute;' +
      '  top: 0; left: 0; width: 100%; height: 100%;' +
      '  border-radius: 50%;' +
      '  background-color: ' + color + ';' +
      '  animation: ping-pulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;' +
      '}' +
      '@keyframes ping-pulse {' +
      '  0% { transform: scale(1); opacity: 0.85; }' +
      '  100% { transform: scale(3.5); opacity: 0; }' +
      '}';

    document.head.appendChild(style);
    document.body.appendChild(container);
  }
})();
