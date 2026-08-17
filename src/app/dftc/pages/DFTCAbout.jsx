import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, Check, Send } from "lucide-react";
const SECTIONS = [
  { id: "about", title: "About HarvestWise" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "terms", title: "Terms & Conditions" },
  { id: "faqs", title: "Help / FAQs" },
  { id: "support", title: "Contact Support" }
];
const FAQS = [
  {
    q: "How do I submit price records?",
    a: "Use the Input page and choose Price Data."
  },
  {
    q: "How do I submit arrival volume records?",
    a: "Use the Input page and choose Arrival Volume."
  },
  {
    q: "What is a temporary market record?",
    a: "It is a record for a commodity outside the main HarvestWise crop list. It is kept for reporting and trends but is not used for forecasting or farmer advisories."
  },
  {
    q: "Why does a record need correction?",
    a: "A record may need correction if required fields are missing, duplicated, or do not match the expected format."
  },
  {
    q: "How do I upload an Excel or CSV dataset?",
    a: "Use the Upload Dataset option in the DFTC Input page."
  },
  {
    q: "Where can I check my submitted records?",
    a: "Go to the Submissions page to review submitted, accepted, failed, or correction-needed records."
  }
];
const AboutContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise helps the Davao Food Terminal Complex (DFTC) organize price and commodity arrival records so they can support market monitoring, trends, and crop advisory processing for Davao City vegetable farmers.
  </p>;
const PrivacyContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise protects the account and work-related information you provide, including your name, contact details, position, organization, submitted price records, arrival volume records, uploaded datasets, and submission activity. These details are used only for data submission, validation, monitoring, and HarvestWise system processing.
  </p>;
const TermsContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise provides data management and decision-support information only. Submitted price records, arrival volume records, trends, and system outputs should be reviewed carefully and should not be treated as guarantees of market prices, supply movement, or agricultural outcomes.
  </p>;
const FAQsContent = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return <div className="space-y-2">
      {FAQS.map((faq, i) => <div key={i} className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
          <button
    type="button"
    onClick={() => setOpenIdx(openIdx === i ? null : i)}
    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            <span className="text-[15px] font-medium text-black pr-3">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
          </button>
          {openIdx === i && <p className="px-4 pb-4 text-[14px] text-black leading-relaxed border-t border-[var(--hw-neutral-100)]">
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
        <p className="text-[15px] font-semibold text-black">Your message has been sent.</p>
        <p className="text-[14px] text-black text-center">The HarvestWise team will get back to you.</p>
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
          <label htmlFor="dftc-ab-subject" className="block text-[14px] font-semibold text-black mb-1.5">Subject</label>
          <input
    id="dftc-ab-subject"
    type="text"
    value={form.subject}
    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
    placeholder="e.g. Issue with my submission"
    className="w-full h-11 px-3.5 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
  />
        </div>
        <div>
          <label htmlFor="dftc-ab-msg" className="block text-[14px] font-semibold text-black mb-1.5">Message</label>
          <textarea
    id="dftc-ab-msg"
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
    onClick={() => {
      if (form.subject.trim() && form.message.trim()) setSent(true);
    }}
    disabled={!form.subject.trim() || !form.message.trim()}
    className="h-11 px-5 flex items-center gap-2 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-50 transition-colors"
  >
        <Send className="w-4 h-4" />
        Send message
      </button>
    </div>;
};
const SECTION_CONTENT = {
  about: AboutContent,
  privacy: PrivacyContent,
  terms: TermsContent,
  faqs: FAQsContent,
  support: SupportContent
};
const AccordionItem = ({ id, title, isOpen, onToggle, scrollRef }) => {
  const Content = SECTION_CONTENT[id];
  return <div
    ref={isOpen ? scrollRef : void 0}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden"
  >
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
function DFTCAbout() {
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
  DFTCAbout as default
};
