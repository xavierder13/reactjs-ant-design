# Recruitment ATS — local development setup

Part of the `recruitment-ats` skill; read `SKILL.md` first (cross-cutting rules).

## Local development setup (how it's wired now)

- Local portal containers `recruitment_app` / `recruitment_nginx` /
  `recruitment_db` (repo's docker-compose; nginx :8090), DB restored from
  `C:\Users\User\Downloads\recruitment-portal-live(1).sql` (production
  export 2026-10-01). `recruitment_nginx` was attached to docker
  `shared_network` (`docker network connect shared_network
  recruitment_nginx`) — redo after a container re-create.
- vueportal `.env` `CAREERS_API_URL=http://recruitment_nginx/api`.
- Local portal: `MAIL_MAILER=log`, M360 keys empty until the user adds them.
- Uploads need `public/wysiwyg` writable in the portal container; portal
  `npm run dev` rewrites the tracked `public/mix-manifest.json` — restore it.

Notification bell: vueportal `NotificationService` (not a `/recruitment/*`
route — `/api/notifications/summary`) calls the gateway's
`notification_counts` server-side via `RecruitmentController::notificationCounts()`
(10 s timeout; null on any failure, so the bell drops recruitment instead of
failing). The procedure counts, from the acting user's own scoped All
Applicants list (`get_applicants_new`, needs `jobapplicants-list`),
applications created today and, per stage (initial interview, exam, B.I.,
final interview, orientation), applicants still on process (status 0) whose
stage date is today or earlier — overdue schedules keep counting;
each stage only when the portal user has its `jobapplicants-*-list`
permission and the HRIS user its `careers-*-list`.
