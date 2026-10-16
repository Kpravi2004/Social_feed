import { useEffect, useRef } from "react";

export default function ScrollSentinel({ onVisible, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (disabled || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible();
      },
      { rootMargin: "200px" } // trigger before it's fully in view
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible, disabled]);

  return <div ref={ref} className="h-4" />;
}
