import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, Check, Send } from "lucide-react";
import { GreenBtn, GhostBtn, inputCls } from "../../global/components/ui/hw-ui";
const SECTIONS = [
  { id: "about", label: "About HarvestWise" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "faqs", label: "Help / FAQs" },
  { id: "support", label: "Contact Support" }
];
const FAQS = [
  { q: "How do I add a DFTC user?", a: "Go to System Management > User Accounts and click Add User." },
  { q: "Where do I manage roles and permissions?", a: "Go to System Management > Roles & Permissions." },
  { q: "Where do I check system health?", a: "Go to System Management > System Health." },
  { q: "Where do I review uploaded datasets?", a: "Go to Data and open the relevant data source or upload record." },
  { q: "Where do I update thresholds and weights?", a: "Go to Analytics > Weights & Thresholds." },
  { q: "Where do I review processing records?", a: "Go to Processing History." }
];
const AboutContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise helps administrators manage agricultural datasets, monitor system processing, review forecasts and analytical outputs, manage user access, and support crop advisory generation for Davao City vegetable farmers.
  </p>;
const PrivacyContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise protects account and system-related information, including administrator details, user account records, access permissions, submitted datasets, processing activity, and system logs. These details are used only for system management, data validation, monitoring, and HarvestWise processing.
  </p>;
const TermsContent = () => <p className="text-[15px] text-black leading-relaxed">
    HarvestWise provides data management and decision-support information only. Forecasts, analytical outputs, system indicators, and advisory results should be reviewed carefully and should not be treated as guarantees of market prices, production outcomes, system availability, or farm profitability.
  </p>;
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
          {open === i && <p className="px-4 pb-4 pt-3 text-[14px] text-black leading-relaxed border-t border-[var(--hw-neutral-100)]">
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
        <p className="text-[15px] text-black">Your message has been sent.</p>
        <GhostBtn onClick={() => {
      setSent(false);
      setForm({ subject: "", message: "" });
    }}>
          Send another
        </GhostBtn>
      </div>;
  }
  return <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label htmlFor="adm-ab-subject" className="block text-[14px] font-semibold text-black mb-1.5">Subject</label>
          <input
    id="adm-ab-subject"
    type="text"
    value={form.subject}
    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
    placeholder="e.g. Issue with user account"
    className={inputCls}
  />
        </div>
        <div>
          <label htmlFor="adm-ab-msg" className="block text-[14px] font-semibold text-black mb-1.5">Message</label>
          <textarea
    id="adm-ab-msg"
    rows={4}
    value={form.message}
    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
    placeholder="Describe your question or issue…"
    className="w-full px-3.5 py-3 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)] resize-none"
  />
        </div>
      </div>
      <GreenBtn
    onClick={() => setSent(true)}
    disabled={!form.subject.trim() || !form.message.trim()}
  >
        <Send className="w-4 h-4" />
        Send message
      </GreenBtn>
    </div>;
};
const SECTION_CONTENT = {
  about: AboutContent,
  privacy: PrivacyContent,
  terms: TermsContent,
  faqs: FAQsContent,
  support: SupportContent
};
const AccordionItem = React.forwardRef(({ id, label, isOpen, onToggle }, ref) => {
  const Content = SECTION_CONTENT[id];
  return <div
    ref={ref}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden"
  >
      <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
        <span className="text-[16px] font-semibold text-black">{label}</span>
        <ChevronDown
    className={`w-5 h-5 text-black flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
  />
      </button>
      {isOpen && <div className="px-5 pb-5 pt-4 border-t border-[var(--hw-neutral-100)] text-[15px] text-black leading-relaxed">
          <Content />
        </div>}
    </div>;
});
AccordionItem.displayName = "AccordionItem";
function AdminAbout() {
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
  const toggle = (id) => setOpenId((prev) => prev === id ? "about" : id);
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1240px] mx-auto space-y-3">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-black">About</h1>
        <p className="text-[15px] text-black mt-0.5">Information, support, and legal details.</p>
      </div>

      {SECTIONS.map((sec) => <AccordionItem
    key={sec.id}
    id={sec.id}
    label={sec.label}
    isOpen={openId === sec.id}
    onToggle={() => toggle(sec.id)}
    ref={openId === sec.id ? scrollRef : void 0}
  />)}
    </div>;
}
export {
  AdminAbout as default
};
