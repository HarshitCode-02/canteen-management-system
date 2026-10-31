const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const renderOrigin = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderOrigin) configuredOrigins.push(renderOrigin);
  return [...new Set(configuredOrigins)];
};

module.exports = { getAllowedOrigins };
