import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, Clock, ArrowRight, CheckCircle2, User, MessageSquare } from "lucide-react";
import { toastSuccess } from "@/lib/app-toast";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";

const ContactUs = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toastSuccess("Message Sent!", "We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-stone-100 to-primary/10 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-6 sm:p-8 border border-stone-200/90">
            <div className="flex justify-center mb-6">
              <ApnaStayLogo variant="dark" size="large" showSlogan={false} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight text-center mb-1">Get in Touch</h1>
            <p className="text-sm text-stone-600 text-center mb-6">Have a question or feedback? We&apos;d love to hear from you.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Subject</Label>
                <div className="relative group">
                  <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="What's this about?"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    className="pl-11 h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">Message</Label>
                <Textarea
                  placeholder="Tell us more about your query..."
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  className="rounded-xl border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-500 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={submitted}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all"
              >
                {submitted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Message Sent!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-200 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Quick contact</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a href="mailto:support@apnastay.com" className="flex items-center gap-2 text-stone-600 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" /> support@apnastay.com
                </a>
                <a href="tel:+911800123456" className="flex items-center gap-2 text-stone-600 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" /> +91 1800-123-4567
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Clock className="h-3.5 w-3.5" />
                Mon–Sat, 9 AM – 9 PM • WeWork BKC, Mumbai 400051
              </div>
            </div>
          </div>

          <p className="text-center mt-6">
            <Link to="/help" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Browse FAQs for quick answers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;
