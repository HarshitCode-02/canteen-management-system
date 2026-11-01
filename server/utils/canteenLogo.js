function isValidCanteenLogo(value) {
  if (typeof value !== "string") return false;
  const logo = value.trim();
  if (!logo) return true;
  if (logo.length > 2048) return false;

  try {
    const url = new URL(logo);
    return ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

module.exports = { isValidCanteenLogo };
