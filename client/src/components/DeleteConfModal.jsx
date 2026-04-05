export default function DeleteConfModal({
  monitor,
  onClose,
  onConfirm,
  loading,
}) {
  // bailout if modal was somehow fired without a target payload
  if (!monitor) {
    console.warn(
      "DeleteConfirmModal missing monitor prop -> rendering aborted.",
    );
    return null;
  }

  const dismissOnBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={dismissOnBackdropClick}>
      <div className="modal">
        <h2 className="modal-title">🗑 Delete Monitor</h2>

        {/* TODO: extract these inline styles to the global theme file later */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            color: "var(--text-secondary)",
            lineHeight: "1.7",
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {monitor.name}
          </strong>
          ?
          <br />
          This will also permanently delete all associated logs.
        </p>

        <div className="modal-actions">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
