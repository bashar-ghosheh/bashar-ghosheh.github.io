function stored(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
}
document.documentElement.dataset.theme =
  stored('encs-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
