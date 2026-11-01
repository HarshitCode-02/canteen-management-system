import { useState } from "react";

export default function FoodItemImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className={`food-image-fallback ${className}`.trim()} role="img" aria-label={`${alt}: image unavailable`}>
        <span aria-hidden="true">🍽</span>
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
