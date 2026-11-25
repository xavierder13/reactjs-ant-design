# Recruitment ATS — online examination

Part of the `recruitment-ats` skill; read `SKILL.md` first.

Applicants take the exams in a **separate app**, `recruitment-exam/`
(workspace repo: React + Vite, link `<EXAM_APP_URL>/exam/<token>`,
dev Docker :5175, production static upload to SiteGround — its README).
Its backend and the source of truth for every rule is recruitment-portal
`OnlineExamService` (tables `exams`, `exam_questions`, `exam_settings`,
`exam_invitations`, `exam_attempts`; sample MPQ / MDQ from
`OnlineExamSeeder`). This app only sends links, shows results and edits the
expiry, through vueportal `recruitment/online_exam/*` → gateway
`online_exam_*` (`recruitmentApi.js` header has the contract).

- **Applicant drawer → Online Exam tab** (`OnlineExamTab.jsx`;
  `careers-online-exam-results` or `-send`): each link sent (status active /
  expired / completed / revoked, sent / expires / opened), per exam its
  status and result — aptitude (MDQ): score, %, Passed / Failed vs the
  exam's passing %, per area; personality (MPQ): each trait's average 1–5,
  no pass / fail — plus Late and the focus-lost / copy-screenshot counts.
  **Send exam link** (`-send`): pick exams (default all active), email it
  (needs an email; the link is shown to copy either way); a new link
  doesn't cancel older active ones. Copy / Revoke on active links (not once
  completed).
- **Recruitment → Setup → Online Exam** (`setup/online_exam/OnlineExamSettings.jsx`,
  `careers-online-exam-settings`): link expiry value + Hours / Days (1–720
  hours / 1–30 days; new links only), and the exams list (read-only —
  questions are edited in the seeder for now).
- Link rules (portal): valid until `expires_at`; an exam started before
  expiry can still be submitted within its own timer (+2 min grace, later =
  Late); done once every exam on it is submitted.
- Protection in the exam app is a deterrent (copy / print / shortcuts
  blocked, blur on focus loss, watermark; on touch screens "hold to view").
  A phone's own screenshot can't be blocked by any web page.
