import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Scale } from "lucide-react";

const sections = [
  { title: "Acceptance of Terms", content: "By accessing or using ApnaStay, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the platform." },
  { title: "User Accounts", content: "You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials. Accounts found with false information may be suspended." },
  { title: "Property Listings", content: "Property owners are responsible for the accuracy of their listings. ApnaStay reserves the right to remove listings that violate our guidelines or contain misleading information." },
  { title: "Payments & Subscriptions", content: "Subscription fees are billed monthly and are non-refundable. Free trial periods, if offered, will convert to paid subscriptions unless cancelled before expiry." },
  { title: "Prohibited Activities", content: "Users may not: post fraudulent listings, harass other users, scrape data from the platform, impersonate others, or use the platform for illegal activities." },
  { title: "Limitation of Liability", content: "ApnaStay acts as a platform connecting tenants and property owners. We are not responsible for the condition of properties, disputes between parties, or losses arising from transactions." },
  { title: "Termination", content: "We reserve the right to suspend or terminate accounts that violate these terms. Users may delete their accounts at any time through account settings." },
  { title: "Governing Law", content: "These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Mumbai, Maharashtra." },
];

const TermsOfService = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <main className="flex-1">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-primary/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Scale className="h-8 w-8" />
            <span className="text-sm font-semibold uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2 text-base">Effective: March 8, 2026</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Please read these terms carefully before using ApnaStay. By using our platform, you agree to these terms.
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
            to="/privacy"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Privacy Policy
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

export default TermsOfService;
