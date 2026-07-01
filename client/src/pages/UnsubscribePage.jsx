import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api/axios";
import {
  FiCheckCircle,
  FiXCircle,
  FiLoader
} from "react-icons/fi";
import AppName from "../AppName";

export default function UnsubscribePage() {
  const { subscriberId } = useParams();
  const [subscriber, setSubscriber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriberDetails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/public/subscribe/${subscriberId}`);
        setSubscriber(response.data.subscriber);
        setError(null);
      } catch (err) {
        console.error("Failed to load subscription details:", err);
        setError(err.response?.data?.message || "Failed to load subscription details. The link may be expired.");
      } finally {
        setLoading(false);
      }
    };

    if (subscriberId) {
      fetchSubscriberDetails();
    }
  }, [subscriberId]);

  const handleUnsubscribe = async () => {
    setUnsubscribing(true);
    setError(null);

    try {
      await apiClient.post("/public/subscribe/unsubscribe", {
        subscriberId,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Unsubscribe action failed:", err);
      setError(err.response?.data?.message || "Failed to unsubscribe. Please try again.");
    } finally {
      setUnsubscribing(false);
    }
  };

  const getChannelLabel = (type) => {
    switch (type) {
      case "email":
        return "Email alerts";
      case "sms":
        return "SMS text alerts";
      case "telegram":
        return "Telegram bot alerts";
      case "slack":
        return "Slack webhook messages";
      case "webhook":
        return "Generic webhook calls";
      default:
        return "status page alerts";
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <FiLoader className="spinner spinner-lg" />
        <p style={{ marginTop: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans), sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <header style={{ marginBottom: "32px", textAlign: "center" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: "24px",
            background: "linear-gradient(135deg, var(--green) 0%, #3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
            marginBottom: "8px",
          }}
        >
          {AppName}
        </div>
      </header>

      <div
        className="card"
        style={{
          maxWidth: "460px",
          width: "100%",
          padding: "32px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center" }}>
            <FiCheckCircle size={48} color="var(--green)" style={{ marginBottom: "16px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>Unsubscribed Successfully</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
              You have been successfully unsubscribed from <strong>{subscriber?.userId?.statusPageTitle || "Status Page"}</strong> updates. You will no longer receive any notifications on this channel.
            </p>
            {subscriber?.userId && (
              <Link
                to={`/status/${subscriber.userId.statusPageSlug || subscriber.userId._id}`}
                className="btn btn-primary btn-full"
                style={{ justifyContent: "center" }}
              >
                Back to Status Page
              </Link>
            )}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center" }}>
            <FiXCircle size={48} color="var(--red)" style={{ marginBottom: "16px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>Request Failed</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
              {error}
            </p>
            <Link to="/" className="btn btn-outline btn-full" style={{ justifyContent: "center" }}>
              Back to Home
            </Link>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>
              Manage Subscription
            </h2>
            
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
              You are currently registered to receive <strong>{getChannelLabel(subscriber.type)}</strong> from <strong>{subscriber.userId?.statusPageTitle || "Status Page"}</strong>.
            </p>

            <div
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "24px",
                fontSize: "13.5px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Channel</span>
                <span style={{ fontWeight: 600 }}>{subscriber.type.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Destination</span>
                <span style={{ fontWeight: 600, wordBreak: "break-all", textAlign: "right" }}>{subscriber.target}</span>
              </div>
              {subscriber.monitors && subscriber.monitors.length > 0 && (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "6px" }}>Subscribed Components:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {subscriber.monitors.map((m) => (
                      <span
                        key={m._id}
                        style={{
                          background: "var(--bg-hover)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "12px",
                        }}
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                className="btn btn-danger btn-full"
                onClick={handleUnsubscribe}
                disabled={unsubscribing}
                style={{ justifyContent: "center" }}
              >
                {unsubscribing ? <span className="spinner" /> : "Unsubscribe from Status Updates"}
              </button>
              
              <Link
                to={subscriber?.userId ? `/status/${subscriber.userId.statusPageSlug || subscriber.userId._id}` : "/"}
                className="btn btn-outline btn-full"
                style={{ justifyContent: "center" }}
              >
                Cancel & Return
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
