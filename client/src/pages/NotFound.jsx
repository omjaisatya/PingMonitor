import React from "react";
import { Link } from "react-router-dom";
import AppName from "../AppName";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.glitchContainer}>
          <h1 style={styles.errorCode}>404</h1>
        </div>
        <h2 style={styles.title}>Page Not Found</h2>
        <p style={styles.subtitle}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/dashboard" style={styles.btn}>
          Back to Dashboard
        </Link>
      </div>
      <div style={styles.bgText}>{AppName}</div>
    </div>
  );
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
    overflow: "hidden",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "var(--shadow-card), var(--shadow-glow-accent)",
    textAlign: "center",
    animation: "scaleIn 0.3s ease",
    position: "relative",
    zIndex: 1,
  },
  glitchContainer: {
    marginBottom: "16px",
  },
  errorCode: {
    fontSize: "96px",
    fontWeight: "900",
    lineHeight: "1",
    margin: "0",
    background: "linear-gradient(135deg, var(--accent), var(--green))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-2px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "var(--text-primary)",
    marginBottom: "12px",
  },
  subtitle: {
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    marginBottom: "32px",
    lineHeight: "1.6",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-md)",
    fontWeight: "650",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "var(--shadow-glow-accent)",
  },
  bgText: {
    position: "fixed",
    bottom: "-20px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "clamp(60px, 15vw, 160px)",
    fontWeight: "800",
    color: "transparent",
    WebkitTextStroke: "1px rgba(102, 85, 255, 0.06)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    letterSpacing: "-4px",
    zIndex: 0,
  },
};
