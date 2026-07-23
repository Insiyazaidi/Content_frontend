/**
 * InkFlow AI — Curated Template Library
 * Pre-built prompts organized by category for quick content creation.
 */

const TEMPLATES = [
  {
    category: 'Executive',
    icon: '🏢',
    items: [
      {
        title: 'Executive Summary Brief',
        desc: 'High-level decision summary for C-Suite leadership',
        prompt: 'Synthesize the following project proposal into a 1-page C-level Executive Summary. Highlight strategic alignment, financial projection ROI, risk mitigation, and top 3 immediate action recommendations.',
        mode: 'summary',
        tone: 'professional',
        audience: 'executive',
      },
      {
        title: 'Board Meeting Presentation Script',
        desc: 'Key speaking points for quarterly performance',
        prompt: 'Draft an executive briefing script for a quarterly board meeting. Structure with: Q3 financial highlights, key strategic wins, operational bottlenecks, and next quarter core growth initiatives.',
        mode: 'email',
        tone: 'formal',
        audience: 'executive',
      },
      {
        title: 'Crisis Communication Memo',
        desc: 'Clear, reassuring internal update during incident response',
        prompt: 'Write an internal crisis communication memo addressing an unexpected system downtime incident. Reassure employees, detail root cause investigation, action taken, and timeline for full remediation.',
        mode: 'email',
        tone: 'empathetic',
        audience: 'executive',
      },
    ],
  },
  {
    category: 'Business',
    icon: '💼',
    items: [
      {
        title: 'Cold Outreach Email',
        desc: 'First contact email to a potential client or partner',
        prompt: 'Write a cold outreach email to a potential client introducing our services. Keep it concise, personable, and include a clear call-to-action for a brief introductory call.',
        mode: 'email',
        tone: 'professional',
      },
      {
        title: 'Project Update',
        desc: 'Status update email for stakeholders',
        prompt: 'Write a project status update email to stakeholders covering: current progress, milestones achieved, upcoming deliverables, any blockers or risks, and next steps.',
        mode: 'email',
        tone: 'professional',
      },
      {
        title: 'Meeting Follow-Up',
        desc: 'Recap and action items after a meeting',
        prompt: 'Write a follow-up email after a business meeting. Include a brief recap of what was discussed, action items with owners, and next meeting date. Keep it organized with bullet points.',
        mode: 'email',
        tone: 'professional',
      },
      {
        title: 'Product Launch Announcement',
        desc: 'Internal or external product launch email',
        prompt: 'Write an exciting product launch announcement email. Include the product name, key features and benefits, launch date, and how the audience can get started or learn more.',
        mode: 'email',
        tone: 'persuasive',
      },
    ],
  },
  {
    category: 'Marketing & Growth',
    icon: '📣',
    items: [
      {
        title: 'SEO Blog Post',
        desc: 'Search-optimized article with headings and structure',
        prompt: 'Write an SEO-optimized blog post about "10 Productivity Tips for Remote Workers in 2026". Include an engaging introduction, numbered tips with subheadings, practical examples, and a strong conclusion with a call-to-action.',
        mode: 'blog',
        tone: 'casual',
      },
      {
        title: 'Social Media Campaign Pack',
        desc: 'Multi-platform viral content generator',
        prompt: 'Create a social media content pack for launching a new AI productivity tool. Include: 1 Twitter/X thread (5 tweets), 1 LinkedIn post, 1 Instagram caption with emoji, and 3 relevant hashtag suggestions for each platform.',
        mode: 'social',
        tone: 'witty',
      },
      {
        title: 'Newsletter Introduction',
        desc: 'Engaging newsletter opener',
        prompt: 'Write an engaging newsletter introduction about the latest trends in artificial intelligence. Hook the reader in the first line, provide 3 key highlights they\'ll learn about, and create anticipation for the full content.',
        mode: 'blog',
        tone: 'casual',
      },
      {
        title: 'Case Study Summary',
        desc: 'Client success story format',
        prompt: 'Write a case study summary following this structure: Challenge (what problem the client faced), Solution (how our product/service helped), Results (quantified outcomes with metrics), and a client testimonial quote.',
        mode: 'summary',
        tone: 'professional',
      },
    ],
  },
  {
    category: 'Developer & Tech',
    icon: '⚡',
    items: [
      {
        title: 'Technical API Release Notes',
        desc: 'Developer-facing changelog and migration guide',
        prompt: 'Draft technical release notes for v2.0 of a REST API. Include: major breaking changes, new endpoints with example payloads, deprecation timeline, and quickstart migration steps.',
        mode: 'blog',
        tone: 'formal',
        audience: 'technical',
      },
      {
        title: 'Architecture Explanation',
        desc: 'Explain complex tech stacks simply',
        prompt: 'Explain the concept of Server-Sent Events (SSE) versus WebSockets for real-time web applications. Contrast latency, connection handling, firewall friendliness, and best use cases for each.',
        mode: 'summary',
        tone: 'professional',
        audience: 'technical',
      },
    ],
  },
  {
    category: 'Creative',
    icon: '🎨',
    items: [
      {
        title: 'Sci-Fi Short Story',
        desc: 'A complete flash fiction piece',
        prompt: 'Write a short science fiction story (about 500 words) about an astronaut who discovers that the stars are slowly disappearing from the night sky. Include vivid imagery, a twist ending, and explore the theme of cosmic loneliness.',
        mode: 'creative',
        tone: 'witty',
      },
      {
        title: 'Poetry: Nature',
        desc: 'A lyrical poem about the natural world',
        prompt: 'Write a lyrical poem about a forest at dawn. Use vivid sensory details — the light filtering through leaves, morning dew, bird songs, the smell of earth. Make it 3-4 stanzas with a reflective tone.',
        mode: 'creative',
        tone: 'formal',
      },
      {
        title: 'Character Backstory',
        desc: 'Detailed character origin for fiction or games',
        prompt: 'Create a detailed character backstory for a retired detective who now runs a small bookshop in a coastal town. Include their motivation for leaving the force, a defining case that haunts them, their personality quirks, and a secret they keep.',
        mode: 'creative',
        tone: 'professional',
      },
    ],
  },
  {
    category: 'Academic & Learning',
    icon: '🎓',
    items: [
      {
        title: 'Research Paper Summary',
        desc: 'Summarize complex academic content',
        prompt: 'Summarize the key concepts of quantum computing for a general audience. Cover: what quantum bits (qubits) are, how they differ from classical bits, quantum entanglement, current applications, and future potential. Use analogies where helpful.',
        mode: 'summary',
        tone: 'professional',
      },
      {
        title: 'Concept Explainer (ELI5)',
        desc: 'Break down complex topics simply',
        prompt: 'Explain the concept of blockchain technology as if teaching a curious 15-year-old. Use everyday analogies, break it into digestible steps, and address common misconceptions.',
        mode: 'summary',
        tone: 'casual',
        audience: 'beginner',
      },
    ],
  },
];

export default TEMPLATES;

