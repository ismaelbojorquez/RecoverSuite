import { useCallback, useSyncExternalStore } from 'react';

const subscribers = new Set();

const getCurrentPath = () => {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname + window.location.search;
};

const subscribe = (callback) => {
  subscribers.add(callback);
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', callback);
  }
  return () => {
    subscribers.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', callback);
    }
  };
};

const notify = () => {
  subscribers.forEach((cb) => cb());
};

export default function useNavigation() {
  const pathname = useSyncExternalStore(subscribe, getCurrentPath, () => '/');

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (typeof window === 'undefined' || path === undefined || path === null) {
      return;
    }

    const target =
      typeof path === 'number' ? path : String(path);

    if (typeof target === 'number') {
      window.history.go(target);
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    notify();
  }, []);

  return { pathname, navigate };
}
