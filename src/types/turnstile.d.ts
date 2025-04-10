interface Window {
  turnstile: {
    render: (container: string | HTMLElement, options: any) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
    getResponse: (widgetId: string) => string | undefined;
  };
  onloadTurnstileCallback?: () => void;
}

declare namespace Turnstile {
  interface RenderOptions {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    tabindex?: number;
    appearance?: 'always' | 'execute' | 'interaction-only';
  }
} 