import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { Shield, FileText, ArrowRight } from "lucide-react";

const sections = [
  { title: "Information We Collect", content: "We collect personal information you provide when creating an account (name, email, phone number), property listing details, search preferences, and usage analytics to improve our services." },
  { title: "How We Use Your Data", content: "Your data is used to: provide and personalize our services, connect tenants with property owners, process transactions, send relevant notifications, and improve platform security." },
  { title: "Data Sharing", content: "We share your contact details with property owners/tenants only when you initiate a booking or inquiry. We never sell your data to third-party advertisers." },
  { title: "Data Security", content: "We implement industry-standard security measures including encryption in transit and at rest, regular security audits, and access controls to protect your information." },
  { title: "Cookies & Tracking", content: "We use cookies for session management, preferences, and analytics. You can manage cookie preferences through your browser settings." },
  { title: "Your Rights", content: "You have the right to access, correct, or delete your personal data at any time. Contact us at privacy@apnastay.com to exercise these rights." },
  { title: "Updates to Policy", content: "We may update this policy periodically. Significant changes will be communicated via email or in-app notifications. Last updated: March 2026." },
];

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <main className="flex-1">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-primary/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Shield className="h-8 w-8" />
            <span className="text-sm font-semibold uppercase tracking-wider">Privacy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-base">Last updated: March 8, 2026</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        <div className="space-y-6">
          {sections.map((s, i) => (
            <article
              key={i}
              className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">{s.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/terms"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Terms of Service
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
