// Ensure fetch is always settable in browser/iframe environments where Window has only a getter
(function patchGlobalFetch() {
  if (typeof window === 'undefined') return;
  try {
    let currentFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined;

    const defineAccessor = (target: any) => {
      if (!target) return;
      try {
        Object.defineProperty(target, 'fetch', {
          get() {
            return currentFetch;
          },
          set(newFetch) {
            currentFetch = newFetch;
          },
          configurable: true,
          enumerable: true,
        });
      } catch {
        // ignore
      }
    };

    defineAccessor(window);
    if (typeof globalThis !== 'undefined' && globalThis !== window) {
      defineAccessor(globalThis);
    }
    if (typeof self !== 'undefined' && self !== window) {
      defineAccessor(self);
    }

    let proto = window;
    while (proto) {
      try {
        const desc = Object.getOwnPropertyDescriptor(proto, 'fetch');
        if (desc && (!desc.set || !desc.writable)) {
          defineAccessor(proto);
        }
      } catch {
        // ignore
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch {
    // ignore
  }
})();
