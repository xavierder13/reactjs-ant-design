// Application form PDF (Phase 8) — recruitment-portal ApplicantDetailsPDF.vue:
// writes the applicant's details onto the company's blank form
// (public/pdf/application_form.pdf, copied from the portal's public/pdf/)
// at the portal's coordinates. Fixed vs the portal, which skipped them on
// real data: Junior/Senior "High School" spelled with a space, honors (the
// column is `honors`, not `sy_honors`), and the source boxes (stored values
// are e.g. "Walk-in Applicant", "Job Fair", "Print ADS(…)"). Marks are drawn
// as filled boxes instead of form radio widgets, and age is the computed age
// when they applied (as the drawer shows).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ageFromBirthdate } from './applicantStatus';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}pdf/application_form.pdf`;
const BLACK = rgb(0, 0, 0);

const lower = (v) => String(v ?? '').trim().toLowerCase();
const BLANKS = ['', 'null', 'undefined', '-'];
const squash = (v) => lower(v).replace(/[^a-z]/g, ''); // "Junior High School" → "juniorhighschool"

// "2009 to 2013" → "2009-2013"
const years = (sy) => {
  const [from, to] = String(sy || '').split(' to ');
  return to ? `${from}-${to}` : from;
};

// Source ("How did you learn…") box: [x, y], plus the text for "Others".
const sourceMark = (howLearn) => {
  const v = lower(howLearn);
  if (BLANKS.includes(v)) return null;
  if (/walk|walak/.test(v)) return { at: [37, 639] };
  if (/print ads|poster|leaflet|tarpaulin/.test(v)) return { at: [83, 639] };
  if (v === 'indeed') return { at: [167, 639] };
  if (v === 'job fair') return { at: [37, 630] };
  if (v === 'addessa fb page') return { at: [83, 630] };
  if (/^employee refer/.test(v)) return { at: [37, 621], referral: true };
  return { at: [167, 630], text: howLearn };
};

// Civil status box (portal: Single/Married left column, Widow/Domestic
// Partnership right; Single/Widow top row).
const civilMark = (status) => {
  const v = lower(status);
  const left = ['single', 'married'].includes(v);
  const right = ['widow', 'domestic partnership'].includes(v);
  if (!left && !right) return null;
  return [left ? 456 : 495, ['single', 'widow'].includes(v) ? 713 : 705];
};

export async function buildApplicationFormPdf({ applicant: a, educ_attains: educ = [], experiences = [], references = [], fam_members: family = [], dependents = [] }) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('The application form template could not be loaded.');
  const pdf = await PDFDocument.load(await response.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.getPages()[0];
  const charset = new Set(font.getCharacterSet());

  // Text at (x, y); characters the standard font can't encode become "?",
  // and text wider than `width` is shrunk (down to 5pt) then cut. The
  // applicant form stored some blanks as the text "null" / "undefined".
  const text = (value, x, y, size = 9, width = null) => {
    if (BLANKS.includes(lower(value))) return;
    let s = [...String(value ?? '')].map((ch) => (charset.has(ch.codePointAt(0)) ? ch : '?')).join('').trim();
    if (!s) return;
    let fontSize = size;
    if (width) {
      while (fontSize > 5 && font.widthOfTextAtSize(s, fontSize) > width) fontSize -= 0.5;
      while (s.length > 1 && font.widthOfTextAtSize(s, fontSize) > width) s = s.slice(0, -1);
    }
    page.drawText(s, { x, y, size: fontSize, font, color: BLACK });
  };
  // Filled dot inside the form's option bubble (portal's 5×5 radio widget).
  const mark = (at) => at && page.drawCircle({ x: at[0] - 2.5, y: at[1] + 2.5, size: 2.6, color: BLACK });

  // Header
  text(a.date_submitted, 60, 788);
  text(a.lastname, 42, 753, 9, 80);
  text(a.firstname, 125, 753, 9, 78);
  text(a.middlename, 205, 753, 9, 140);
  text(a.position_name, 349, 753, 9, 120);
  text(ageFromBirthdate(a.birthdate, a.date_applied || a.date_submitted) ?? a.age, 473, 755);
  mark(lower(a.gender) === 'male' ? [547, 763] : lower(a.gender) === 'female' ? [547, 753] : null);
  text(a.contact_no, 490, 737, 9, 95);
  text(a.address, 110, 723, 7, 330);
  text(a.address2, 110, 708, 7, 330);
  text(a.birth_place, 110, 693, 7, 330);
  mark(civilMark(a.civil_status));
  text(a.birthdate, 87, 677, 10, 110);
  text(a.citizenship, 203, 677, 10, 150);
  text(a.religion, 360, 677, 10, 110);
  text(a.weight ? `${a.weight} kg` : '', 480, 677, 8, 60);
  text(a.height ? `${a.height} cm` : '', 548, 677, 8, 45);
  text(a.sss_no, 55, 663, 10, 145);
  text(a.philhealth_no, 207, 663, 10, 145);
  text(a.pagibig_no, 360, 663, 10, 100);
  text(a.tin_no, 467, 663, 10, 120);
  const source = sourceMark(a.how_learn);
  if (source) {
    mark(source.at);
    if (source.text) text(source.text, 200, 632, 8, 150);
    if (source.referral) text(a.referral_code, 132, 622, 8, 180);
  }
  text(a.email, 360, 648, 7, 225);

  // Education: one row per level.
  const levels = {
    junior: (l) => ['highschool', 'juniorhighschool'].includes(l),
    senior: (l) => l === 'seniorhighschool',
    college: (l) => l === 'college',
    vocational: (l) => l === 'vocationalschool',
  };
  const rowY = { junior: 565, senior: 548, college: 532, vocational: 514 };
  Object.entries(levels).forEach(([key, is]) => {
    // Newest row per level (re-saved forms leave older copies).
    const e = educ.findLast((x) => is(squash(x.educ_level)));
    if (!e) return;
    const y = rowY[key];
    text(e.school, 115, y, 8, 130);
    text(e.course, 250, y, 8, 130);
    text(e.major, 385, y, 8, 72);
    text(years(e.sy_attended), 461, y, 6, 56);
    text(e.honors, 520, y, 7, 65);
  });

  // Employment history (3 rows)
  [468, 451, 437].forEach((y, i) => {
    const e = experiences[i];
    if (!e) return;
    text(e.employer, 33, y, 8, 108);
    text(e.position, 145, y, 8, 100);
    text(e.salary, 250, y, 8, 52);
    text(e.date_of_service, 306, y, 6, 76);
    text(e.job_description, 385, y, 6, 200);
  });

  // References (3 rows)
  [392, 376, 360].forEach((y, i) => {
    const r = references[i];
    if (!r) return;
    text(r.name, 33, y, 8, 138);
    text(r.address, 176, y, 8, 128);
    text(r.contact, 309, y, 8, 72);
    text(r.company, 385, y, 8, 110);
    text(r.position, 500, y, 8, 85);
  });

  // Parents / spouse / guardian
  [['father', 313], ['mother', 295], ['spouse', 278], ['guardian', 260]].forEach(([rel, y]) => {
    const f = family.find((x) => lower(x.relationship) === rel);
    if (!f) return;
    text(f.name, 90, y, 8, 128);
    text(f.age, 223, y, 8, 26);
    text(f.address, 253, y, 8, 145);
    text(f.contact, 403, y, 8, 74);
    text(f.occupation, 480, y, 8, 105);
  });

  // Dependents (3 rows)
  [214, 198, 182].forEach((y, i) => {
    const d = dependents[i];
    if (!d) return;
    text(d.name, 33, y, 8, 138);
    text(d.relationship, 176, y, 8, 92);
    text(d.age, 273, y, 8, 26);
    text(d.address, 303, y, 8, 172);
    text(d.occupation, 480, y, 8, 105);
  });

  return pdf.save();
}

export async function downloadApplicationFormPdf(data) {
  const bytes = await buildApplicationFormPdf(data);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Application Form - ${data.applicant.name || data.applicant.id}.pdf`.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
