# FinQ — Personal Finance Dashboard

A personal finance dashboard to track income, expenses, and savings goals. Built with **HTML, CSS, vanilla JavaScript, and Chart.js**. Fully responsive, with **Light, Dark, and System** themes.

## Screenshots

### Desktop

<p>
  <img src="docs/desktop-light.png" alt="FinQ dashboard in light theme on desktop" width="49%">
  <img src="docs/desktop-dark.png" alt="FinQ dashboard in dark theme on desktop" width="49%">
</p>

### Mobile

<p>
  <img src="docs/mobile-light.png" alt="FinQ dashboard in light theme on mobile" width="24%">
  <img src="docs/mobile-dark.png" alt="FinQ dashboard in dark theme on mobile" width="24%">
</p>

## Features

- Add, search, filter, sort, and delete income/expense transactions
- Dashboard with income vs. expenses chart, spending gauge, recent activity, and monthly category summary
- **My Goals:** create savings goals, add funds, and track progress
- Analytics page with category breakdown and monthly cash-flow trend
- Multiple local profiles (switch, add, log out), each with its own data
- Export transactions to **CSV** (opens in Excel/Sheets); import CSV or JSON
- Light / Dark / System theme (Settings → Appearance)
- Responsive layout: sidebar on desktop and floating bottom navigation on mobile
- Keyboard shortcuts: `/` search, `N` new transaction, `Esc` close

## Tech stack

HTML5 · CSS3 (custom properties, Grid, Flexbox) · JavaScript (ES6+) · Chart.js · localStorage

## Run locally

No build step is required. Open `index.html` in a browser, or use the VS Code **Live Server** extension.

An internet connection is needed for Google Fonts and Chart.js (loaded from a CDN).

## Project structure

```text
FinQ/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── docs/
│   ├── desktop-light.png
│   ├── desktop-dark.png
│   ├── mobile-light.png
│   └── mobile-dark.png
├── README.md
└── LICENSE
```

## Data & privacy

All data stays in your browser's `localStorage`; there is no backend. Profiles are a local convenience for separating data, **not real authentication** — anyone using the same browser can switch to any profile. Clearing site data removes everything, so use Export CSV to back up.

## Known limitations

- Profiles cannot be deleted yet
- Adding funds to a goal does not create a transaction
- Importing the same file twice creates duplicate transactions

## Possible future improvements

- Edit transactions
- Budgets per category
- Recurring transactions
- Backend with real authentication

## License

MIT
