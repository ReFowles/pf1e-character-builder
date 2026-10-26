// Dark mode is a per-device preference (not saved with characters). Until the
// user toggles it, it follows the OS. index.html applies it before first paint.

const KEY = 'pf1e:theme';

function initial(): boolean {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

class Theme {
  #dark = $state(initial());

  get dark() {
    return this.#dark;
  }
  set dark(on: boolean) {
    this.#dark = on;
    localStorage.setItem(KEY, on ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', on);
  }
}

export const theme = new Theme();
