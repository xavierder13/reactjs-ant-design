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
  Each exam is an `ExamResultCard.jsx` panel: time taken (of the limit),
  focus / copy flags; MDQ the score bar (`ScoreBar`: a labelled "Pass N%"
  marker in amber (warning color) across it, below-pass zone shaded) and each
  area's bar + Strong (≥ 80%) / Average (≥ 60%) / Needs work; MPQ each
  trait's bar + High (≥ 4.0) / Moderate (≥ 2.5) / Low and a one-line
  reading (`TRAIT_READING` — sample traits; a new trait shows no reading).
  **View answers** on a submitted exam → `ExamAnswersModal.jsx`
  (`getOnlineExamAnswers(attempt_id)`): every question with the
  applicant's answer — MDQ the correct option and ✓ / ✗ (filter Wrong /
  Unanswered), MPQ the scale label, Reverse items and the score each
  counted as (6 − answer).
  **Who can send when:** with `-send`, only while the applicant's current
  phase is Exam (`currentStep` = 2 with `iq_status` set: On Process, Failed,
  Non-Compliant or Reserved) — otherwise the button is disabled with the
  current phase in its tooltip. An Administrator can send at any phase;
  outside Exam a confirm ("Send anyway") sends `confirm_any_stage`.
  Enforced by the portal gateway (`online_exam_invite`: 422, or 422
  `needs_confirmation` for an Administrator without the confirm); vueportal
  adds `any_stage` from the user's Administrator role (never from the client).
  **Send exam link** (`-send`): pick exams (default all active), email it
  (needs an email; the link is shown to copy either way); a new link
  doesn't cancel older active ones. An active link is shown on its card
  (copyable) to senders and Administrators; Copy / Revoke on active links
  (not once completed). **Preview** (Administrator only, any link status):
  `previewOnlineExam(invitation_id)` → the link + `?preview=<key>` (portal
  HMAC of the token) opened in a new tab — the exam as the applicant sees
  it, an "Administrator preview" banner, answers scored and shown but
  nothing recorded (no opened_at, attempt or timer). vueportal refuses
  non-Administrators (403) and sends `any_stage`; the gateway checks it.
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
