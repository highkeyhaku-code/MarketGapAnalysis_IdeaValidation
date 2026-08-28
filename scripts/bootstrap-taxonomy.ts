import { supabaseAdmin } from "../lib/supabaseClient";

interface L2CategoryDef {
  canonical_name: string;
  description: string;
  status: "active" | "stagnant";
  sourceKeys: string[];
}

interface L1CategoryDef {
  canonical_name: string;
  description: string;
  subcategories: L2CategoryDef[];
}

const TAXONOMY: L1CategoryDef[] = [
  {
    canonical_name: "AI & Machine Learning",
    description: "Generative AI, Large Language Models, Multi-agent systems, and Computer Vision infrastructure.",
    subcategories: [
      { canonical_name: "LLM Orchestration & Prompt Routing", description: "Multi-model orchestration, fallback chains, and context engineering.", status: "active", sourceKeys: ["llm-orchestration", "prompt-engineering"] },
      { canonical_name: "Autonomous Agent Platforms", description: "Multi-agent task automation, agentic workflows, and reasoning trees.", status: "active", sourceKeys: ["ai-agents", "autonomous-agents"] },
      { canonical_name: "AI Video Generation & Synthesis", description: "Text-to-video, avatar synthesis, and generative video editing.", status: "active", sourceKeys: ["ai-video", "generative-video"] },
      { canonical_name: "Vector Databases & Semantic Search", description: "High-dimensional embeddings storage and sub-millisecond similarity search.", status: "active", sourceKeys: ["vector-database", "semantic-search"] },
      { canonical_name: "Synthetic Data Generation", description: "Privacy-compliant mock data, training data synthesis, and testing datasets.", status: "active", sourceKeys: ["synthetic-data", "data-simulation"] },
      { canonical_name: "AI Voice Cloning & Audio Synthesis", description: "Ultra-low-latency TTS, real-time voice conversion, and speech AI.", status: "active", sourceKeys: ["ai-voice", "audio-synthesis"] },
      { canonical_name: "Local LLM Runtimes & Edge Inference", description: "On-device inference, WebGPU model execution, and small language models.", status: "active", sourceKeys: ["local-llm", "edge-ai"] },
      { canonical_name: "AI Model Evaluation & Benchmarking", description: "Automated red-teaming, hallucination detection, and benchmark leaderboards.", status: "active", sourceKeys: ["model-eval", "llm-testing"] },
      { canonical_name: "Document Intelligence & OCR AI", description: "Complex invoice, receipt, and contract semantic extraction.", status: "stagnant", sourceKeys: ["document-ai", "ocr"] },
      { canonical_name: "AI Presentation & Slide Builders", description: "Automated deck generation, visual storytelling, and slide design.", status: "stagnant", sourceKeys: ["ai-presentation", "deck-builder"] },
      { canonical_name: "AI Coding Assistants & Copilots", description: "IDE code completion, refactoring engines, and autonomous PR review bots.", status: "active", sourceKeys: ["code-assistant", "ai-copilot"] },
      { canonical_name: "AI Image Generation & Style Transfer", description: "Stable diffusion interfaces, latent upscalers, and prompt styling engines.", status: "stagnant", sourceKeys: ["ai-image", "style-transfer"] },
      { canonical_name: "AI Meeting Summarizers & Transcribers", description: "Automated audio capture, action item extraction, and CRM sync.", status: "stagnant", sourceKeys: ["meeting-summarizer", "transcription-ai"] },
      { canonical_name: "Fine-Tuning & Model Distillation", description: "LoRA, QLoRA fine-tuning pipelines and quantized model distillation.", status: "active", sourceKeys: ["fine-tuning", "model-distillation"] },
      { canonical_name: "Computer Vision & Visual QA", description: "Real-time object detection, zero-shot segmentation, and industrial visual inspection.", status: "active", sourceKeys: ["computer-vision", "visual-qa"] },
      { canonical_name: "AI Avatar & Virtual Influencers", description: "Photorealistic 3D avatars, digital twins, and dynamic motion capture.", status: "active", sourceKeys: ["ai-avatars", "virtual-twins"] },
      { canonical_name: "Multimodal Search & Retrieval", description: "Cross-modal search combining text, audio, image, and video embeddings.", status: "active", sourceKeys: ["multimodal-search", "cross-modal-rag"] },
      { canonical_name: "AI Safety & Guardrail Frameworks", description: "Prompt injection defense, toxicity filtering, and alignment telemetry.", status: "active", sourceKeys: ["ai-safety", "guardrails"] },
      { canonical_name: "Automated Knowledge Graph Construction", description: "Unstructured text to entity-relation knowledge graph distillation.", status: "active", sourceKeys: ["knowledge-graphs", "graph-rag"] },
      { canonical_name: "AI Translation & Localization Hubs", description: "Context-aware multilingual neural translation and localization pipelines.", status: "stagnant", sourceKeys: ["ai-translation", "localization"] },
      { canonical_name: "Conversational NPC & Gaming AI", description: "Autonomous behavioral AI for game characters and interactive roleplay.", status: "active", sourceKeys: ["gaming-ai", "npc-intelligence"] },
      { canonical_name: "Enterprise RAG Platforms", description: "Turnkey enterprise search over Google Drive, Notion, Slack, and Confluence.", status: "active", sourceKeys: ["enterprise-rag", "internal-search"] },
      { canonical_name: "AI Form & Survey Analyzers", description: "Conversational intake forms, dynamic follow-ups, and sentiment analytics.", status: "active", sourceKeys: ["ai-forms", "survey-ai"] },
      { canonical_name: "Personal AI Memory & Second Brain", description: "Continuous background audio/screen logging with associative recall.", status: "active", sourceKeys: ["second-brain", "personal-ai"] },
      { canonical_name: "AI Content Repurposing Engines", description: "Transforming long-form video/podcasts into short-form viral clips and posts.", status: "stagnant", sourceKeys: ["content-repurposing", "clip-generator"] },
    ],
  },
  {
    canonical_name: "Developer Tools & Infrastructure",
    description: "APIs, cloud architecture, CI/CD, observability, and developer experience platforms.",
    subcategories: [
      { canonical_name: "API Gateways & Rate Limiting", description: "Distributed API management, token bucket rate limiters, and edge auth.", status: "active", sourceKeys: ["api-gateway", "rate-limiting"] },
      { canonical_name: "Distributed Tracing & OpenTelemetry", description: "Trace collection, span analysis, and bottleneck detection across microservices.", status: "active", sourceKeys: ["distributed-tracing", "opentelemetry"] },
      { canonical_name: "Database Branching & Migration Hubs", description: "Git-like schema migrations, preview databases, and instant rollbacks.", status: "active", sourceKeys: ["database-branching", "schema-migrations"] },
      { canonical_name: "Serverless Background Jobs & Queues", description: "Event-driven workflow engines, durable execution, and cron queues.", status: "active", sourceKeys: ["background-jobs", "workflow-engine"] },
      { canonical_name: "Feature Flags & Progressive Delivery", description: "Dynamic feature toggling, percentage rollouts, and multivariate testing.", status: "active", sourceKeys: ["feature-flags", "progressive-delivery"] },
      { canonical_name: "Internal Tool Builders & Retool Alternatives", description: "Low-code admin panels, database CRUD interfaces, and custom operational apps.", status: "active", sourceKeys: ["internal-tools", "low-code-admin"] },
      { canonical_name: "Headless CMS & Content APIs", description: "Structured content management, visual editing, and multi-channel GraphQL APIs.", status: "stagnant", sourceKeys: ["headless-cms", "content-api"] },
      { canonical_name: "Edge Compute & Serverless Runtimes", description: "Globally distributed V8 isolates, WebAssembly runtimes, and low latency workers.", status: "active", sourceKeys: ["edge-compute", "serverless-runtime"] },
      { canonical_name: "Continuous Integration & Ephemeral Environments", description: "PR-based preview environments, fast test runners, and caching pipelines.", status: "active", sourceKeys: ["ci-cd", "preview-environments"] },
      { canonical_name: "Error Monitoring & Crash Reporting", description: "Real-time exception grouping, sourcemap decoding, and session replay.", status: "stagnant", sourceKeys: ["error-monitoring", "crash-reporting"] },
      { canonical_name: "Secrets Management & Vaults", description: "Zero-trust credential storage, environment variable sync, and rotation.", status: "active", sourceKeys: ["secrets-management", "env-vault"] },
      { canonical_name: "Log Aggregation & Search Engines", description: "Petabyte-scale log ingestion, structured querying, and retention policies.", status: "stagnant", sourceKeys: ["log-aggregation", "log-search"] },
      { canonical_name: "API Documentation & SDK Generators", description: "OpenAPI to multi-language SDK compilation, interactive API playgrounds.", status: "active", sourceKeys: ["sdk-generator", "api-docs"] },
      { canonical_name: "Webhook Management & Relay Hubs", description: "Reliable webhook delivery, automatic retries, verification, and inspection.", status: "active", sourceKeys: ["webhook-relay", "webhook-management"] },
      { canonical_name: "WebAssembly & Browser Runtimes", description: "In-browser native execution, virtualization, and client-side compilers.", status: "active", sourceKeys: ["wasm", "browser-runtime"] },
      { canonical_name: "Cloud Cost Optimization & FinOps", description: "AWS/GCP anomaly detection, idle resource termination, and reservation managers.", status: "active", sourceKeys: ["cloud-finops", "aws-cost"] },
      { canonical_name: "GraphQL Federation & Subgraphs", description: "Distributed GraphQL schema stitching, router gateways, and query planning.", status: "active", sourceKeys: ["graphql-federation", "subgraphs"] },
      { canonical_name: "Zero-Trust Service Mesh & mTLS", description: "Automatic mutual TLS, service discovery, and traffic routing proxies.", status: "active", sourceKeys: ["service-mesh", "zero-trust-proxy"] },
      { canonical_name: "Synthetic Load Testing & Chaos Engineering", description: "Distributed load simulation, fault injection, and resiliency testing.", status: "active", sourceKeys: ["load-testing", "chaos-engineering"] },
      { canonical_name: "Micro-Frontend Orchestration", description: "Module federation, isolated component deployments, and app shell routing.", status: "stagnant", sourceKeys: ["micro-frontends", "module-federation"] },
      { canonical_name: "Mobile App Distribution & OTA Updates", description: "Over-the-air React Native/Flutter patch delivery and beta tester management.", status: "active", sourceKeys: ["ota-updates", "mobile-distribution"] },
      { canonical_name: "Static Site Hosting & Global Edge CDNs", description: "Jamstack deployments, edge middleware, and atomic asset publishing.", status: "stagnant", sourceKeys: ["static-hosting", "edge-cdn"] },
      { canonical_name: "Code Search & Architecture Graphing", description: "Cross-repository AST indexation, dependency graph visualization.", status: "active", sourceKeys: ["code-search", "architecture-graph"] },
      { canonical_name: "Container Registries & Image Scanning", description: "OCI compliant container registries with built-in CVE vulnerability scans.", status: "active", sourceKeys: ["container-registry", "image-scanner"] },
      { canonical_name: "Embedded Analytics & Dashboard SDKs", description: "Pre-built visualization widgets, multitenant query sandboxing for SaaS.", status: "active", sourceKeys: ["embedded-analytics", "chart-sdk"] },
    ],
  },
  {
    canonical_name: "Sales, CRM & Revenue",
    description: "Pipeline management, lead intelligence, outbound engagement, and revenue operations.",
    subcategories: [
      { canonical_name: "B2B Sales CRM & Lead Intelligence", description: "Account management, pipeline tracking, and automated contact enrichment.", status: "active", sourceKeys: ["crm", "lead-intelligence"] },
      { canonical_name: "Sales Engagement & Multi-Channel Outbound", description: "Cold email sequencing, LinkedIn touchpoints, and deliverability warmups.", status: "stagnant", sourceKeys: ["sales-engagement", "cold-email"] },
      { canonical_name: "AI BDR & Autonomous Outbound Agents", description: "Autonomous lead research, personalized draft writing, and meeting booking.", status: "active", sourceKeys: ["ai-bdr", "outbound-agent"] },
      { canonical_name: "Revenue Intelligence & Deal Forecasting", description: "Pipeline health scoring, conversational risk flags, and quarterly forecasts.", status: "active", sourceKeys: ["revenue-intelligence", "forecasting"] },
      { canonical_name: "Configure, Price, Quote (CPQ) Platforms", description: "Complex pricing matrices, discount approvals, and dynamic contract generation.", status: "active", sourceKeys: ["cpq", "quote-management"] },
      { canonical_name: "Voice AI & Call Transcription for Sales", description: "Real-time call objection guidance, speaker diarization, and CRM logging.", status: "active", sourceKeys: ["sales-voice-ai", "call-transcription"] },
      { canonical_name: "Lead Scoring & Intent Data Platforms", description: "Website visitor deanonymization, 3rd-party intent triggers, and lead grading.", status: "active", sourceKeys: ["intent-data", "lead-scoring"] },
      { canonical_name: "Partner & Channel Relationship Mgmt (PRM)", description: "Affiliate deal registration, co-selling workflows, and partner tier commissions.", status: "active", sourceKeys: ["prm", "partner-management"] },
      { canonical_name: "Interactive Product Demos & Tour Builders", description: "Sandbox demo creation, buyer engagement tracking, and clickable tour embeds.", status: "active", sourceKeys: ["product-demos", "tour-builder"] },
      { canonical_name: "Sales Enablement & Battlecard Hubs", description: "Competitor comparison matrices, objection playbooks, and collateral indexing.", status: "stagnant", sourceKeys: ["sales-enablement", "battlecards"] },
      { canonical_name: "Commission Tracking & Sales Compensation", description: "Quota tier calculations, commission dispute workflows, and payout sync.", status: "active", sourceKeys: ["commission-tracking", "sales-comp"] },
      { canonical_name: "Customer Onboarding & Mutual Action Plans", description: "Collaborative buyer onboarding checklists, milestones, and timeline tracking.", status: "active", sourceKeys: ["mutual-action-plans", "client-onboarding"] },
      { canonical_name: "Account-Based Marketing (ABM) Orchestration", description: "Target account ad display, dynamic website personalization, and buying committee maps.", status: "active", sourceKeys: ["abm", "account-based-marketing"] },
      { canonical_name: "Contract Lifecycle Management (CLM)", description: "Redlining automation, legal clause libraries, and electronic signature workflows.", status: "stagnant", sourceKeys: ["clm", "contract-management"] },
      { canonical_name: "Digital Sales Rooms & Buyer Portals", description: "Shared buyer landing pages with custom proposals, videos, and security docs.", status: "active", sourceKeys: ["digital-sales-room", "buyer-portal"] },
      { canonical_name: "Referral & Word-of-Mouth Engines", description: "Incentivized peer recommendations, tracking links, and payout gateways.", status: "stagnant", sourceKeys: ["referral-program", "word-of-mouth"] },
      { canonical_name: "Wholesale & B2B Ecommerce Portals", description: "Catalog ordering, net-30 invoicing, and multi-tier wholesale pricing for distributors.", status: "active", sourceKeys: ["b2b-ecommerce", "wholesale-portal"] },
      { canonical_name: "Cold Calling Autodialers & Power Dialers", description: "Parallel multi-line dialing, voicemail drop, and compliance regulation filters.", status: "stagnant", sourceKeys: ["power-dialer", "cold-calling"] },
      { canonical_name: "Sales Roleplay & AI Pitch Coaching", description: "Simulated buyer avatars for pitch practice, objection handling feedback.", status: "active", sourceKeys: ["sales-coaching", "pitch-training"] },
      { canonical_name: "Contact Data Verification & Scrubbing", description: "MX record verification, bounce rate prevention, and phone validation APIs.", status: "stagnant", sourceKeys: ["email-verification", "data-scrubbing"] },
      { canonical_name: "Territory Management & Lead Routing", description: "Round-robin assignment, geographic boundary rules, and SLA tracking.", status: "active", sourceKeys: ["lead-routing", "territory-mgmt"] },
      { canonical_name: "Gift & Swag Automation for Prospecting", description: "Personalized direct mail sending, digital gift cards, and CRM trigger delivery.", status: "stagnant", sourceKeys: ["swag-automation", "direct-mail"] },
      { canonical_name: "Executive Network & Warm Intro Finders", description: "Social graph analysis, connection strength scoring, and intro requests.", status: "active", sourceKeys: ["warm-intros", "executive-network"] },
      { canonical_name: "Event Lead Capture & Badge Scanners", description: "Conference badge OCR, booth visitor survey sync, and instant follow-up triggers.", status: "stagnant", sourceKeys: ["event-leads", "badge-scanner"] },
      { canonical_name: "Customer Reference & Case Study Hubs", description: "Peer review libraries, verified customer advocate nomination, and quote approvals.", status: "active", sourceKeys: ["customer-advocacy", "case-studies"] },
    ],
  },
  {
    canonical_name: "Marketing & Growth",
    description: "Acquisition, SEO, content marketing, attribution, and customer lifecycle automation.",
    subcategories: [
      { canonical_name: "Product-Led Growth (PLG) & In-App Tours", description: "Onboarding tooltips, user activation tracking, and feature discovery modals.", status: "active", sourceKeys: ["plg", "user-onboarding"] },
      { canonical_name: "Programmatic SEO & Content Matrix Gen", description: "Database-driven landing page publishing, long-tail keyword cluster engines.", status: "active", sourceKeys: ["programmatic-seo", "seo-matrix"] },
      { canonical_name: "Multi-Touch Attribution Analytics", description: "Markov chain attribution, first/last/linear touch models, and ad spend ROI.", status: "active", sourceKeys: ["attribution", "marketing-analytics"] },
      { canonical_name: "Creator & Influencer CRM Platforms", description: "Discovery filters, contract tracking, affiliate coupon generation, and ROI metrics.", status: "active", sourceKeys: ["influencer-marketing", "creator-crm"] },
      { canonical_name: "Marketing Automation & Lifecycle Email", description: "Event-based behavioral trigger emails, drip campaigns, and churn prevention flows.", status: "stagnant", sourceKeys: ["marketing-automation", "email-drip"] },
      { canonical_name: "Affiliate & Referral Tracking Networks", description: "Cookie/cookieless affiliate tracking, automated payouts, and fraud detection.", status: "active", sourceKeys: ["affiliate-network", "referral-tracking"] },
      { canonical_name: "Social Media Scheduling & Cross-Posting", description: "Multi-network queueing, visual grid planners, and viral analytics.", status: "stagnant", sourceKeys: ["social-scheduling", "cross-posting"] },
      { canonical_name: "A/B Testing & Conversion Rate Optimization", description: "Visual split test editors, Bayesian statistical engines, and heatmaps.", status: "stagnant", sourceKeys: ["ab-testing", "cro"] },
      { canonical_name: "Podcast Hosting & Dynamic Ad Insertion", description: "RSS distribution, listener analytics, and geo-targeted audio ad stitching.", status: "active", sourceKeys: ["podcast-hosting", "dynamic-ads"] },
      { canonical_name: "Ad Creative AI Generation & Variation Test", description: "Automated banner resizing, multi-copy variation rendering, and CTR predictions.", status: "active", sourceKeys: ["ad-creative-ai", "banner-gen"] },
      { canonical_name: "SMS & WhatsApp Marketing Automation", description: "Two-way conversational messaging, broadcast promos, and cart abandonment alerts.", status: "active", sourceKeys: ["sms-marketing", "whatsapp-business"] },
      { canonical_name: "Community Engagement & Gamification", description: "Leaderboards, badge incentives, reward points, and Discord/Slack integrations.", status: "active", sourceKeys: ["gamification", "community-growth"] },
      { canonical_name: "SERP Rank Tracking & Backlink Monitors", description: "Daily keyword position tracking, lost backlink alerts, and competitor gap audits.", status: "stagnant", sourceKeys: ["rank-tracker", "backlink-monitor"] },
      { canonical_name: "Landing Page Builders & Fast Web Host", description: "No-code drag-and-drop page creation, mobile-responsive templates, CDN hosting.", status: "stagnant", sourceKeys: ["landing-page-builder", "no-code-web"] },
      { canonical_name: "User Feedback & In-App Micro Surveys", description: "NPS slide-ins, CSAT rating widgets, and feature request upvoting boards.", status: "stagnant", sourceKeys: ["nps-surveys", "feedback-widgets"] },
      { canonical_name: "Press Release & Media Outreach Hubs", description: "Journalist directory search, press release syndication, and media mention monitoring.", status: "stagnant", sourceKeys: ["pr-outreach", "media-distribution"] },
      { canonical_name: "Webinar & Virtual Event Platforms", description: "Live streaming with polls, automated replay funnels, and breakout networking.", status: "stagnant", sourceKeys: ["webinars", "virtual-events"] },
      { canonical_name: "Social Listening & Brand Sentiment AI", description: "Keyword monitoring across Twitter/Reddit/TikTok with sentiment classification.", status: "active", sourceKeys: ["social-listening", "brand-monitoring"] },
      { canonical_name: "Interactive Quizzes & Calculator Funnels", description: "Lead generation assessments, custom ROI calculators, and dynamic outcomes.", status: "active", sourceKeys: ["quiz-funnels", "roi-calculators"] },
      { canonical_name: "Dark Social & Word-of-Mouth Tracking", description: "Self-reported attribution modals, podcast promo code matching, and Slack shares.", status: "active", sourceKeys: ["dark-social", "self-reported-attribution"] },
      { canonical_name: "Ad Fraud Detection & Click Prevention", description: "Bot click blocking, proxy identification, and PPC campaign budget defense.", status: "active", sourceKeys: ["ad-fraud", "click-fraud"] },
      { canonical_name: "Newsletter Publishing & Monitization Hubs", description: "Paid subscriber paywalls, recommendation networks, and email deliverability.", status: "active", sourceKeys: ["newsletter-platform", "paid-newsletter"] },
      { canonical_name: "Brand Asset & Media Management (DAM)", description: "Centralized logo, font, video raw footage storage with metadata tagging.", status: "stagnant", sourceKeys: ["dam", "digital-asset-mgmt"] },
      { canonical_name: "SEO Internal Linking & Topic Cluster AI", description: "Automated related post injection, orphan page audits, and anchor text optimizer.", status: "active", sourceKeys: ["internal-linking", "topic-clusters"] },
      { canonical_name: "QR Code Marketing & Dynamic Tracking", description: "Branded vector QR codes, scan location telemetry, and redirect destinations.", status: "stagnant", sourceKeys: ["qr-marketing", "dynamic-qr"] },
    ],
  },
  {
    canonical_name: "Collaboration & Productivity",
    description: "Team workspaces, asynchronous communication, project management, and knowledge systems.",
    subcategories: [
      { canonical_name: "Knowledge Base & Team Wikis", description: "Collaborative markdown editing, verified doc badges, and permission hierarchies.", status: "stagnant", sourceKeys: ["team-wiki", "knowledge-base"] },
      { canonical_name: "Asynchronous Video & Screen Recording", description: "One-click screen capture, transcript chaptering, and video comments.", status: "stagnant", sourceKeys: ["screen-recording", "async-video"] },
      { canonical_name: "Virtual Office & Audio Proximity Spaces", description: "2D spatial avatar workplaces, persistent team voice rooms, and co-working tabs.", status: "stagnant", sourceKeys: ["virtual-office", "spatial-audio"] },
      { canonical_name: "Kanban, Sprints & Agile Task Management", description: "Issue tracking, cycle velocity charts, and backlog prioritization boards.", status: "stagnant", sourceKeys: ["kanban", "task-management"] },
      { canonical_name: "Visual Whiteboards & Infinite Canvases", description: "Real-time brainstorming, sticky note clusters, flowcharting, and cursor chat.", status: "stagnant", sourceKeys: ["whiteboard", "infinite-canvas"] },
      { canonical_name: "Personal Productivity & Day Planners", description: "Time-blocking calendars, task consolidation, and focus timers.", status: "active", sourceKeys: ["day-planner", "time-blocking"] },
      { canonical_name: "Meeting Agenda & One-on-One Trackers", description: "Collaborative meeting notes, recurring 1:1 goals, and action item trackers.", status: "active", sourceKeys: ["meeting-agendas", "one-on-one"] },
      { canonical_name: "Automated Workflow & Zapier Alternatives", description: "Visual node-based integration builders, webhook transformations, and triggers.", status: "active", sourceKeys: ["workflow-automation", "integration-builder"] },
      { canonical_name: "Collaborative Spreadsheet & Database Apps", description: "Relational grid interfaces, formulas, linked records, and view permissions.", status: "active", sourceKeys: ["collaborative-sheet", "no-code-database"] },
      { canonical_name: "Team Password & Vault Sharing", description: "Zero-knowledge credential sharing, OTP generation, and access revocation.", status: "stagnant", sourceKeys: ["password-manager", "team-vault"] },
      { canonical_name: "Bookmarks & Visual Resource Curators", description: "Web clipper extensions, tag hierarchies, full-text cached search.", status: "stagnant", sourceKeys: ["bookmark-manager", "web-clipper"] },
      { canonical_name: "AI Summary Dashboards for Executive Catchup", description: "Aggregating unread Slack, email, Jira notifications into 1-minute digests.", status: "active", sourceKeys: ["executive-summary", "catchup-digest"] },
      { canonical_name: "Digital Signature & Document Approvals", description: "Audit-trail signing workflows, document templates, and recipient routing.", status: "stagnant", sourceKeys: ["e-signature", "document-approval"] },
      { canonical_name: "Time Tracking & Timesheet Billing", description: "Background application activity logging, client project billable hours.", status: "stagnant", sourceKeys: ["time-tracking", "timesheet"] },
      { canonical_name: "Mind Mapping & Conceptual Outliners", description: "Hierarchical bullet-point nesting, node connections, and graph views.", status: "stagnant", sourceKeys: ["mind-mapping", "outliner"] },
      { canonical_name: "AI Email Client & Smart Inbox Triaging", description: "Priority filtering, auto-drafted replies, split inbox workflows.", status: "active", sourceKeys: ["ai-email", "smart-inbox"] },
      { canonical_name: "Standup & Asynchronous Check-in Bots", description: "Automated Slack/Teams daily prompts, blocker rollups, and async digests.", status: "stagnant", sourceKeys: ["async-standup", "check-in-bot"] },
      { canonical_name: "Calendar Scheduling & Booking Links", description: "Round-robin team availability, collective booking, and timezone conversions.", status: "stagnant", sourceKeys: ["scheduling-link", "calendar-booking"] },
      { canonical_name: "Context-Aware Dictation & Speech Notes", description: "Fast voice-to-text with jargon correction, automated punctuation, and cleanup.", status: "active", sourceKeys: ["ai-dictation", "voice-notes"] },
      { canonical_name: "Decentralized Team Decision & Voting Logs", description: "RFC processes, anonymous consensus polls, and rationale archiving.", status: "active", sourceKeys: ["team-decisions", "rfc-tracking"] },
      { canonical_name: "Focus Music & Neuro-Acoustic Workspaces", description: "Binaural beats, adaptive procedural soundscapes for flow state focus.", status: "stagnant", sourceKeys: ["focus-music", "soundscapes"] },
      { canonical_name: "Remote Team Kudos & Peer Recognition", description: "Slack tacos/points, reward redemption store, and company anniversary alerts.", status: "stagnant", sourceKeys: ["peer-recognition", "kudos"] },
      { canonical_name: "Diagram as Code & Architecture Visualizers", description: "Mermaid/PlantUML editors, automated cloud topology rendering from Terraform.", status: "active", sourceKeys: ["diagram-as-code", "cloud-visualizer"] },
      { canonical_name: "Form & Document Workflow Processors", description: "Multi-step approval chains, conditional routing, and automated PDF fills.", status: "active", sourceKeys: ["approval-workflows", "form-routing"] },
      { canonical_name: "Local-First Markdown Note Synchronizers", description: "CRDT-based offline first notes with end-to-end encrypted peer sync.", status: "active", sourceKeys: ["local-first", "crdt-notes"] },
    ],
  },
  {
    canonical_name: "Fintech, Billing & Operations",
    description: "Subscription billing, spend management, cap table, tax compliance, and payroll.",
    subcategories: [
      { canonical_name: "Usage-Based Metering & Billing Engines", description: "High-throughput event ingestion, tier overage calculation, Stripe sync.", status: "active", sourceKeys: ["usage-based-billing", "metering"] },
      { canonical_name: "Corporate Cards & Spend Management", description: "Virtual card issuance, receipt OCR match, spending limits, and ERP sync.", status: "active", sourceKeys: ["spend-management", "corporate-cards"] },
      { canonical_name: "Cap Table & Equity Management", description: "Stock option vesting schedules, 409A valuation integration, investor share logs.", status: "stagnant", sourceKeys: ["cap-table", "equity-management"] },
      { canonical_name: "Global Payroll & Employer of Record (EOR)", description: "Multi-country contractor payouts, tax withholding, and local compliance.", status: "active", sourceKeys: ["global-payroll", "eor"] },
      { canonical_name: "Revenue Recognition & ASC 606 Compliance", description: "Automated deferred revenue schedules, multi-currency journal entries.", status: "active", sourceKeys: ["revenue-recognition", "asc-606"] },
      { canonical_name: "SaaS Subscription Analytics & Churn Metrics", description: "MRR/ARR cohorts, net revenue retention (NRR), and LTV/CAC calculations.", status: "stagnant", sourceKeys: ["subscription-analytics", "mrr-tracker"] },
      { canonical_name: "Automated Invoicing & Accounts Receivable", description: "Dunning emails, payment link attachments, and collections workflow.", status: "stagnant", sourceKeys: ["automated-invoicing", "accounts-receivable"] },
      { canonical_name: "Cross-Border B2B Payments & Multi-Currency FX", description: "Local ACH/SEPA routing, low-spread currency conversion, and escrow.", status: "active", sourceKeys: ["cross-border-payments", "fx-transfers"] },
      { canonical_name: "Sales Tax & VAT Calculation APIs", description: "Real-time nexus tracking, multi-state rate calculation, automated tax filings.", status: "active", sourceKeys: ["sales-tax", "vat-api"] },
      { canonical_name: "Financial Modeling & FP&A Forecasting", description: "Headcount planning, cash runway scenarios, and real-time bank ledger sync.", status: "active", sourceKeys: ["fpa", "financial-modeling"] },
      { canonical_name: "Crypto & Stablecoin Corporate Treasuries", description: "Multi-sig crypto payouts, stablecoin payroll, and tax ledgering.", status: "active", sourceKeys: ["crypto-treasury", "stablecoin-billing"] },
      { canonical_name: "Fraud Detection & Chargeback Prevention", description: "Machine learning risk scoring, 3DS verification, and dispute defense.", status: "active", sourceKeys: ["fraud-detection", "chargeback-defense"] },
      { canonical_name: "SaaS License Optimization & Shadow IT Audit", description: "SSO login audit, unused seat de-provisioning, and vendor renewal alerts.", status: "active", sourceKeys: ["saas-spend-management", "shadow-it"] },
      { canonical_name: "AI Invoice OCR & Accounts Payable (AP)", description: "Two-way PO matching, approval routing, and automated bank batch payments.", status: "active", sourceKeys: ["accounts-payable", "invoice-ocr"] },
      { canonical_name: "Embedded Lending & Revenue-Based Financing", description: "Underwriting against Stripe/QuickBooks MRR data for non-dilutive credit.", status: "active", sourceKeys: ["revenue-based-financing", "embedded-lending"] },
      { canonical_name: "Escrow & Milestone Marketplace Payouts", description: "Holding funds until client sign-off, split fee calculations, 1099 generation.", status: "active", sourceKeys: ["escrow-service", "marketplace-payouts"] },
      { canonical_name: "Treasury Management & High-Yield Yield Ops", description: "Automated cash sweeps into government money market funds for startups.", status: "active", sourceKeys: ["treasury-management", "cash-sweep"] },
      { canonical_name: "Procurement & Vendor Approval Pipelines", description: "Purchase request intake forms, IT/Security/Finance review workflows.", status: "active", sourceKeys: ["procurement", "vendor-management"] },
      { canonical_name: "K-1 & Tax Document Distribution Hubs", description: "Automated investor tax package delivery, watermark tracking, secure portals.", status: "stagnant", sourceKeys: ["tax-distribution", "investor-tax"] },
      { canonical_name: "Micro-Donations & Tipping Infrastructure", description: "Embedded creator tipping buttons, round-up charitable giving APIs.", status: "stagnant", sourceKeys: ["tipping-api", "micro-donations"] },
      { canonical_name: "Insurance Compliance & COI Trackers", description: "Certificate of insurance verification, vendor liability coverage alerts.", status: "active", sourceKeys: ["insurance-tracking", "coi-compliance"] },
      { canonical_name: "Business Bank Accounts & Sub-Ledgering", description: "Neobanking for developers with programmable webhooks and sub-accounts.", status: "active", sourceKeys: ["business-banking", "developer-bank"] },
      { canonical_name: "Inventory Financing & Supply Chain Capital", description: "Factoring against purchase orders, automated inventory sync with Shopify.", status: "active", sourceKeys: ["inventory-financing", "supply-chain-finance"] },
      { canonical_name: "ESG & Carbon Accounting Ledgers", description: "Scope 1/2/3 carbon footprint telemetry, offset purchasing APIs.", status: "stagnant", sourceKeys: ["carbon-accounting", "esg-reporting"] },
      { canonical_name: "Venture Fund Admin & LP Investor Portals", description: "Capital call notices, quarterly NAV reporting, and secure data rooms.", status: "active", sourceKeys: ["fund-admin", "lp-portal"] },
    ],
  },
  {
    canonical_name: "Security, Privacy & Compliance",
    description: "Cloud security, automated compliance frameworks, identity management, and vulnerability defense.",
    subcategories: [
      { canonical_name: "SOC 2, ISO 27001 & HIPAA Automation", description: "Continuous evidence collection from AWS/GitHub, automated audit readiness.", status: "active", sourceKeys: ["soc2-compliance", "iso27001"] },
      { canonical_name: "Cloud Security Posture Management (CSPM)", description: "Misconfiguration scanning across cloud accounts, IAM permission audits.", status: "active", sourceKeys: ["cspm", "cloud-security"] },
      { canonical_name: "Identity & Access Management (IAM / SSO)", description: "SAML/OIDC single sign-on, SCIM provisioning, and multi-factor auth.", status: "active", sourceKeys: ["sso", "iam-provisioning"] },
      { canonical_name: "Penetration Testing as a Service (PTaaS)", description: "On-demand ethical hacker pentests, verified vulnerability reporting.", status: "active", sourceKeys: ["pentesting", "ptaas"] },
      { canonical_name: "Software Supply Chain & SBOM Security", description: "Dependency vulnerability alerts, open source license compliance, and lockfile scans.", status: "active", sourceKeys: ["sbom", "supply-chain-security"] },
      { canonical_name: "Data Privacy & GDPR/CCPA Consent Hubs", description: "Cookie consent banners, automated data deletion requests (DSAR).", status: "stagnant", sourceKeys: ["cookie-consent", "gdpr-compliance"] },
      { canonical_name: "API Security & Shadow Endpoint Discovery", description: "Automated API schema discovery, anomaly traffic detection, and OWASP Top 10 defense.", status: "active", sourceKeys: ["api-security", "shadow-apis"] },
      { canonical_name: "Zero Trust Network Access (ZTNA) & VPNs", description: "Identity-aware private network proxies, device posture verification.", status: "active", sourceKeys: ["ztna", "zero-trust-vpn"] },
      { canonical_name: "Security Awareness & Phishing Simulation", description: "Simulated email phishing attacks, employee training video modules.", status: "stagnant", sourceKeys: ["phishing-simulation", "security-training"] },
      { canonical_name: "Incident Response & On-Call Escalation", description: "Alert deduplication, scheduled on-call rotations, and post-mortem incident boards.", status: "stagnant", sourceKeys: ["incident-response", "on-call"] },
      { canonical_name: "Data Loss Prevention (DLP) & Secret Scanners", description: "Scanning Slack, Jira, GitHub for leaked API keys, PII, and credit cards.", status: "active", sourceKeys: ["dlp", "secret-scanning"] },
      { canonical_name: "Runtime Application Self-Protection (RASP)", description: "In-app attack blocking, SQL injection prevention, and memory sanitization.", status: "active", sourceKeys: ["rasp", "application-security"] },
      { canonical_name: "Vendor Risk Assessment & Security Reviews", description: "Vendor security questionnaire autofill, continuous vendor risk monitoring.", status: "active", sourceKeys: ["vendor-risk", "security-questionnaire"] },
      { canonical_name: "Bot Protection & CAPTCHA Alternatives", description: "Behavioral biometric fingerprinting, invisible bot challenge gates.", status: "active", sourceKeys: ["bot-protection", "invisible-captcha"] },
      { canonical_name: "Mobile App Shielding & Obfuscation", description: "Binary anti-tampering, root detection, and API key encryption for iOS/Android.", status: "active", sourceKeys: ["app-shielding", "code-obfuscation"] },
      { canonical_name: "Threat Intelligence & Dark Web Monitors", description: "Compromised employee password alerts, leaked source code tracking.", status: "active", sourceKeys: ["threat-intelligence", "dark-web-monitor"] },
      { canonical_name: "Customer Data Anonymization & Masking", description: "Real-time production database PII masking for development staging environments.", status: "active", sourceKeys: ["data-masking", "pii-anonymization"] },
      { canonical_name: "Bug Bounty Program Platforms", description: "Crowdsourced security researcher payouts, vulnerability triage workflows.", status: "active", sourceKeys: ["bug-bounty", "vulnerability-disclosure"] },
      { canonical_name: "Hardware Security Key & Passkey FIDO2 Hubs", description: "WebAuthn passkey management, passwordless biometric onboarding.", status: "active", sourceKeys: ["passkeys", "webauthn"] },
      { canonical_name: "AI Model Jailbreak & Prompt Defense", description: "Detecting prompt injection, jailbreak attempts, and PII leakage in LLMs.", status: "active", sourceKeys: ["prompt-injection-defense", "llm-firewall"] },
      { canonical_name: "Secure Remote Browser Isolation (RBI)", description: "Executing untrusted web links inside isolated cloud containers to stop malware.", status: "active", sourceKeys: ["browser-isolation", "rbi"] },
      { canonical_name: "Physical Security & Office Access Control", description: "Smartphone badge access, guest check-in iPad kiosks, and badge printers.", status: "stagnant", sourceKeys: ["access-control", "visitor-management"] },
      { canonical_name: "SIEM & Security Data Lakes", description: "Cloud-native log lake ingestion with automated correlation rules.", status: "active", sourceKeys: ["siem", "security-data-lake"] },
      { canonical_name: "DNS Filtering & Malware Defense", description: "Recursive DNS threat protection, phishing domain blocking for remote work.", status: "active", sourceKeys: ["dns-filtering", "malware-defense"] },
      { canonical_name: "Continuous Disaster Recovery & Backup Sync", description: "Cross-region multi-cloud database snapshots and automated recovery drills.", status: "active", sourceKeys: ["disaster-recovery", "backup-sync"] },
    ],
  },
  {
    canonical_name: "Customer Support & Success",
    description: "Helpdesk, ticketing, conversational support, churn prevention, and community platforms.",
    subcategories: [
      { canonical_name: "AI Autonomous Support Agents", description: "Instant ticket resolution via documentation RAG, CRM action execution.", status: "active", sourceKeys: ["ai-support-agents", "helpdesk-ai"] },
      { canonical_name: "Omnichannel Helpdesk & Ticket Queues", description: "Unified inbox across email, chat, phone, and WhatsApp with SLA rules.", status: "stagnant", sourceKeys: ["helpdesk", "ticket-management"] },
      { canonical_name: "Customer Health Scoring & Churn Alerting", description: "Product usage telemetry, sentiment shifts, and automated CSM alerts.", status: "active", sourceKeys: ["customer-health", "churn-alerting"] },
      { canonical_name: "Knowledge Base & Self-Service Portals", description: "SEO-optimized help articles, interactive video guides, and search analytics.", status: "stagnant", sourceKeys: ["knowledge-base", "self-service"] },
      { canonical_name: "In-App Product Guidance & Tooltips", description: "Zero-code feature tours, empty state guidance, and interactive onboarding.", status: "active", sourceKeys: ["product-tours", "in-app-guidance"] },
      { canonical_name: "Community Forums & Discussion Hubs", description: "User-to-user Q&A boards, moderator tools, gamified user reputation.", status: "active", sourceKeys: ["community-forum", "user-community"] },
      { canonical_name: "Customer Feedback & Feature Upvoting Boards", description: "Public roadmap voting, changelog notifications, and customer wishlists.", status: "stagnant", sourceKeys: ["feedback-board", "feature-voting"] },
      { canonical_name: "Session Replay & Visual Bug Reproduction", description: "DOM replay recordings with console logs, network payloads, and error tags.", status: "active", sourceKeys: ["session-replay", "bug-reproduction"] },
      { canonical_name: "Status Page & Incident Communication", description: "Component uptime badges, automated subscriber notifications during outages.", status: "stagnant", sourceKeys: ["status-page", "uptime-alerts"] },
      { canonical_name: "Voice Support & Intelligent Call Routing", description: "Cloud IVR, WebRTC browser calling, and automatic call recording.", status: "stagnant", sourceKeys: ["call-center", "ivr-routing"] },
      { canonical_name: "Customer Success Playbook Automation", description: "Automated onboarding sequences, quarterly business review (QBR) prep.", status: "active", sourceKeys: ["csm-playbooks", "qbr-prep"] },
      { canonical_name: "AI Support QA & Agent Performance Scoring", description: "Automated scoring of agent tone, resolution speed, and policy adherence.", status: "active", sourceKeys: ["support-qa", "agent-scoring"] },
      { canonical_name: "Live Co-Browsing & Instant Screen Control", description: "One-click agent view of customer screen without client software downloads.", status: "active", sourceKeys: ["co-browsing", "remote-support"] },
      { canonical_name: "Customer Expansion & Upsell Signal Finders", description: "Identifying accounts nearing plan limits or adding rapid teammates.", status: "active", sourceKeys: ["expansion-signals", "upsell-leads"] },
      { canonical_name: "Localized Multilingual Support Translation", description: "Real-time ticket translation enabling agents to support any language.", status: "active", sourceKeys: ["support-translation", "multilingual-help"] },
      { canonical_name: "Changelog Publishing & What's New Modals", description: "Rich media release notes, in-app notification widgets, and subscribe feeds.", status: "stagnant", sourceKeys: ["changelog-widget", "release-notes"] },
      { canonical_name: "Customer Advocacy & Superfan Portals", description: "Identifying promoter champions, collecting video testimonials.", status: "active", sourceKeys: ["advocacy-portal", "video-testimonials"] },
      { canonical_name: "AI Auto-Tagging & Ticket Categorization", description: "Zero-shot classification of incoming tickets into bug, billing, or feature.", status: "active", sourceKeys: ["ticket-tagging", "ticket-routing"] },
      { canonical_name: "Churn Exit Surveys & Retention Offers", description: "Smart cancellation flows with discount incentives and exit reason tracking.", status: "active", sourceKeys: ["cancellation-flow", "retention-offers"] },
      { canonical_name: "Support Capacity & Workforce Management", description: "Agent shift scheduling, volume forecasting, and queue staffing models.", status: "stagnant", sourceKeys: ["workforce-management", "support-staffing"] },
      { canonical_name: "Enterprise SLA Management & Breach Defense", description: "Real-time countdown clocks, priority escalation routes, and audit exports.", status: "active", sourceKeys: ["sla-management", "enterprise-sla"] },
      { canonical_name: "SMS & Mobile Push Support Channels", description: "Customer text alerts, push notifications, and quick reply triggers.", status: "active", sourceKeys: ["mobile-support", "push-alerts"] },
      { canonical_name: "Customer Onboarding Milestone Verification", description: "Integration health checks, first value achievement (Aha moment) logs.", status: "active", sourceKeys: ["milestone-tracking", "aha-moment"] },
      { canonical_name: "Macro & Snippet Keyboard Shortcuts", description: "Shared team canned responses, dynamic placeholder variables.", status: "stagnant", sourceKeys: ["canned-responses", "snippets"] },
      { canonical_name: "AI Voice Agents for Inbound Phone Support", description: "Sub-second conversational voice bots resolving phone queries.", status: "active", sourceKeys: ["voice-support-ai", "phone-bot"] },
    ],
  },
  {
    canonical_name: "Data Stack, Analytics & BI",
    description: "Data pipelines, modern data stack, real-time analytics, visualization, and semantic layers.",
    subcategories: [
      { canonical_name: "Modern Data Stack ELT & Ingestion", description: "Automated connector sync from SaaS tools into Snowflake, BigQuery, ClickHouse.", status: "active", sourceKeys: ["elt-pipelines", "data-ingestion"] },
      { canonical_name: "Semantic Layers & Metric Stores", description: "Centralized metric definitions (e.g. ARR, active users) reusable across BI tools.", status: "active", sourceKeys: ["semantic-layer", "metric-store"] },
      { canonical_name: "Reverse ETL & Operational Analytics", description: "Syncing warehouse audiences and traits back into HubSpot, Salesforce, and ads.", status: "active", sourceKeys: ["reverse-etl", "operational-analytics"] },
      { canonical_name: "Data Observability & Lineage Tracing", description: "Pipeline anomaly detection, schema change alerts, and end-to-end column lineage.", status: "active", sourceKeys: ["data-observability", "data-lineage"] },
      { canonical_name: "Self-Service Business Intelligence (BI)", description: "No-code exploratory charts, interactive dashboards, and SQL notebooks.", status: "stagnant", sourceKeys: ["bi-dashboards", "data-visualization"] },
      { canonical_name: "Product Analytics & Funnel Tracking", description: "Event autotracking, retention cohort analysis, and conversion funnels.", status: "stagnant", sourceKeys: ["product-analytics", "funnel-analysis"] },
      { canonical_name: "Real-Time Streaming & Event Processing", description: "Kafka/Redpanda stream transformations, sub-second event aggregation.", status: "active", sourceKeys: ["streaming-data", "event-processing"] },
      { canonical_name: "AI Text-to-SQL & Natural Language BI", description: "Conversational queries translated into optimized SQL with schema context.", status: "active", sourceKeys: ["text-to-sql", "conversational-bi"] },
      { canonical_name: "Data Quality Testing & Assertion Frameworks", description: "Automated dbt tests, null checks, uniqueness validation, and alerts.", status: "active", sourceKeys: ["data-quality", "dbt-testing"] },
      { canonical_name: "Customer Data Platforms (CDP)", description: "Identity resolution across web/mobile, persistent user profiles, and event routing.", status: "active", sourceKeys: ["cdp", "customer-data-platform"] },
      { canonical_name: "Data Catalog & Metadata Governance", description: "Data dictionary searching, PII column tagging, and team access requests.", status: "active", sourceKeys: ["data-catalog", "metadata-management"] },
      { canonical_name: "Embedded Analytics & Customer-Facing Charts", description: "White-labeled dashboards, multitenant row-level security, and React chart SDKs.", status: "active", sourceKeys: ["embedded-charts", "customer-analytics"] },
      { canonical_name: "Data Clean Rooms & Privacy Collaboration", description: "Multi-party cryptographic data joins without exposing underlying raw PII.", status: "active", sourceKeys: ["data-clean-room", "privacy-computing"] },
      { canonical_name: "Automated Spreadsheet-to-SQL Sync Engines", description: "Bi-directional Google Sheets/Excel sync to cloud data warehouses.", status: "active", sourceKeys: ["sheet-to-sql", "spreadsheet-sync"] },
      { canonical_name: "Geo-Spatial & Map Analytics Engines", description: "H3 hexagonal indexing, geospatial queries, and heat-density visualization.", status: "active", sourceKeys: ["geospatial-analytics", "map-visualization"] },
      { canonical_name: "Data Transformation & dbt Orchestration", description: "SQL model DAG orchestration, incremental materializations, and documentation.", status: "active", sourceKeys: ["dbt-orchestration", "data-transformation"] },
      { canonical_name: "Graph Analytics & Entity Resolution", description: "Uncovering hidden fraud networks, supply chain graphs, and social clusters.", status: "active", sourceKeys: ["graph-analytics", "entity-resolution"] },
      { canonical_name: "Time-Series Databases & Metric Storage", description: "High-cardinality time-series compression, downsampling, and alerting.", status: "active", sourceKeys: ["time-series-db", "metric-storage"] },
      { canonical_name: "Edge Analytics & In-Browser OLAP", description: "DuckDB-Wasm in-browser querying, instant analytical processing without servers.", status: "active", sourceKeys: ["edge-olap", "duckdb-wasm"] },
      { canonical_name: "Data Cost Optimization & Snowflake FinOps", description: "Warehouse idle auto-suspend, query spill detection, and cluster tuning.", status: "active", sourceKeys: ["snowflake-finops", "warehouse-optimization"] },
      { canonical_name: "Data Mesh & Domain Data Governance", description: "Federated data ownership, domain data product contracts, and cataloging.", status: "active", sourceKeys: ["data-mesh", "data-contracts"] },
      { canonical_name: "Automated Data Profiling & Drift Detection", description: "Statistical distribution drift monitoring, feature distribution shifts.", status: "active", sourceKeys: ["data-profiling", "drift-detection"] },
      { canonical_name: "A/B Test Statistical Analysis Engines", description: "Sequential testing, CUPED variance reduction, and guardrail metric tracking.", status: "active", sourceKeys: ["experimentation-platform", "ab-statistics"] },
      { canonical_name: "Web Scraping & Unstructured Data Ingestion", description: "Headless browser proxy clusters, anti-bot bypass, and HTML table extractors.", status: "active", sourceKeys: ["web-scraping", "unstructured-ingestion"] },
      { canonical_name: "Open Source BI & Self-Hosted Analytics", description: "Docker-deployable privacy-first dashboards, internal database visualizers.", status: "stagnant", sourceKeys: ["open-source-bi", "self-hosted-analytics"] },
    ],
  },
  {
    canonical_name: "HR, Talent & People Operations",
    description: "Applicant tracking, payroll, employee engagement, performance reviews, and global hiring.",
    subcategories: [
      { canonical_name: "Applicant Tracking Systems (ATS)", description: "Job requisition publishing, candidate pipeline kanban, and resume parsing.", status: "stagnant", sourceKeys: ["ats", "recruiting-software"] },
      { canonical_name: "AI Candidate Sourcing & Outbound Recruiting", description: "Automated GitHub/LinkedIn profile screening, personalized outreach emails.", status: "active", sourceKeys: ["ai-sourcing", "talent-search"] },
      { canonical_name: "Employee Onboarding & Equipment Provisioning", description: "Automated laptop ordering, MDM setup, contract signing, and welcome kits.", status: "active", sourceKeys: ["employee-onboarding", "it-provisioning"] },
      { canonical_name: "Performance Reviews & 360 Feedback Hubs", description: "Quarterly OKR tracking, peer reviews, continuous feedback, and 9-box grids.", status: "stagnant", sourceKeys: ["performance-reviews", "360-feedback"] },
      { canonical_name: "Employee Engagement & Anonymous Pulse Surveys", description: "eNPS score tracking, sentiment trends, and anonymous manager feedback channels.", status: "stagnant", sourceKeys: ["employee-engagement", "pulse-surveys"] },
      { canonical_name: "Compensation Benchmarking & Salary Bands", description: "Real-time tech salary data, equity grant percentiles, and pay gap audits.", status: "active", sourceKeys: ["compensation-data", "salary-benchmarking"] },
      { canonical_name: "Skill Assessment & Coding Test Platforms", description: "Sandboxed coding environments, automated test scoring, and anti-cheat proctoring.", status: "stagnant", sourceKeys: ["skill-assessment", "coding-tests"] },
      { canonical_name: "Freelance & Contractor Management Hubs", description: "1099 contractor onboarding, milestone invoices, and IP assignment contracts.", status: "active", sourceKeys: ["contractor-management", "freelance-ops"] },
      { canonical_name: "Internal Talent Marketplace & Gig Mobility", description: "Matching existing employees with cross-department projects and mentors.", status: "active", sourceKeys: ["talent-marketplace", "internal-mobility"] },
      { canonical_name: "Learning Management Systems (LMS) & Training", description: "Video course creation, mandatory compliance quizzes, and certificate tracking.", status: "stagnant", sourceKeys: ["lms", "employee-training"] },
      { canonical_name: "Global Relocation & Visa Processing", description: "Immigration case filing, attorney coordination, and relocation stipends.", status: "active", sourceKeys: ["global-relocation", "visa-processing"] },
      { canonical_name: "Employee Benefits & Wellness Stipends", description: "Flexible lifestyle spending accounts, mental health benefits, and gym cards.", status: "active", sourceKeys: ["employee-benefits", "wellness-stipends"] },
      { canonical_name: "Time Off, PTO & Parental Leave Tracking", description: "Slack-integrated leave requests, coverage calendars, and statutory compliance.", status: "stagnant", sourceKeys: ["pto-tracking", "leave-management"] },
      { canonical_name: "Culture & Virtual Team Building Activities", description: "Asynchronous trivia, virtual escape rooms, and automated watercooler pairings.", status: "stagnant", sourceKeys: ["team-building", "virtual-watercooler"] },
      { canonical_name: "Exit Interview & Turnover Analytics", description: "Automated departure questionnaires, regrettable churn tracking, and insights.", status: "active", sourceKeys: ["exit-interviews", "turnover-analytics"] },
      { canonical_name: "Diversity, Equity & Inclusion (DEI) Analytics", description: "Anonymous demographic breakdown, promotion rate parity, and hiring bias flags.", status: "active", sourceKeys: ["dei-analytics", "diversity-metrics"] },
      { canonical_name: "Headcount Planning & Org Chart Design", description: "Future org hierarchy modeling, department budget constraints, and hiring goals.", status: "active", sourceKeys: ["headcount-planning", "org-chart"] },
      { canonical_name: "Reference Checking & Credential Verification", description: "Automated peer reference forms, degree authentication, and fraud checks.", status: "stagnant", sourceKeys: ["reference-checking", "background-checks"] },
      { canonical_name: "Employee Referral Tracking & Bonus Payouts", description: "Internal employee referral portals, automated referral bonus vesting.", status: "stagnant", sourceKeys: ["employee-referrals", "referral-bonuses"] },
      { canonical_name: "Peer Mentorship & 1-on-1 Matching Hubs", description: "Algorithm-based mentor matching, goal setting, and discussion guide templates.", status: "active", sourceKeys: ["peer-mentorship", "career-growth"] },
      { canonical_name: "Desk & Hybrid Office Space Booking", description: "Hot desk reservations, parking spot management, and team office day sync.", status: "stagnant", sourceKeys: ["desk-booking", "hybrid-office"] },
      { canonical_name: "Offboarding & Deprovisioning Orchestration", description: "Automated SSO revocation, hardware recovery boxes, and exit agreements.", status: "active", sourceKeys: ["employee-offboarding", "deprovisioning"] },
      { canonical_name: "Executive Search & Talent CRM", description: "Confidential candidate notes, pipeline stages, and board committee reviews.", status: "active", sourceKeys: ["executive-search", "talent-crm"] },
      { canonical_name: "Shift Planning & Hourly Worker Scheduling", description: "Mobile shift swaps, overtime alerts, and geo-fenced clock-in kiosks.", status: "active", sourceKeys: ["shift-scheduling", "hourly-workers"] },
      { canonical_name: "Automated Candidate Interview Scheduling", description: "Multi-interviewer calendar coordination, timezone detection, and reminders.", status: "stagnant", sourceKeys: ["interview-scheduling", "recruiting-calendar"] },
    ],
  },
];

async function bootstrapTaxonomy() {
  console.log("================================================================================");
  console.log("🚀 STARTING BULK TAXONOMY BOOTSTRAP (200+ L2 CATEGORIES & MASTER GENRE DICTIONARY)");
  console.log("================================================================================\n");

  let totalL1 = 0;
  let totalL2 = 0;
  let totalMappings = 0;

  for (const l1 of TAXONOMY) {
    // 1. L1 マクロカテゴリの Upsert
    const { data: l1Record, error: l1Err } = await supabaseAdmin
      .from("genres")
      .upsert(
        {
          canonical_name: l1.canonical_name,
          level: 1,
          description: l1.description,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "canonical_name" }
      )
      .select("id, canonical_name")
      .single();

    if (l1Err || !l1Record) {
      console.error(`❌ Failed to insert L1: ${l1.canonical_name}`, l1Err);
      continue;
    }

    totalL1++;
    console.log(`📂 [L1 Category]: ${l1Record.canonical_name} (ID: ${l1Record.id})`);

    // 2. L2 コアカテゴリの Bulk Upsert
    for (const l2 of l1.subcategories) {
      const { data: l2Record, error: l2Err } = await supabaseAdmin
        .from("genres")
        .upsert(
          {
            parent_id: l1Record.id,
            canonical_name: l2.canonical_name,
            level: 2,
            description: l2.description,
            status: l2.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "canonical_name" }
        )
        .select("id, canonical_name, status")
        .single();

      if (l2Err || !l2Record) {
        console.error(`   ❌ Failed to insert L2: ${l2.canonical_name}`, l2Err);
        continue;
      }

      totalL2++;

      // 3. 情報源マッピング (source_topic_mappings) の登録
      for (const key of l2.sourceKeys) {
        const { error: mapErr } = await supabaseAdmin
          .from("source_topic_mappings")
          .upsert(
            {
              source_name: "product_hunt",
              source_topic_key: key,
              genre_id: l2Record.id,
              last_fetched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "source_name,source_topic_key" }
          );

        if (!mapErr) {
          totalMappings++;
        }
      }
    }
  }

  // 4. 検証: DB 内の総レコード数を確認
  const { count: finalGenreCount } = await supabaseAdmin
    .from("genres")
    .select("*", { count: "exact", head: true });

  const { count: finalMappingCount } = await supabaseAdmin
    .from("source_topic_mappings")
    .select("*", { count: "exact", head: true });

  console.log("\n================================================================================");
  console.log(`🎉 BOOTSTRAP COMPLETE!`);
  console.log(`   - Total L1 Macro Categories: ${totalL1}`);
  console.log(`   - Total L2 Subcategories: ${totalL2}`);
  console.log(`   - Total DB Genres Records: ${finalGenreCount}`);
  console.log(`   - Total Source Topic Mappings: ${finalMappingCount}`);
  console.log("================================================================================\n");
}

bootstrapTaxonomy().catch((err) => {
  console.error("Fatal bootstrap failure:", err);
  process.exit(1);
});
