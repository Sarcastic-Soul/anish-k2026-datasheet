// All chip data for the datasheet. Every pin is a real skill; every project and number is real.
window.SS = (function () {
  "use strict";

  const PROJ = [
    { id: "radish", name: "RADISH", title: "Radish", href: "#app-radish" },
    { id: "codemon", name: "CODEMON", title: "Codemon", href: "#app-codemon" },
    { id: "trimurl", name: "TRIMURL", title: "TrimURL", href: "#app-trimurl" },
    { id: "cropdoc", name: "CROPDOC", title: "CropDoc", href: "#app-cropdoc" },
    { id: "support", name: "SUPPORT DESK", title: "Support Desk", href: "#app-support" },
    { id: "foolscap", name: "FOOLSCAP", title: "Foolscap", href: "#app-foolscap" },
    { id: "brutshop", name: "BRUTSHOP", title: "BrutShop", href: "#app-brutshop" },
    { id: "chatapp", name: "CHATAPP", title: "ChatApp", href: "#app-chatapp" },
    { id: "syllabai", name: "SYLLABAI", title: "SyllabAI", href: "#app-syllabai" },
    { id: "guideweave", name: "GUIDE WEAVE", title: "Guide Weave", href: "#app-guideweave" }
  ];
  const ALL = PROJ.map(p => p.id);

  const GROUPS = [
    { key: "L", name: "LANGUAGES & RUNTIMES", side: "Left" },
    { key: "B", name: "DEVOPS & OBSERVABILITY", side: "Bottom" },
    { key: "R", name: "DATA & AI", side: "Right" },
    { key: "T", name: "PROTOCOLS & FRONTEND", side: "Top" }
  ];

  // 40 pins in QFN order: left 1-10 (top to bottom), bottom 11-20 (left to right),
  // right 21-30 (bottom to top), top 31-40 (right to left).
  const PINS = [
    ["JAVA", "Java", ["radish", "trimurl", "brutshop"]],
    ["NIO", "Java NIO, one event loop for every client", ["radish"]],
    ["SPRING", "Spring Boot", ["trimurl", "brutshop"]],
    ["PY", "Python", ["support", "guideweave"]],
    ["FASTAPI", "FastAPI", ["support"]],
    ["TS", "TypeScript", ["codemon", "cropdoc"]],
    ["BUN", "Bun, single-binary builds", ["codemon"]],
    ["NODE", "Node.js / Express.js", ["chatapp"]],
    ["RUST", "Rust, one core crate for CLI and GUI", ["foolscap"]],
    ["VCC", "Supply: chai. Powers every project.", ALL, "P"],
    ["K8S", "Kubernetes, autoscaling 3–15 pods", ["trimurl"]],
    ["HELM", "Helm, charts for 3 environments", ["trimurl"]],
    ["DOCKER", "Docker", ["radish", "brutshop", "codemon"]],
    ["K6", "k6 load testing, 4,000 users", ["trimurl"]],
    ["PROM", "Prometheus", ["trimurl"]],
    ["GRAFANA", "Grafana", ["trimurl"]],
    ["LOKI", "Loki", ["trimurl"]],
    ["CICD", "CI/CD to Docker Hub", ["brutshop"]],
    ["LINUX", "Linux, Debian + Flatpak packaging", ["foolscap"]],
    ["GND", "Ground: sleep. Often floating.", [], "G"],
    ["PGSQL", "PostgreSQL", ["trimurl", "brutshop", "syllabai", "support"]],
    ["PGVEC", "pgvector, hybrid retrieval", ["support"]],
    ["REDIS", "Redis / Valkey (Radish speaks its protocol)", ["radish", "trimurl", "brutshop", "support"]],
    ["SQLITE", "SQLite", ["codemon", "cropdoc"]],
    ["CHROMA", "ChromaDB", ["guideweave"]],
    ["LANGGRAPH", "LangGraph state machines", ["support"]],
    ["RAG", "Retrieval-augmented generation", ["support", "guideweave"]],
    ["TFLITE", "TensorFlow Lite, MobileNetV2", ["cropdoc"]],
    ["LLAMA", "llama.cpp / local LLM", ["cropdoc", "guideweave"]],
    ["GEMINI", "Gemini API", ["syllabai", "chatapp"]],
    ["RESP", "RESP2 / RESP3 protocol", ["radish"]],
    ["TCP", "TCP sockets", ["radish"]],
    ["MCP", "Model Context Protocol", ["codemon"]],
    ["REACT", "React", ["trimurl", "brutshop", "chatapp", "support"]],
    ["NEXT", "Next.js", ["syllabai"]],
    ["RN", "React Native + Expo", ["cropdoc"]],
    ["SOCKIO", "Socket.IO", ["chatapp"]],
    ["WEBRTC", "WebRTC voice and video", ["chatapp"]],
    ["GTK4", "GTK4 desktop UI", ["foolscap"]],
    ["INK", "Ink terminal UI", ["codemon"]]
  ].map((p, i) => ({
    no: i + 1, name: p[0], desc: p[1], proj: p[2], type: p[3] || "",
    group: GROUPS[Math.floor(i / 10)]
  }));

  const NC = ["JavaScript", "HTML", "CSS", "SQL", "MySQL", "Tailwind CSS", "Shadcn/UI", "Zustand",
    "Spring Security", "JPA/Hibernate", "Django REST", "LangChain", "Kafka", "RabbitMQ", "MongoDB",
    "Supabase", "Drizzle ORM", "NeonDB", "AWS", "GCP", "Terraform", "Ansible", "GitHub Actions", "Nginx",
    "Vercel", "Ubuntu", "Postman", "Vitest", "JUnit/Mockito", "Datadog", "Git", "Maven", "JWT",
    "Razorpay", "Cloudinary"];

  // Timing diagram: one column per month, September 2025 to October 2026.
  const MONTHS = ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT"]
    .map((m, i) => ({ m, y: i < 4 ? 2025 : 2026 }));

  // from/to are month indexes, end exclusive. fuzzy = the exact months are not on record.
  const ROLES = [
    { id: "btech", lane: "B.TECH", label: "IIIT Naya Raipur (ongoing)", from: 0, to: 14, open: true },
    { id: "prism", lane: "SAMSUNG PRISM", label: "R&D Intern", from: 1, to: 12 },
    { id: "aparsoft", lane: "APARSOFT", label: "SWE Intern", from: 9, to: 12 },
    { id: "oss", lane: "OPEN SOURCE", label: "activity-frames, 2026 (months not fixed)", from: 4, to: 14, fuzzy: true }
  ];

  return { PROJ, GROUPS, PINS, NC, MONTHS, ROLES };
})();
