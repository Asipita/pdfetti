"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/shared/brand";

type HomeNavProps = {
  repositoryUrl: string;
};

export function HomeNav({ repositoryUrl }: HomeNavProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("home-hero");
    if (!hero) return;

    let frame = 0;
    const updateBackground = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const navHeight = navRef.current?.getBoundingClientRect().height ?? 72;
        const nextOverHero = hero.getBoundingClientRect().bottom > navHeight;
        setOverHero((current) => (current === nextOverHero ? current : nextOverHero));
      });
    };

    updateBackground();
    window.addEventListener("scroll", updateBackground, { passive: true });
    window.addEventListener("resize", updateBackground);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateBackground);
      window.removeEventListener("resize", updateBackground);
    };
  }, []);

  return (
    <header
      className={`home-nav${overHero ? "" : " is-scrolled"}`}
      ref={navRef}
    >
      <div className="container home-nav-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <Link href="/extract-pdf-pages/">Extract pages</Link>
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <Link href="/editor/" className="home-nav-action">
            Open editor <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
