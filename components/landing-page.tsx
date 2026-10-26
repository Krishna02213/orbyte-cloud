"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { ScrollControls } from "./scroll-controls";
import {
  ArrowDownRight, ArrowRight, Boxes, Check, ChevronDown, CircleGauge,
  CloudCog, Code2, Database, Gauge, Menu, Orbit, Radar, ShieldCheck,
  TerminalSquare, WalletCards, X, Zap,
} from "lucide-react";

const messageCharacterLimit = 2000;

const services = [
  {
    icon: Boxes,
    tag: "RUN",
    title: "Managed Kubernetes",
    text: "Production-grade clusters with upgrades, scaling, backups, policy, and on-call ownership handled end to end.",
    points: ["EKS · GKE · AKS · bare metal", "SLO-led 24/7 operations", "Zero-drama upgrades"],
  },
  {
    icon: Code2,
    tag: "SHIP",
    title: "Platform & CI/CD",
    text: "A paved road from commit to production, built around your stack—not another tool your engineers have to babysit.",
    points: ["GitHub · GitLab · Argo CD", "Developer self-service", "Release safety by default"],
  },
  {
    icon: ShieldCheck,
    tag: "PROTECT",
    title: "Cloud Security",
    text: "Guardrails, identity, secrets, and evidence built into delivery so compliance never becomes a last-minute project.",
    points: ["Security architecture", "Least-privilege access", "Continuous posture checks"],
  },
  {
    icon: ShieldCheck,
    tag: "COMPLY",
    title: "Cloud Compliance",
    text: "Turn SOC 2, HIPAA, and PCI DSS requirements into practical cloud controls, automated evidence, and repeatable operating procedures.",
    points: ["Readiness & gap assessment", "Automated evidence collection", "Remediation roadmap"],
  },
  {
    icon: WalletCards,
    tag: "OPTIMIZE",
    title: "FinOps & Architecture",
    text: "Workloads and spend redesigned together—measurable efficiency without slowing the product roadmap.",
    points: ["Unit-cost visibility", "Rightsizing & commitments", "Resilience reviews"],
  },
];

const scanQuestions = [
  { label: "Deployments", question: "How do releases reach production?", choices: ["Mostly manual", "Scripts and checklists", "Automated pipeline"] },
  { label: "Reliability", question: "When production misbehaves…", choices: ["Users tell us", "We have basic alerts", "SLOs guide response"] },
  { label: "Infrastructure", question: "How reproducible is your cloud?", choices: ["Click-ops", "Partly in code", "Fully declarative"] },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [scan, setScan] = useState<number[]>([0, 0, 0]);
  const [submittedScan, setSubmittedScan] = useState(false);
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");
  const [messageLength, setMessageLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const score = useMemo(() => 31 + scan.reduce((sum, value) => sum + value * 11, 0), [scan]);
  const SelectedIcon = services[activeService].icon;

  function go(id: string) {
    setMenuOpen(false);
    scrollTo(id);
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("sending");
    setFormMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok) throw new Error(result.error || "Request failed");
      setFormState("success");
      setFormMessage(`Request saved. Your reference is ${result.reference}.`);
      formRef.current?.reset();
      setMessageLength(0);
    } catch (error) {
      setFormState("error");
      setFormMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <main className="overflow-hidden">
      <ScrollControls />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071018]/90 text-white backdrop-blur-xl">
        <div className="shell flex h-[72px] items-center justify-between">
          <button onClick={() => go("top")} className="flex items-center gap-3" aria-label="Orbyte Cloud home">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--lime)] text-[#071018]"><Orbit size={21} strokeWidth={2.4} /></span>
            <span className="text-lg font-bold tracking-[-.04em]">ORBYTE<span className="text-[var(--lime)]">/</span>CLOUD</span>
          </button>
          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex" aria-label="Primary navigation">
            <button onClick={() => go("services")} className="hover:text-white">Capabilities</button>
            <button onClick={() => go("compliance")} className="hover:text-white">Compliance</button>
            <button onClick={() => go("approach")} className="hover:text-white">How we work</button>
            <button onClick={() => go("scan")} className="hover:text-white">Readiness scan</button>
            <button onClick={() => go("faq")} className="hover:text-white">FAQ</button>
          </nav>
          <button onClick={() => go("contact")} className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#071018] transition hover:bg-[var(--lime)] md:block">Talk to an architect</button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 md:hidden" aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="shell reveal flex flex-col gap-1 border-t border-white/10 py-4 md:hidden">
            {[
              ["Capabilities", "services"], ["Compliance", "compliance"], ["How we work", "approach"],
              ["Readiness scan", "scan"], ["FAQ", "faq"], ["Talk to an architect", "contact"],
            ].map(([label, id]) => (
              <button key={id} onClick={() => go(id)} className="rounded-xl px-4 py-3 text-left text-white/80 hover:bg-white/10 hover:text-white">{label}</button>
            ))}
          </nav>
        )}
      </header>

      <section id="top" className="gridwash relative min-h-[760px] bg-[#071018] pb-20 pt-36 text-white">
        <div className="absolute -right-32 top-20 h-[440px] w-[440px] rounded-full bg-[#194a61] blur-[100px]" />
        <div className="absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-[#364717] blur-[100px]" />
        <div className="shell relative grid items-center gap-14 lg:grid-cols-[1.12fr_.88fr]">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-white/70">
              <span className="pulse-ring h-2 w-2 rounded-full bg-[var(--lime)]" />Built for teams in motion
            </div>
            <h1 className="display max-w-[780px] text-[clamp(4.3rem,9vw,8.2rem)] font-black uppercase leading-[.78]">
              Cloud systems<br/><span className="text-[var(--lime)]">that stay</span><br/>boring.
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-8 text-white/65">
              We design, automate, secure, and run the infrastructure behind ambitious products—so releases feel routine and incidents become rare.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => go("contact")} className="group flex items-center gap-3 rounded-full bg-[var(--lime)] px-6 py-3.5 font-bold text-[#071018] transition hover:scale-[1.02]">
                Build my cloud plan <ArrowRight className="transition group-hover:translate-x-1" size={19}/>
              </button>
              <button onClick={() => go("scan")} className="flex items-center gap-3 rounded-full border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                Run a 60-sec scan <Radar size={18}/>
              </button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="rounded-[32px] border border-white/15 bg-white/[.07] p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between px-2 py-1 text-xs text-white/45">
                <span>ORBYTE CONTROL PLANE</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--lime)]"/>SYSTEMS NOMINAL</span>
              </div>
              <div className="rounded-[22px] bg-[#0b1721] p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["99.99%", "Availability"], ["4m 12s", "Deploy time"],
                    ["0", "Open incidents"], ["−31%", "Cloud waste"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                      <div className="text-2xl font-bold text-[var(--lime)]">{value}</div>
                      <div className="mt-1 text-xs text-white/45">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 p-4">
                  <div className="mb-5 flex items-center justify-between text-xs text-white/50"><span>RELEASE VELOCITY</span><span>LAST 14 DAYS</span></div>
                  <div className="flex h-28 items-end gap-2">
                    {[34,52,45,72,60,85,66,92,76,96,80,100].map((height, i) => (
                      <span key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-[#235c74] to-[var(--sky)]" style={{height: `${height}%`, opacity: .55 + i * .035}} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[var(--lime)] p-4 text-[#071018]">
                  <Check size={20}/><div><div className="text-sm font-bold">Production deploy completed</div><div className="text-xs opacity-60">All health checks passed · 22 sec ago</div></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white px-4 py-3 text-[#071018] shadow-xl">
              <div className="text-xs text-black/45">ON-CALL RESPONSE</div><div className="mt-1 font-bold">Under 5 minutes ↘</div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-black/10 bg-[var(--lime)] py-3 text-xs font-black uppercase tracking-[.18em]">
        <div className="marquee-track flex w-max gap-10">
          {Array(2).fill(["AWS", "GOOGLE CLOUD", "AZURE", "KUBERNETES", "TERRAFORM", "ARGO CD", "PROMETHEUS", "GRAFANA"]).flat().map((item, i) => (
            <span key={i} className="flex items-center gap-10">{item}<span>✦</span></span>
          ))}
        </div>
      </div>

      <section id="services" className="scroll-mt-20 py-24 md:py-32">
        <div className="shell">
          <div className="grid gap-8 md:grid-cols-[.72fr_1.28fr] md:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">01 / Capabilities</p><h2 className="display mt-4 text-6xl font-black uppercase leading-[.86] md:text-8xl">One team.<br/>Full stack.</h2></div>
            <p className="max-w-xl text-lg leading-8 text-black/60 md:justify-self-end">Strategy is only useful when it survives production. Our senior engineers stay from first diagram through migrations, on-call, and continuous improvement.</p>
          </div>
          <div className="mt-16 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
            <div className="space-y-2">
              {services.map((service, index) => (
                <button key={service.title} onClick={() => setActiveService(index)} className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${activeService === index ? "border-[#071018] bg-[#071018] text-white" : "border-black/10 bg-white/40 hover:bg-white"}`}>
                  <span><span className="mr-3 font-mono text-xs opacity-45">0{index + 1}</span><span className="font-bold">{service.title}</span></span><ArrowDownRight size={18}/>
                </button>
              ))}
            </div>
            <div key={activeService} className="reveal min-h-[410px] rounded-[30px] bg-[#071018] p-8 text-white md:p-11">
              <div className="flex items-start justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--lime)] text-[#071018]"><SelectedIcon size={27}/></span><span className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs text-white/50">{services[activeService].tag}</span></div>
              <h3 className="display mt-14 text-5xl font-black uppercase md:text-6xl">{services[activeService].title}</h3>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">{services[activeService].text}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">{services[activeService].points.map((point) => <div key={point} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"><Check className="mb-3 text-[var(--lime)]" size={17}/>{point}</div>)}</div>
              <button onClick={() => go("contact")} className="mt-8 inline-flex items-center gap-2 font-bold text-[var(--lime)]">Discuss this capability <ArrowRight size={18}/></button>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" className="scroll-mt-20 bg-[#dce5e4] py-24 md:py-32">
        <div className="shell">
          <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">02 / The operating model</p><h2 className="display mt-4 text-6xl font-black uppercase leading-[.88] md:text-8xl">From cloud chaos<br/>to calm control.</h2></div>
          <div className="relative mt-16 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", icon: Radar, title: "Map the system", copy: "A focused audit of architecture, delivery, security, spend, and operational risk. You get a prioritized map—not a 90-page deck." },
              { n: "02", icon: TerminalSquare, title: "Build the runway", copy: "We automate the critical path, migrate in safe increments, and document every decision alongside your team." },
              { n: "03", icon: CircleGauge, title: "Operate & improve", copy: "SLOs, observability, on-call, capacity, and cost reviews keep the platform healthy as the product evolves." },
            ].map((item, index) => (
              <article key={item.n} className={`lift rounded-[28px] border border-black/10 p-8 ${index === 1 ? "bg-[#071018] text-white" : "bg-[var(--paper)]"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-sm opacity-45">PHASE {item.n}</span><item.icon size={25} className={index === 1 ? "text-[var(--lime)]" : ""}/></div>
                <h3 className="display mt-20 text-4xl font-black uppercase">{item.title}</h3>
                <p className={`mt-5 leading-7 ${index === 1 ? "text-white/60" : "text-black/55"}`}>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="scan" className="scroll-mt-20 bg-[#071018] py-24 text-white md:py-32">
        <div className="shell grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/40">03 / Interactive readiness scan</p><h2 className="display mt-4 text-6xl font-black uppercase leading-[.88] md:text-8xl">How calm is<br/>your cloud?</h2><p className="mt-6 max-w-md text-lg leading-8 text-white/55">Three questions. One directional score. No email gate. Use it to spot where platform work can buy back engineering time.</p></div>
          <div className="rounded-[30px] border border-white/12 bg-white/[.05] p-6 md:p-9">
            {!submittedScan ? (
              <>
                <div className="space-y-8">
                  {scanQuestions.map((question, qi) => (
                    <fieldset key={question.label}><legend className="mb-3"><span className="mr-3 font-mono text-xs text-[var(--lime)]">0{qi + 1}</span><span className="font-semibold">{question.question}</span></legend>
                      <div className="grid gap-2 sm:grid-cols-3">{question.choices.map((choice, ci) => <button type="button" key={choice} onClick={() => setScan(scan.map((value, i) => i === qi ? ci : value))} className={`rounded-xl border px-3 py-3 text-sm transition ${scan[qi] === ci ? "border-[var(--lime)] bg-[var(--lime)] text-[#071018]" : "border-white/15 text-white/55 hover:bg-white/10"}`}>{choice}</button>)}</div>
                    </fieldset>
                  ))}
                </div>
                <button onClick={() => setSubmittedScan(true)} className="mt-9 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 font-bold text-[#071018] hover:bg-[var(--lime)]">Calculate readiness <Gauge size={18}/></button>
              </>
            ) : (
              <div className="reveal text-center">
                <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-[12px] border-white/10" style={{background: `conic-gradient(var(--lime) ${score}%, transparent 0)`}}><div className="grid h-32 w-32 place-items-center rounded-full bg-[#0c1821]"><div><div className="text-5xl font-black">{score}</div><div className="text-xs text-white/45">/ 100</div></div></div></div>
                <h3 className="display mt-7 text-4xl font-black uppercase">{score > 70 ? "Strong foundation" : score > 50 ? "Ready to simplify" : "High-leverage fixes ahead"}</h3>
                <p className="mx-auto mt-3 max-w-md text-white/55">Your fastest gains are likely in repeatable delivery, proactive signals, and infrastructure automation.</p>
                <div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={() => go("contact")} className="rounded-full bg-[var(--lime)] px-5 py-3 font-bold text-[#071018]">Get a tailored roadmap</button><button onClick={() => { setSubmittedScan(false); setScan([0,0,0]); }} className="rounded-full border border-white/20 px-5 py-3 font-semibold">Retake</button></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dotwash py-24 md:py-32">
        <div className="shell">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">Built for the real constraints</p><h2 className="display mt-4 text-6xl font-black uppercase md:text-8xl">Outcomes over tools.</h2></div><p className="max-w-md text-black/55">The toolchain changes. The outcomes should not: safer releases, fewer interruptions, visible cost, and a platform engineers trust.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: "Faster flow", text: "Remove queues and manual handoffs from the path to production." },
              { icon: ShieldCheck, title: "Safer change", text: "Make policy, testing, and rollback part of every release." },
              { icon: Database, title: "Clear signals", text: "Observe services in the language of user and business impact." },
              { icon: CloudCog, title: "Lower toil", text: "Automate recurring operations so people solve new problems." },
            ].map((item) => <article key={item.title} className="lift rounded-[24px] border border-black/10 bg-[var(--paper)] p-6"><item.icon size={25}/><h3 className="mt-16 text-xl font-bold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-black/55">{item.text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="compliance" className="scroll-mt-20 bg-[#dce5e4] py-24 md:py-32">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">04 / Cloud compliance</p>
              <h2 className="display mt-4 text-6xl font-black uppercase leading-[.86] md:text-8xl">Controls that<br/>survive audits.</h2>
            </div>
            <div className="max-w-xl lg:justify-self-end">
              <p className="text-lg leading-8 text-black/60">We help teams translate compliance requirements into secure cloud architecture, working controls, evidence pipelines, and documentation your people can actually maintain.</p>
              <button onClick={() => go("contact")} className="mt-6 inline-flex items-center gap-2 font-bold">Plan a compliance readiness review <ArrowRight size={18}/></button>
            </div>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { code: "SOC 2", title: "Trust Services readiness", text: "Map security, availability, confidentiality, and operational controls to your cloud and delivery workflows.", points: ["Control gap assessment", "Evidence automation", "Audit-ready operating procedures"] },
              { code: "HIPAA", title: "Protected health data", text: "Design cloud environments and engineering practices that support HIPAA safeguards for PHI and sensitive workloads.", points: ["PHI data-flow mapping", "Access and audit controls", "Backup and incident readiness"] },
              { code: "PCI DSS", title: "Payment environments", text: "Reduce cardholder-data exposure and build defensible controls around systems that store, process, or transmit payment data.", points: ["Scope reduction", "Network and identity controls", "Logging and vulnerability workflows"] },
            ].map((framework) => (
              <article key={framework.code} className="lift rounded-[28px] border border-black/10 bg-[var(--paper)] p-7">
                <span className="inline-block rounded-full bg-[#071018] px-3 py-1.5 font-mono text-xs font-bold text-[var(--lime)]">{framework.code}</span>
                <h3 className="display mt-10 text-4xl font-black uppercase">{framework.title}</h3>
                <p className="mt-4 leading-7 text-black/55">{framework.text}</p>
                <ul className="mt-7 space-y-3 text-sm font-semibold">
                  {framework.points.map((point) => <li key={point} className="flex items-center gap-3"><Check size={16}/>{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-5 text-black/45">Orbyte Cloud provides technical readiness and implementation support. Certification, legal interpretation, and formal audit opinions remain the responsibility of qualified auditors and legal advisers.</p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-black/10 py-24 md:py-32">
        <div className="shell grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">05 / Practical questions</p><h2 className="display mt-4 text-6xl font-black uppercase md:text-8xl">Before<br/>we talk.</h2></div>
          <div>
            {[
              ["Do you only work with Kubernetes?", "No. We use Kubernetes when its operating model earns its complexity. We also design serverless, container, VM, and hybrid platforms around the workload and team."],
              ["Can you improve an existing setup?", "Yes. Most engagements begin in a live environment. We map risk, protect critical paths, then improve it incrementally without a disruptive rewrite."],
              ["Is this consulting or managed support?", "Both. Choose a focused audit, a delivery project, or an ongoing platform/SRE partnership. The right starting point depends on your internal capacity."],
              ["Can you certify us for SOC 2, HIPAA, or PCI DSS?", "We prepare the technical environment: gap assessment, cloud controls, remediation, evidence automation, and operating procedures. Formal certification or audit opinions are completed by your qualified auditor or assessor."],
              ["Which clouds do you support?", "AWS, Google Cloud, Azure, and hybrid environments. We keep infrastructure portable where it creates real leverage—not as an abstract goal."],
            ].map(([question, answer]) => <details key={question} className="group border-b border-black/15 py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-xl font-bold">{question}<ChevronDown className="shrink-0 transition group-open:rotate-180" size={21}/></summary><p className="max-w-2xl pt-4 leading-7 text-black/55">{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 bg-[var(--lime)] py-20 md:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[.82fr_1.18fr]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/50">06 / Start a conversation</p><h2 className="display mt-4 text-6xl font-black uppercase leading-[.86] md:text-8xl">Bring us the<br/>messy part.</h2><p className="mt-6 max-w-md text-lg leading-8 text-black/60">Tell us what is slowing the team down. We’ll reply with a useful first perspective and a suggested next step.</p><div className="mt-10 space-y-3 text-sm font-semibold"><div className="flex items-center gap-3"><Check size={18}/> No-obligation architecture review</div><div className="flex items-center gap-3"><Check size={18}/> Senior engineer from the first call</div><div className="flex items-center gap-3"><Check size={18}/> Your details saved securely for follow-up</div></div></div>
          <form ref={formRef} onSubmit={submitLead} className="rounded-[30px] bg-[#071018] p-6 text-white shadow-2xl md:p-9">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-white/65">Name *<input required minLength={2} name="name" className="mt-2 w-full rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-[var(--lime)]" placeholder="Your name"/></label>
              <label className="text-sm text-white/65">Work email *<input required type="email" name="email" className="mt-2 w-full rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-[var(--lime)]" placeholder="you@company.com"/></label>
              <label className="text-sm text-white/65">Company<input name="company" className="mt-2 w-full rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-[var(--lime)]" placeholder="Company name"/></label>
              <label className="text-sm text-white/65">Engineering team<input name="teamSize" className="mt-2 w-full rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-[var(--lime)]" placeholder="e.g. 12 people"/></label>
            </div>
            <label className="mt-5 block text-sm text-white/65">What can we help with? *<select required name="service" defaultValue="" className="mt-2 w-full rounded-xl border border-white/15 bg-[#111d25] px-4 py-3 text-white outline-none focus:border-[var(--lime)]"><option value="" disabled>Select a capability</option>{services.map((service) => <option key={service.title}>{service.title}</option>)}<option>Cloud migration</option><option>Not sure yet</option></select></label>
            <label className="mt-5 block text-sm text-white/65">
              What is happening?
              <textarea
                name="message"
                rows={4}
                maxLength={messageCharacterLimit}
                onChange={(event) => setMessageLength(event.currentTarget.value.length)}
                aria-describedby="contact-message-count"
                className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white outline-none focus:border-[var(--lime)]"
                placeholder="A little context helps us bring the right ideas…"
              />
            </label>
            <p id="contact-message-count" className="mt-2 text-right text-xs text-white/50">
              {messageLength} / {messageCharacterLimit} characters
            </p>
            <button disabled={formState === "sending"} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lime)] py-4 font-bold text-[#071018] transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{formState === "sending" ? "Saving request…" : "Request an architecture review"} <ArrowRight size={18}/></button>
            {formMessage && <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${formState === "success" ? "bg-[var(--lime)]/15 text-[var(--lime)]" : "bg-red-500/15 text-red-200"}`}>{formMessage}</p>}
            <p className="mt-4 text-center text-xs text-white/35">By submitting, you agree that we may contact you about this request.</p>
          </form>
        </div>
      </section>

      <footer className="bg-[#071018] py-10 text-white">
        <div className="shell flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div><button onClick={() => go("top")} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--lime)] text-[#071018]"><Orbit size={21}/></span><span className="text-lg font-bold">ORBYTE/CLOUD</span></button><p className="mt-4 max-w-sm text-sm leading-6 text-white/40">Cloud, platform engineering, security, and reliability for teams that want infrastructure to become their quiet advantage.</p></div>
          <div className="flex flex-wrap gap-6 text-sm text-white/55">{[["Capabilities","services"],["Compliance","compliance"],["Process","approach"],["Readiness scan","scan"],["FAQ","faq"],["Contact","contact"]].map(([label,id]) => <button key={id} onClick={() => go(id)} className="hover:text-white">{label}</button>)}</div>
          <div className="text-xs text-white/30">© 2026 Orbyte Cloud<br/>Built for resilient growth.</div>
        </div>
      </footer>
    </main>
  );
}
