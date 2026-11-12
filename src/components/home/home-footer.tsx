"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/shared/brand";

type HomeFooterProps = {
  repositoryUrl: string;
};

export function HomeFooter({ repositoryUrl }: HomeFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      className={`home-footer${revealed ? " is-revealed" : ""}`}
      ref={footerRef}
    >
      <div className="container home-footer-art">
        <span className="home-footer-kicker">PDF WORK, WITHOUT THE BUSYWORK</span>
        <div className="home-footer-wordmark" aria-hidden="true">
          PDF<span>etti</span>
        </div>
        <div className="home-footer-art-caption">
          <span>Make room for the work that matters.</span>
          <Link href="/editor/">
            Start with a PDF <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="container home-footer-inner">
        <Brand />
        <span>Fill it. Sign it. Download it. No catches.</span>
        <nav aria-label="Footer">
          <Link href="/privacy/">Privacy</Link>
          <Link href="/editor/">Editor</Link>
          <Link href="/extract-pdf-pages/">Extract pages</Link>
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
