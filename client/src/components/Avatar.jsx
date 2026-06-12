import { useState, useEffect } from "react";
import { md5 } from "../utils/md5";
import "../styles/Avatar.css";

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export default function Avatar({ user, size = "md", className = "" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackStage, setFallbackStage] = useState(0);

  const name = user?.name || "User";
  const email = user?.email || "";
  const uploadedUrl = user?.avatar?.url;

  useEffect(() => {
    setIsLoading(true);
    setFallbackStage(0);
  }, [uploadedUrl, email, name]);

  const emailHash = email ? md5(email.trim().toLowerCase()) : "";
  const gravatarUrl = emailHash
    ? `https://www.gravatar.com/avatar/${emailHash}?d=404`
    : null;
  const initialsUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

  let currentSrc = initialsUrl;
  if (fallbackStage === 0 && uploadedUrl) {
    currentSrc = uploadedUrl;
  } else if (fallbackStage <= 1 && gravatarUrl) {
    currentSrc = gravatarUrl;
  } else {
    currentSrc = initialsUrl;
  }

  const handleError = () => {
    if (fallbackStage === 0 && uploadedUrl) {
      setFallbackStage(gravatarUrl ? 1 : 2);
    } else if (
      fallbackStage === 1 ||
      (fallbackStage === 0 && !uploadedUrl && gravatarUrl)
    ) {
      setFallbackStage(2);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const sizePx = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
      }}
    >
      {isLoading && <div className="avatar-skeleton" />}
      <img
        src={currentSrc}
        alt={name}
        className="avatar-img"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoading ? 0 : 1,
        }}
      />
    </div>
  );
}
