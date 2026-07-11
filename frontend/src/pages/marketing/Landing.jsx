import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Activity, ShieldAlert, TrendingUp, Bell, Sparkles,
} from 'lucide-react';

import Button from '../../components/ui/Button.jsx';
import Section from '../../components/marketing/Section.jsx';
import SectionHeading from '../../components/marketing/SectionHeading.jsx';
import CapabilityCard from '../../components/marketing/CapabilityCard.jsx';
import PlatformPreview from '../../components/marketing/PlatformPreview.jsx';

const CAPABILITIES = [
  {
    icon: Activity,
    title: 'Disease Surveillance',
    description: 'Continuous intake of case and death reports from the field, normalized and ready for analysis.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Intelligence',
    description: 'Live zone-level risk scoring based on case density, growth velocity and disease severity.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting',
    description: 'Per-disease, per-region time-series models with calibrated confidence over a 14-day horizon.',
  },
  {
    icon: Bell,
    title: 'Alert Operations',
    description: 'Tiered, deduplicated alerts with clean acknowledge and resolve workflows for every event.',
  },
];

export default function Landing() {
  const { openGetStarted, primaryLabel } = useOutletContext();
  const label = primaryLabel || 'Get started';

  return (
    <>
      {/* 1 — HERO */}
      <section className="relative bg-hero pt-24 pb-32 lg:pt-36 lg:pb-44 overflow-hidden">
        <div className="absolute inset-0 bg-grid-fine opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] pointer-events-none" />

        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className="inline-flex items-center gap-2 bg-surface border border-line rounded-full pl-2 pr-3.5 py-1.5 shadow-soft">
              <span className="inline-flex items-center gap-1.5 bg-ink text-white text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> New
              </span>
              <span className="text-[12.5px] text-ink-2">
                Forecast models now per-region & per-disease
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="display-tight text-[52px] sm:text-[80px] lg:text-[112px] text-ink mt-10 max-w-6xl"
            >
              Epidemic intelligence,<br />
              <span className="text-mute">in real time.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-[17px] lg:text-[20px] text-mute mt-8 max-w-2xl leading-relaxed"
            >
              EpiCast helps health authorities and clinics monitor outbreaks,
              analyze risk zones and forecast disease trends — all from one calm command surface.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-12"
            >
              <Button
                variant="primary"
                size="xl"
                iconRight={ArrowRight}
                onClick={openGetStarted}
                className="!h-14 !px-8 !text-[15px]"
              >
                {label}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2 — PLATFORM OVERVIEW */}
      <Section id="platform" className="!py-28 lg:!py-36 border-y border-line bg-surface">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="eyebrow mb-5">Platform</div>
            <h2 className="display text-[44px] sm:text-[56px] lg:text-[68px] text-ink leading-[1]">
              One surface for outbreak operations.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 lg:pl-8"
          >
            <p className="text-[18px] lg:text-[20px] text-ink-2 leading-relaxed">
              EpiCast unifies field reports, geographic risk and predictive
              models into a calm, fast interface designed for clinicians,
              operations teams and leadership.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-8 lg:gap-12 border-t border-line pt-10">
              {[
                ['12.4M', 'Reports ingested'],
                ['1,420', 'Regions monitored'],
                ['94.2%', 'Forecast accuracy'],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="display text-[34px] lg:text-[42px] text-ink tabular-nums">{v}</div>
                  <div className="text-[12.5px] text-mute mt-2">{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* 3 — CORE CAPABILITIES */}
      <Section id="capabilities" className="!py-28 lg:!py-36">
        <SectionHeading
          eyebrow="Core capabilities"
          title="Built for the entire outbreak loop."
          description="From field signal to coordinated response — every step is first-class."
          align="center"
        />

        <div className="mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {CAPABILITIES.map((c, i) => (
            <CapabilityCard
              key={c.title}
              icon={c.icon}
              title={c.title}
              description={c.description}
              index={i}
            />
          ))}
        </div>
      </Section>

      {/* 4 — PLATFORM PREVIEW */}
      <Section id="preview" className="!py-28 lg:!py-36 border-t border-line bg-surface">
        <SectionHeading
          eyebrow="Platform preview"
          title="A workspace, not a report."
          description="Real surfaces from inside EpiCast — designed to be lived in."
          align="center"
        />

        <div className="mt-16 lg:mt-20">
          <PlatformPreview />
        </div>
      </Section>

      {/* 5 — FINAL CTA */}
      <Section className="!py-28 lg:!py-36">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-ink text-white rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-dots opacity-[0.06] pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative px-8 sm:px-14 lg:px-24 py-20 lg:py-28 text-center">
            <div className="eyebrow text-white/60 mb-5">Get started</div>
            <h2 className="display text-[44px] sm:text-[60px] lg:text-[80px] leading-[1]">
              Move faster.<br />Respond smarter.
            </h2>
            <p className="text-[16px] lg:text-[18px] text-white/65 mt-7 max-w-xl mx-auto leading-relaxed">
              Spin up EpiCast against your existing backend in minutes.
            </p>

            <div className="mt-12">
              <Button
                variant="invert"
                size="xl"
                iconRight={ArrowRight}
                onClick={openGetStarted}
                className="!h-14 !px-8 !text-[15px]"
              >
                {label}
              </Button>
            </div>
          </div>
        </motion.div>
      </Section>
    </>
  );
}
