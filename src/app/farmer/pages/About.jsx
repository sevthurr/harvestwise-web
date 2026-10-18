import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CanonicalAboutContent } from "../../global/components/about/CanonicalAboutContent";

const FAQS = [
  {
    q: "How do I update my farm location?",
    a: 'Go to Settings → Farm Profile and tap "Use my location" to detect your location automatically, or update the City, District, and Barangay fields manually.'
  },
  {
    q: "How do I change my preferred crops?",
    a: "Go to Settings → Farm Profile and select or deselect crops from the crop list. You can also update your preferred variety for each crop."
  },
  {
    q: "Why do advisories change?",
    a: "Advisories are updated based on current market prices, weather conditions, and seasonal crop data. Changes reflect the latest available information."
  },
  {
    q: "Can I use HarvestWise with limited internet?",
    a: 'Yes. HarvestWise stores recent prices, forecasts, and advisories for offline use. Tap "Sync now" in Settings → Preferences to update your offline data when you have a connection.'
  },
  {
    q: "How does HarvestWise get price data?",
    a: "Price data is collected from the Davao City Farmers Market Authority (DFTC) and updated regularly. Prices reflect retail and wholesale market conditions."
  }
];

const AboutContent = () => (
  <CanonicalAboutContent showStandaloneLink={true} />
);

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
    <div ref={isOpen ? scrollRef : undefined} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
      >
        <span className="text-[16px] font-semibold text-black">{title}</span>
        <ChevronDown className={`w-5 h-5 text-black flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
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

function AboutPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const sectionParam = params.get("section");
  const validSections = ["about", "faqs"];
  const initialOpen = validSections.includes(sectionParam) ? sectionParam : "about";
  const [openId, setOpenId] = useState(initialOpen);
  const scrollRef = useRef(null);

  const sections = [
    { id: "about", title: t("farmer.about.title", {}, "About HarvestWise") },
    { id: "faqs", title: t("farmer.about.help_faqs", {}, "Help / FAQs") }
  ];

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
        title={t("farmer.about.title", {}, "About")}
        description="Information and frequently asked questions."
      />

      {sections.map((sec) => (
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

export {
  AboutPage as default
};
