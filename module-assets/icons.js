// Small inline SVG icon set shared by every page (no icon library to load).
// In HTML write <i data-icon="thermometer"></i>. In JavaScript call icon('thermometer').
const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  thermometer: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v8"/>',
  wave: '<path d="M3 12c3-8 6-8 9 0s6 8 9 0"/>',
  spring: '<path d="M12 2v3M6 5h12L6 9.7l12 4.6L6 19h12M12 19v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M7.5 11c1-2.5 2-2.5 3.5 0s2.5 2.5 3.5 0"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.5L20 16M20 20v-4h-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  ruler: '<path d="M3 8h18v8H3zM7 8v3M11 8v4M15 8v3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17v.1"/>',
  users: '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  chart: '<path d="M4 4v16h16M7 15c3 0 3-8 6-8s3 5 7 5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 15h9"/>',
  checklist: '<path d="M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>',
  cup: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2c0 1.5 1 1.5 1 3M12 2c0 1.5 1 1.5 1 3"/>',
  grid: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  // Homework 2 (Control section)
  loop: '<path d="M4 12a8 8 0 0 1 14.5-4.6M20 12a8 8 0 0 1-14.5 4.6M18.5 3v4.4h-4.4M5.5 21v-4.4h4.4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4z"/>',
  eyeLag: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><path d="M12 9v3l2 1.5"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  motor: '<circle cx="10" cy="12" r="6"/><circle cx="10" cy="12" r="2"/><path d="M16 12h6M4 6l2 2M4 18l2-2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
}
for (const holder of document.querySelectorAll('[data-icon]')) {
  holder.outerHTML = icon(holder.dataset.icon);
}
