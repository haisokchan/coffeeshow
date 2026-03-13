import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>('dark');

  constructor() {
    const savedTheme = this.loadThemeFromStorage();
    this.theme.set(savedTheme);
    
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggleTheme(): void {
    const newTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(newTheme);
    this.saveThemeToStorage(newTheme);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.saveThemeToStorage(theme);
  }

  private loadThemeFromStorage(): Theme {
    if (typeof window === 'undefined') return 'dark';
    
    const saved = localStorage.getItem('coffee-app-theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    
    return 'dark';
  }

  private saveThemeToStorage(theme: Theme): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('coffee-app-theme', theme);
    }
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }
}