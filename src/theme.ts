/**
 * Envo 主题切换共享模块
 * 与 index.html 顶部的防闪烁脚本保持同一套约定：
 *   - 主题状态以 <html class="dark"> 为准
 *   - 持久化键 localStorage('envo-theme')，取值 'dark' | 'light'
 *   - 默认深色（无值时强制 dark，避免 FOUC）
 * App 页头一键切换与 Settings 分段控件共用本模块，避免两套逻辑漂移。
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'envo-theme';

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(next: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', next === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* localStorage 不可用（隐私模式等）时静默降级，仅本次会话生效 */
  }
}
