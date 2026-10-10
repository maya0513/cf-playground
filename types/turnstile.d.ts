interface Window {
  turnstile: {
    render(
      element: HTMLElement,
      options: {
        sitekey: string;
        action: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      },
    ): string;
    reset(): void;
  };
}
