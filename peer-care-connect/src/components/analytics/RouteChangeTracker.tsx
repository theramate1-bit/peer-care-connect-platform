import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: 'page_view',
        page_path: location.pathname + location.search,
        page_title: document.title,
        page_location: window.location.href,
      });
    } catch {}
  }, [location]);

  return null;
};

export default RouteChangeTracker;


