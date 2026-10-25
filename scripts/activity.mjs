// Builds assets/activity.svg from live GitHub contribution data.
// Run by .github/workflows/activity.yml; needs GH_TOKEN. Usage: node scripts/activity.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const LOGIN = process.env.GH_LOGIN || 'Srv532';
const DAYS = 60;
const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${process.env.GH_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
if (!res.ok) throw new Error(`GitHub API ${res.status}`);
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const all = json.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const days = all.slice(-DAYS);
const total = days.reduce((s, d) => s + d.contributionCount, 0);
const max = Math.max(4, ...days.map((d) => d.contributionCount));

const W = 900, H = 260, L = 50, R = 40, T = 70, B = 50;
const cw = W - L - R, ch = H - T - B;
const x = (i) => L + (i * cw) / (days.length - 1);
const y = (v) => T + ch - (v * ch) / max;
const pts = days.map((d, i) => [x(i), y(d.contributionCount)]);
const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
const area = `${line}L${x(days.length - 1).toFixed(1)} ${T + ch}L${L} ${T + ch}Z`;
const [lx, ly] = pts[pts.length - 1];
const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const grid = [0, 0.5, 1]
  .map((f) => {
    const gy = T + ch - f * ch;
    return `<line x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}" stroke="#111" stroke-opacity=".15" stroke-dasharray="4 6"/><text x="${L - 8}" y="${gy + 4}" text-anchor="end" class="m" font-size="12">${Math.round(f * max)}</text>`;
  })
  .join('');
const dots = pts.map(([px, py], i) => (days[i].contributionCount ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="#ff5a36" stroke="#111" stroke-width="1.5"/>` : '')).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>
    .m{font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-weight:700;fill:#111}
    .h{font-family:'Arial Black','Segoe UI',Arial,sans-serif;font-weight:900;fill:#111}
    .ln{stroke-dasharray:2400;stroke-dashoffset:2400;animation:draw 3s ease-out forwards}
    .pulse{animation:pulse 1.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes draw{to{stroke-dashoffset:0}}
    @keyframes pulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(2.6);opacity:0}}
  </style>
  <rect x="9" y="9" width="${W - 10}" height="${H - 10}" rx="14" fill="#111"/>
  <rect x="2" y="2" width="${W - 10}" height="${H - 10}" rx="14" fill="#f5f1e8" stroke="#111" stroke-width="4"/>
  <text x="${L}" y="38" class="h" font-size="22">LIVE ACTIVITY</text>
  <text x="${L}" y="58" class="m" font-size="13">last ${DAYS} days · ${total} contributions · updated ${new Date().toISOString().slice(0, 10)}</text>
  ${grid}
  <path d="${area}" fill="#ffd60a" opacity=".85"/>
  <path class="ln" d="${line}" fill="none" stroke="#111" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}
  <circle class="pulse" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="7" fill="#ff2a1a"/>
  <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="5" fill="#ff2a1a" stroke="#111" stroke-width="2"/>
  <text x="${L}" y="${H - 18}" class="m" font-size="12">${fmt(days[0].date)}</text>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" class="m" font-size="12">${fmt(days[Math.floor(days.length / 2)].date)}</text>
  <text x="${W - R}" y="${H - 18}" text-anchor="end" class="m" font-size="12">${fmt(days[days.length - 1].date)}</text>
</svg>
`;
mkdirSync('assets', { recursive: true });
writeFileSync('assets/activity.svg', svg);
console.log(`wrote assets/activity.svg · ${total} contributions in ${DAYS} days`);
