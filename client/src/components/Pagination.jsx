import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-container" style={{ marginTop: "32px", justifyContent: "flex-end" }}>
      <span style={{ marginRight: "16px", color: "var(--text-muted)", fontSize: "14px" }}>
        Page {page} of {totalPages}
      </span>
      <div className="pagination-actions">
        <button
          className="btn btn-outline btn-sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <FiChevronLeft size={16} /> Prev
        </button>
        <button
          className="btn btn-outline btn-sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          Next <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
