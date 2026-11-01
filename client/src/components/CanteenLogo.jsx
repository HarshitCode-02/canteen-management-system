import { useState } from "react";

export default function CanteenLogo({ src, name, className = "" }) {
  const [failed, setFailed] = useState(!src);

  return (
    !failed ? (
      <div className={`canteen-card-image ${className}`.trim()}>
        <img
          src={src}
          alt={`${name} canteen`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
    ) : (
      <div className={`canteen-card-image canteen-card-image-fallback ${className}`.trim()} role="img" aria-label={`${name} image unavailable`}>
        <img src="/pwa-icon.svg" alt="" />
        <span>CampusBites</span>
      </div>
    )
  );
}
