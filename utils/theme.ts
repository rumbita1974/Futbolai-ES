export function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(theme: "light" | "dark") {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
