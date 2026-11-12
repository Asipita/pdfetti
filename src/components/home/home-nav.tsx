"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/shared/brand";

type HomeNavProps = {
  repositoryUrl: string;
};

export function HomeNav({ repositoryUrl }: HomeNavProps) {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("home-hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`home-nav${overHero ? "" : " is-scrolled"}`}>
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
