import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>⚠️</div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.subtitle}>
              An unexpected error occurred in the client application.
            </p>

            {this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Show technical details</summary>
                <pre style={styles.stack}>
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={() => window.location.reload()} style={styles.btnPrimary}>
                Reload Page
              </button>
              <button onClick={this.handleReset} style={styles.btnSecondary}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-primary)",
    padding: "24px",
    fontFamily: "var(--font-display)",
    position: "relative",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "40px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "var(--shadow-card), var(--shadow-glow-red)",
    textAlign: "center",
    animation: "scaleIn 0.3s ease",
  },
  iconContainer: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "var(--text-primary)",
    marginBottom: "8px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    marginBottom: "24px",
  },
  details: {
    textAlign: "left",
    marginBottom: "24px",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "12px",
  },
  summary: {
    fontSize: "12px",
    color: "var(--accent)",
    cursor: "pointer",
    fontWeight: "bold",
    fontFamily: "var(--font-mono)",
    outline: "none",
  },
  stack: {
    marginTop: "10px",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    color: "var(--red)",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: "150px",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnSecondary: {
    padding: "10px 20px",
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};
