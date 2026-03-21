import { Link, useLocation } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const scrollToTop = () => window.scrollTo(0, 0);

const Footer = () => {
  const location = useLocation();
  const isCurrent = (to: string) => {
    const full = to.split("#")[0];
    const [path, qs] = full.includes("?") ? full.split("?") : [full, ""];
    const wantSearch = qs ? `?${qs}` : "";
    return location.pathname === path && location.search === wantSearch;
  };

  return (
  <footer data-demo-allow className="bg-foreground text-primary-foreground/80">
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="url(#footer-logo-grad)" />
              <path d="M24 13L12 24H16V34H32V24H36L24 13Z" fill="white" fillOpacity="0.95" />
              <rect x="21" y="25" width="6" height="9" rx="1" fill="url(#footer-logo-grad)" />
              <rect x="17" y="20" width="4" height="4" rx="0.5" fill="url(#footer-logo-grad)" fillOpacity="0.5" />
              <rect x="27" y="20" width="4" height="4" rx="0.5" fill="url(#footer-logo-grad)" fillOpacity="0.5" />
              <defs>
                <linearGradient id="footer-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="hsl(174, 62%, 40%)" />
                  <stop offset="1" stopColor="hsl(174, 62%, 28%)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-bold text-primary-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Apna<span className="text-primary">Stay</span>
            </span>
          </div>
          <p className="text-sm text-primary-foreground/60 leading-relaxed mb-5">
            Your trusted platform for finding the perfect rental home. Subscribe today and get access to premium properties.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>
          </div>
        </div>

        {[
          {
            title: "Quick Links",
            links: [
              { label: "Home", to: "/" },
              { label: "Browse Properties", to: "/properties" },
              { label: "Create Account", to: "/signup" },
            ],
          },
          {
            title: "Property Types",
            links: [
              { label: "Flats & Apartments", to: "/properties?type=Flat" },
              { label: "PG Accommodations", to: "/properties?type=PG" },
              { label: "Hostels", to: "/properties?type=Hostel" },
              { label: "Co-living Spaces", to: "/properties?type=Co-living" },
            ],
          },
          {
            title: "Support",
            links: [
              { label: "Help & FAQs", to: "/help" },
              { label: "Contact Us", to: "/contact" },
              { label: "Complaints", to: "/#featured-properties" },
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Terms of Service", to: "/terms" },
            ],
          },
        ].map((section) => (
          <div key={section.title}>
            <h4 className="font-semibold text-primary-foreground mb-4">{section.title}</h4>
            <ul className="space-y-2.5">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    onClick={() => { if (isCurrent(link.to)) scrollToTop(); }}
                    className="text-sm text-primary-foreground/60 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-primary/20 mt-12 pt-8 text-center text-sm text-primary-foreground/40">
        © 2026 ApnaStay. All rights reserved.
      </div>
    </div>
  </footer>
  );
};

export default Footer;
