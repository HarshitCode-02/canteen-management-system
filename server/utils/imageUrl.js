function isValidImageUrl(value) {
  if (typeof value !== "string") return false;
  const image = value.trim();
  if (!image) return true;
  if (image.length > 2048) return false;

  try {
    const url = new URL(image);
    return ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

module.exports = { isValidImageUrl };
