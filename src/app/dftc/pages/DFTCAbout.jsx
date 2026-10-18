import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { CanonicalAboutContent } from "../../global/components/about/CanonicalAboutContent";

const SECTIONS = [
  { id: "about", title: "About HarvestWise" },
  { id: "faqs", title: "Help / FAQs" }
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

const AboutContent = () => <CanonicalAboutContent showStandaloneLink={true} />;

const FAQsContent = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => (
        <div key={i} className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
          >
            <span className="text-[15px] font-medium text-black pr-3">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
          </button>
          {openIdx === i && (
            <p className="px-4 pb-4 text-[14px] text-black leading-relaxed border-t border-[var(--hw-neutral-100)]">
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

const AccordionItem = ({ id, title, isOpen, onToggle, scrollRef }) => {
  const Content = SECTION_CONTENT[id];
  return (
    <div
      ref={isOpen ? scrollRef : void 0}
      className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
      >
        <span className="text-[16px] font-semibold text-black">{title}</span>
        <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-[var(--hw-neutral-100)]">
          <div className="pt-4">
            <Content />
          </div>
        </div>
      )}
    </div>
  );
};

function DFTCAbout() {
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

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

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
          title={sec.title}
          isOpen={openId === sec.id}
          onToggle={() => toggle(sec.id)}
          scrollRef={scrollRef}
        />
      ))}
    </div>
  );
}

export { DFTCAbout as default };
