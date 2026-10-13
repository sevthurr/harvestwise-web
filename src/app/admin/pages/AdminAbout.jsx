import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { CanonicalAboutContent } from "../../global/components/about/CanonicalAboutContent";

const SECTIONS = [
  { id: "about", label: "About HarvestWise" },
  { id: "faqs", label: "Help / FAQs" }
];

const FAQS = [
  { q: "How do I add a DFTC user?", a: "Go to System Management > User Accounts and click Add User." },
  { q: "Where do I manage roles and permissions?", a: "Go to System Management > Roles & Permissions." },
  { q: "Where do I check system health?", a: "Go to System Management > System Health." },
  { q: "Where do I review uploaded datasets?", a: "Go to Data and open the relevant data source or upload record." },
  { q: "Where do I update thresholds and weights?", a: "Go to Analytical Modules > Weights & Thresholds." },
  { q: "Where do I review processing records?", a: "Go to Data Sources and open the Processing History tab." }
];

const AboutContent = () => <CanonicalAboutContent showStandaloneLink={true} />;

const FAQsContent = () => {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => (
        <div key={i} className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            <span className="text-[15px] font-medium text-black pr-3">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && (
            <p className="px-4 pb-4 pt-3 text-[14px] text-black leading-relaxed border-t border-[var(--hw-neutral-100)]">
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

const SECTION_CONTENT = {
  about: AboutContent,
  faqs: FAQsContent
};

const AccordionItem = React.forwardRef(({ id, label, isOpen, onToggle }, ref) => {
  const Content = SECTION_CONTENT[id];
  return (
    <div
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
      {isOpen && (
        <div className="px-5 pb-5 pt-4 border-t border-[var(--hw-neutral-100)] text-[15px] text-black leading-relaxed">
          <Content />
        </div>
      )}
    </div>
  );
});
AccordionItem.displayName = "AccordionItem";

function AdminAbout() {
  const [params] = useSearchParams();
  const sectionParam = params.get("section");
  const validSections = ["about", "faqs"];
  const initialOpen = validSections.includes(sectionParam) ? sectionParam : "about";
  const [openId, setOpenId] = useState(initialOpen);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (sectionParam && validSections.includes(sectionParam)) {
      setOpenId(sectionParam);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [sectionParam]);

  const toggle = (id) => setOpenId((prev) => (prev === id ? "about" : id));

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      <PageHeader
        title="About"
        description="Information and frequently asked questions."
      />

      {SECTIONS.map((sec) => (
        <AccordionItem
          key={sec.id}
          id={sec.id}
          label={sec.label}
          isOpen={openId === sec.id}
          onToggle={() => toggle(sec.id)}
          ref={openId === sec.id ? scrollRef : void 0}
        />
      ))}
    </div>
  );
}

export { AdminAbout as default };
