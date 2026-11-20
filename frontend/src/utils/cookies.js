export function getCookie(name) {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}
