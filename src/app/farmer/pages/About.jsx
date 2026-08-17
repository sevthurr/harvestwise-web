import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, Check, Send } from "lucide-react";
const FAQS = [
  {
    q: "How do I update my farm location?",
    a: 'Go to Settings \u2192 Farm Profile and tap "Use my location" to detect your location automatically, or update the City, District, and Barangay fields manually.'
  },
  {
    q: "How do I change my preferred crops?",
    a: "Go to Settings \u2192 Farm Profile and select or deselect crops from the crop list. You can also update your preferred variety for each crop."
  },
  {
    q: "Why do advisories change?",
    a: "Advisories are updated based on current market prices, weather conditions, and seasonal crop data. Changes reflect the latest available information."
  },
  {
    q: "Can I use HarvestWise with limited internet?",
    a: 'Yes. HarvestWise stores recent prices, forecasts, and advisories for offline use. Tap "Sync now" in Settings \u2192 Preferences to update your offline data when you have a connection.'
  },
  {
    q: "How does HarvestWise get price data?",
    a: "Price data is collected from the Davao City Farmers Market Authority (DFTC) and updated regularly. Prices reflect retail and wholesale market conditions."
  }
];
const SECTIONS = [
  { id: "about", title: "About HarvestWise" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "terms", title: "Terms & Conditions" },
  { id: "faqs", title: "Help / FAQs" },
  { id: "support", title: "Contact Support" }
];
const PrivacyContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise protects the personal and farm-related information you provide, including your account details, farm location, crop plans, production costs, expected yield, and selling price information. These details are used only to provide crop advisories, price monitoring, weather guidance, and related system features.
  </p>;
const TermsContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise provides decision-support information only. Price forecasts, profit estimates, weather guidance, and planting advisories are not guarantees of future prices, harvest results, income, or farm profitability. Farmers should still use their own judgment and local farming knowledge when making decisions.
  </p>;
const AboutContent = () => <div className="space-y-3 text-[15px] text-black leading-relaxed">
    <p>HarvestWise helps Davao City vegetable farmers view market prices, weather context, crop schedules, and planting advisories in one place.</p>
    <p>The platform is designed for highland vegetable farmers in Marilog, Calinan, and nearby barangays who sell at Bangkerohan and other Davao City markets.</p>
    <div className="pt-1 space-y-1.5">
      {[
  ["Version", "1.0.0 (prototype)"],
  ["Region", "Davao City, Philippines"],
  ["Data source", "Davao City Farmers Market Authority (DFTC)"]
].map(([label, val]) => <div key={label} className="flex gap-2">
          <span className="text-[14px] font-semibold text-black min-w-[100px]">{label}:</span>
          <span className="text-[14px] text-black">{val}</span>
        </div>)}
    </div>
  </div>;
const FAQsContent = () => {
  const [open, setOpen] = useState(0);
  return <div className="space-y-2">
      {FAQS.map((faq, i) => <div key={i} className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
          <button
    type="button"
    onClick={() => setOpen(open === i ? null : i)}
    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            <span className="text-[15px] font-medium text-black pr-3">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="px-4 pb-4 text-[14px] text-black leading-relaxed border-t border-[var(--hw-neutral-100)]">
              {faq.a}
            </p>}
        </div>)}
    </div>;
};
const SupportContent = () => {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);
  if (sent) {
    return <div className="flex flex-col items-center py-6 gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-[15px] font-semibold text-black">Message sent</p>
        <p className="text-[14px] text-black text-center">Your message has been sent. The HarvestWise team will get back to you.</p>
        <button
      type="button"
      onClick={() => {
        setSent(false);
        setForm({ subject: "", message: "" });
      }}
      className="mt-2 h-9 px-4 border border-[var(--hw-neutral-200)] text-[14px] font-medium text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
    >
          Send another
        </button>
      </div>;
  }
  return <div className="space-y-4">
      <p className="text-[15px] text-black">For questions or support, contact the HarvestWise team.</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="ab-subject" className="block text-[14px] font-semibold text-black mb-1.5">Subject</label>
          <input
    id="ab-subject"
    type="text"
    value={form.subject}
    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
    placeholder="e.g. Issue with my farm profile"
    className="w-full h-11 px-3.5 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
  />
        </div>
        <div>
          <label htmlFor="ab-msg" className="block text-[14px] font-semibold text-black mb-1.5">Message</label>
          <textarea
    id="ab-msg"
    rows={4}
    value={form.message}
    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
    placeholder="Describe your question or issue…"
    className="w-full px-3.5 py-3 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)] resize-none"
  />
        </div>
      </div>
      <button
    type="button"
    onClick={() => setSent(true)}
    disabled={!form.subject.trim() || !form.message.trim()}
    className="h-11 px-5 flex items-center gap-2 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-50 transition-colors"
  >
        <Send className="w-4 h-4" />
        Send message
      </button>
    </div>;
};
const SECTION_CONTENT = {
  privacy: PrivacyContent,
  terms: TermsContent,
  about: AboutContent,
  faqs: FAQsContent,
  support: SupportContent
};
const AccordionItem = ({ id, title, isOpen, onToggle, scrollRef }) => {
  const Content = SECTION_CONTENT[id];
  return <div ref={isOpen ? scrollRef : void 0} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <span className="text-[16px] font-semibold text-black">{title}</span>
        <ChevronDown className={`w-5 h-5 text-black flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-[var(--hw-neutral-100)]">
          <div className="pt-4">
            <Content />
          </div>
        </div>}
    </div>;
};
function AboutPage() {
  const [params] = useSearchParams();
  const sectionParam = params.get("section");
  const [openId, setOpenId] = useState(sectionParam || "about");
  const scrollRef = useRef(null);
  useEffect(() => {
    if (sectionParam) {
      setOpenId(sectionParam);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [sectionParam]);
  const toggle = (id) => setOpenId((prev) => prev === id ? null : id);
  return <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-3">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-black">About</h1>
        <p className="text-[15px] text-black mt-0.5">Information, support, and legal details.</p>
      </div>

      {SECTIONS.map((sec) => <AccordionItem
    key={sec.id}
    id={sec.id}
    title={sec.title}
    isOpen={openId === sec.id}
    onToggle={() => toggle(sec.id)}
    scrollRef={scrollRef}
  />)}
    </div>;
}
export {
  AboutPage as default
};
