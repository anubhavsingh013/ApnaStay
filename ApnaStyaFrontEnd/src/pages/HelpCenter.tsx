import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import {
  Mail, Phone, MessageCircle, HelpCircle, Home, CreditCard,
  Shield, UserCheck, Search, ChevronRight, ArrowRight,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";

const faqCategories = [
  {
    label: "Getting Started",
    icon: Home,
    faqs: [
      { q: "How do I create an account on ApnaStay?", a: "Click 'Get Started' on the homepage, fill in your details (name, email, password), choose your role (Tenant, Owner, or Broker), and verify your email. You'll be ready to explore in minutes!" },
      { q: "What roles are available on ApnaStay?", a: "We support three roles: Tenant (search & book properties), Owner (list & manage your properties), and Broker (manage multiple property listings on behalf of owners)." },
      { q: "How do I list my property on ApnaStay?", a: "Sign up as an Owner, complete your profile verification, then use the 'Add Property' button on your dashboard to list your property with photos, pricing and amenities." },
      { q: "Is ApnaStay free to use?", a: "Yes! Basic browsing and searching is completely free. We offer premium subscription plans for enhanced features like priority listing, verified badges, and unlimited property views." },
    ],
  },
  {
    label: "Search & Booking",
    icon: Search,
    faqs: [
      { q: "How do I search for properties?", a: "Use the search bar on the homepage or properties page. Enter a city, area, or locality, then apply filters like price range, property type, furnishing status, and amenities to narrow results." },
      { q: "Can I schedule a property visit?", a: "Yes! On any property detail page, use the 'Schedule Visit' section to pick a date and time slot. The owner will be notified instantly and can confirm or suggest an alternative." },
      { q: "How do I save properties I like?", a: "Click the heart icon on any property card to save it to your wishlist. Access all saved properties from your Dashboard → Saved Properties tab." },
      { q: "Can I filter properties by amenities?", a: "Absolutely! Use the filter sidebar on the Properties page to filter by amenities like WiFi, parking, gym, laundry, AC, power backup, and more." },
    ],
  },
  {
    label: "Payments",
    icon: CreditCard,
    faqs: [
      { q: "What are the subscription plans available?", a: "We offer Free, Basic (₹499/mo), and Premium (₹999/mo) plans. Premium gives you unlimited property views, priority support, verified badges, and featured listing placement." },
      { q: "How do I upgrade my subscription?", a: "Go to your Dashboard → Subscription tab, select the plan you want, and complete the payment. Your new plan activates immediately." },
      { q: "Can I cancel my subscription?", a: "Yes, you can cancel anytime from Dashboard → Subscription → Manage Plan. You'll continue to have access until the end of your billing period." },
      { q: "What payment methods are accepted?", a: "We accept UPI, credit/debit cards, net banking, and popular wallets like Paytm and PhonePe." },
    ],
  },
  {
    label: "Verification",
    icon: UserCheck,
    faqs: [
      { q: "How does the verification process work?", a: "After submitting your profile, our admin team reviews your documents (ID proof, address proof, property documents) within 24-48 hours. You'll receive a notification once approved." },
      { q: "What documents do I need for verification?", a: "Owners need government-issued ID, property ownership proof, and recent utility bills. Tenants need a government-issued ID and proof of employment/enrollment." },
      { q: "What does the 'Verified' badge mean?", a: "A verified badge means the property owner's identity and property ownership have been confirmed by our team. It's a trust signal for tenants." },
    ],
  },
  {
    label: "Safety",
    icon: Shield,
    faqs: [
      { q: "Is my personal data secure?", a: "Absolutely. We use industry-standard AES-256 encryption and TLS for data in transit. We never share your personal information with third parties without your explicit consent." },
      { q: "How do I report a fraudulent listing?", a: "Click the 'Report' button on the property detail page, select the reason, and provide details. Our trust & safety team investigates all reports within 24 hours." },
      { q: "How do I report an issue with a property?", a: "Go to your Dashboard → Complaints tab and submit a new complaint with details and photos if applicable. Our team will follow up within 24 hours." },
      { q: "Can I delete my account?", a: "Yes, go to your Profile → Settings → Delete Account. All your data will be permanently removed within 30 days as per our data retention policy." },
    ],
  },
];

const HelpCenter = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 py-14 md:py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-primary-foreground rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 max-w-3xl text-center relative z-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm mb-5">
            <HelpCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            How can we help you?
          </h1>
          <p className="text-primary-foreground/80 text-base md:text-lg max-w-md mx-auto">
            Browse our FAQs or reach out — we're here for you
          </p>
        </div>
      </div>

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-14 max-w-5xl">

          {/* Contact cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-10 md:mb-16 -mt-10 md:-mt-12 relative z-20">
            {[
              { icon: Mail, title: "Email Us", desc: "support@apnastay.com", sub: "Reply within 4 hrs" },
              { icon: Phone, title: "Call Us", desc: "+91 1800-123-4567", sub: "Mon–Sat, 9–9 PM" },
              { icon: MessageCircle, title: "Live Chat", desc: "Chat with our team", sub: "9 AM – 9 PM" },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-2xl p-5 md:p-6 flex sm:flex-col items-center sm:items-center gap-4 sm:gap-0 sm:text-center shadow-sm hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center sm:mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <item.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-sm font-medium text-primary truncate">{item.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 md:mb-8">
            Frequently Asked Questions
          </h2>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Category sidebar - horizontal scroll on mobile, vertical on desktop */}
            <div className="lg:w-56 shrink-0">
              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                {faqCategories.map((cat, i) => (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(i)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:w-full ${
                      activeCategory === i
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <cat.icon className="h-4 w-4 shrink-0" />
                    {cat.label}
                    <ChevronRight className={`h-3.5 w-3.5 ml-auto hidden lg:block transition-transform ${activeCategory === i ? "translate-x-0.5" : ""}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ accordion */}
            <div className="flex-1 min-w-0">
              <Accordion type="single" collapsible className="space-y-2.5">
                {faqCategories[activeCategory].faqs.map((faq, i) => (
                  <AccordionItem
                    key={`${activeCategory}-${i}`}
                    value={`faq-${activeCategory}-${i}`}
                    className="border border-border rounded-xl px-4 md:px-5 bg-card data-[state=open]:shadow-md data-[state=open]:border-primary/20 transition-all"
                  >
                    <AccordionTrigger className="text-sm md:text-[15px] font-semibold text-foreground hover:no-underline py-4 md:py-5 text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 md:pb-5">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Still need help */}
          <div className="mt-12 md:mt-16 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/10 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">Still have questions?</h3>
              <p className="text-muted-foreground text-sm">
                Can't find what you're looking for? Our support team is ready to help.
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shrink-0 text-sm"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HelpCenter;
