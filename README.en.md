<div align="center">

<img src="public/logo-stacked.svg" alt="Alquiler Pro" width="180" />

# Alquiler Pro

**Simple, clear, tailor-made rental management.**
Properties, buildings, tenants, payments, receipts and reports in one place.

[![Version](https://img.shields.io/badge/version-1.3.0-b8962e)](CHANGELOG.md)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](docs/DEPLOY.md)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](LICENSE)

[Español](README.md) · **English**

<img src="docs/images/home.png" alt="Alquiler Pro home screen with KPIs, properties grouped by building and an activity log" width="900" />

<sub>Screenshots use fictitious demo data. The app interface is in Spanish.</sub>

</div>

---

## What is Alquiler Pro?

Alquiler Pro is a web app for **landlords and property managers** who need to know, at a glance, **who paid, who owes and how much** — without spreadsheets, notebooks or lost history.

You register your buildings, properties and tenants; record payments (one month or several at once); and the app shows the true standing of every account, produces PDF receipts and reports ready to send to your client, and keeps a log of what was done and by whom.

## Who is it for?

| If you are… | It helps you… |
|---|---|
| A landlord with several units | See on one screen which tenants are up to date, pending or late. |
| A building or residential manager | Group units by building and track occupancy and total rent. |
| A small or mid-size real-estate agency | Work as a team on the same data and audit who changed what. |
| Someone inheriting a rental portfolio | Fix the history (pending or "void" months) without losing information. |

## Key features

| Area | What you get |
|---|---|
| **Home** | KPIs (collected this year, overdue amount, occupancy, collection rate), search and filters, activity log, payment alerts. |
| **Properties** | Create and edit, physical details, rent, optional tenant in the same form, **annual increase with first-increase date**, 12-month yearly status. |
| **Buildings** | Name and address, detail page with units, occupancy, total rent and arrears; properties take the building address. |
| **Tenants** | Active and **former** (history with period and payments), unlink without deleting anything, per-tenant report. |
| **Payments** | Pay one month or **several at once**, partial payments, edit payments, **pending** or **void** (not charged) months. |
| **Finanzas** (Finance) | Collected by month, building and tenant, amount pending, biggest debts, yearly history and CSV export. |
| **Utilities** | Gas, electricity and water readings with consumption and cost calculation; paid / pending tracking. |
| **Documents** | **PDF receipts, payment reports and collection letters** with your branding, details and signature; the letter uses a template with variables you customise. |
| **Team** | Several accounts working on the same data, with an owner and members. |
| **Traceability** | Activity log: who recorded, edited, deleted or printed, and when. |

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/images/properties.png" alt="Property detail" /><br/><sub><b>Property:</b> tenant, yearly status and payments. Striped grey months are "void".</sub></td>
    <td width="50%"><img src="docs/images/properties-edit-months.png" alt="Edit months" /><br/><sub><b>Edit months:</b> mark months as pending or void in bulk.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/images/pay-several-months.png" alt="Pay several months" /><br/><sub><b>Pay several months</b> in one step, with an optional receipt.</sub></td>
    <td><img src="docs/images/property-picker.png" alt="Searchable property picker" /><br/><sub><b>Property search</b> by name, building, address or tenant.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/images/buildings.png" alt="Buildings" /><br/><sub><b>Buildings:</b> units, occupancy and rent.</sub></td>
    <td><img src="docs/images/tenants-former.png" alt="Former tenants" /><br/><sub><b>Former tenants:</b> history with their payments.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/images/report-pdf.png" alt="PDF payment report" /><br/><sub><b>Payment report</b> as a PDF to send to your client.</sub></td>
    <td><img src="docs/images/receipt-pdf.png" alt="PDF receipt" /><br/><sub><b>Receipt</b> with your branding and signature.</sub></td>
  </tr>
</table>

## How it works

1. **Set up your space.** Sign up and log in; in Settings → Invoice set the business name, contact details and signature used in your PDFs.
2. **Register your properties.** Create buildings (optional), add properties with their rent and assign each one its tenant.
3. **Collect.** From Home or from a property, record the payment of one or several months. The app offers the receipt (*Yes, print* / *Not now*).
4. **Check the standing.** Each property shows whether it is **up to date**, **pending** or **late**, and exactly which months are owed.
5. **Correct and share.** Edit payments, mark months pending or void, produce PDF reports and work as a team; everything is kept in the activity log.

### How the payment status is calculated

The app checks **month by month**, from the tenant's move-in until today. **Past** months without a full payment are the ones "owed"; the current month is still being collected.

| Status | When | Example (today is October) |
|---|---|---|
| 🟢 **Up to date** | No past month is owed (only the current month may be missing). | "Current month (oct 2026) to pay" |
| 🟡 **Pending** | One past month is owed, normally the previous one. | "Owes sep 2026" |
| 🔴 **Late** | Two or more past months are owed. | "Owes jul – sep 2026 (3 months)" |

Months marked **void** (never charged and never will be: vacant unit, special agreement…) **do not count** as debt nor in the collection rate.

## Tech stack

React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · Supabase (PostgreSQL, Auth, Row Level Security) · jsPDF · date-fns · lucide-react · Vercel.

## Quick start

**Requirements:** Node.js 18+ and a [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/W4773/rental-management-system.git
cd rental-management-system
npm install

cp .env.example .env        # then fill in your Supabase credentials
npm run dev                  # http://localhost:5173
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app uses the **`rental`** schema in Supabase. Migrations live in [`supabase/migrations`](supabase/migrations) and are explained, in order, in [docs/DATABASE.md](docs/DATABASE.md). To publish on Vercel follow [docs/DEPLOY.md](docs/DEPLOY.md).

## Documentation

| Document | Contents |
|---|---|
| [User guide](docs/USER_GUIDE.en.md) | Step by step for every screen and flow. |
| [Architecture](docs/ARCHITECTURE.en.md) | How the app is built. |
| [Database & migrations](docs/DATABASE.md) | Tables, security and migration order. |
| [Deployment](docs/DEPLOY.md) | Vercel + Supabase. |
| [Roadmap](docs/ROADMAP.en.md) | What exists, what is next and what is under evaluation. |
| [Changelog](CHANGELOG.md) | Version history (in Spanish). |

## Roadmap

**Now (v1.x):** month-by-month payment status · edit and void months · buildings · team · activity log · PDF reports and receipts.
**Next:** apply annual increases automatically · late-payment reminders by WhatsApp and email · Excel export · contracts and deposits · permission roles · mobile app (PWA).
**Later:** tenant portal · online payments · fiscal receipts (NCF, Dominican Republic) · multi-currency · public API.

Details in [docs/ROADMAP.en.md](docs/ROADMAP.en.md).

## Security & privacy

- Supabase Auth plus **Row Level Security** on every table: each team only sees its own data.
- The front end only uses the public key (*anon key*); never put the `service_role` key in code or in the repository.
- This repository must not contain real customer data (backups and local files are in `.gitignore`).
- Found a vulnerability? Read [SECURITY.md](SECURITY.md).

## Support & contact

**Optimard** — tailor-made digital solutions.
✉️ [optimard@innovaflowtech.com](mailto:optimard@innovaflowtech.com) · 💬 WhatsApp [+1 (809) 710-6760](https://wa.me/18097106760)

## License

© 2026 Optimard. All rights reserved. Proprietary software: see [LICENSE](LICENSE).
