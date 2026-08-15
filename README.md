# OurPICU — Pediatric ICU Management System

A comprehensive PICU (Pediatric Intensive Care Unit) management application built with **React + Vite** and powered by **Supabase**.

> Originally developed for Patan Academy of Health Sciences, Nepal.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Supabase Setup](#supabase-setup)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Permissions (RLS)](#permissions-rls)
- [Medical Calculators](#medical-calculators)
- [Export](#export)
- [Admin Account Setup](#admin-account-setup)
- [Customization Guide](#customization-guide)
- [License](#license)

---

## Overview

OurPICU is a single-application clinical tool for managing PICU patients, tracking fluid balance, calculating drug dosages, recording investigations, and running evidence-based clinical scores. It replaces a previous Firebase-based version with Supabase for better SQL support, Row-Level Security, and self-hosted capabilities.

**Key design decisions:**
- React/Vite SPA for maintainable, component-based architecture
- Supabase Auth (email/password + Google OAuth + Magic Links)
- Supabase PostgreSQL for structured, relational data
- Supabase Storage for patient images (500KB limit)
- Row-Level Security (RLS) for proper access control (replaces hardcoded email whitelist)

---

## Features

### Public Site
- Landing page with app introduction
- Education Hub: embedded YouTube videos, teaching notes, scored MCQs
- About page

### Authentication & Authorization
- Email/password sign-in and sign-up
- Google OAuth sign-in
- Magic link (passwordless) sign-in
- Role-based access: `admin`, `doctor`, `nurse`, `viewer`
- RLS policies enforce permissions at database level

### Dashboard
- Bed occupancy overview (active/total/alerts)
- FO% (Fluid Overload) visual alerts
- Quick-add patient button

### Patient Management
- Add/discharge patients with bed assignment
- Patient detail view with metadata summary
- Fluid balance tracking per patient
- Medication administration records
- Lab investigations tracking
- Clinical notes (progress, ward rounds, procedures, nursing)
- Image upload (radiology, ultrasound, clinical photos)

### Fluid Balance
- ISL (Insensible Fluid Loss) age-based calculator
- Ventilation adjustment (HFNC, MV humidified, MV HME)
- Fever correction (+12% per °C above 37)
- CRRT adjustment
- Daily I/O tracking with input/drain breakdown
- Cumulative FO% calculation
- 14-day history table
- Color-coded FO% alerts (green/amber/red)

### Drug Library
- 15+ pre-loaded PICU emergency and routine drugs
- Weight-based dose calculation
- Drug information: route, frequency, max dose, preparation instructions
- Per-patient medication tracking

### Clinical Tools Workspace
- Shared pediatric patient context for age, weight, sex, diagnosis, and renal/dialysis status
- Searchable alphabetized drug-reference starter set with weight-based calculations, maximum-dose caps, renal/dialysis prompts, and Teddy Bear-linked citations
- Structured COMFORT-B, SOS-PD, PSSS, SBS, RASS, NIPS, CRIES, FLACC, FACES, CAPD, and pCAM-ICU assessment prompts
- POCUS learning/documentation topics for lung, heart, cranium, VExUS, bronchoscopy, vascular access, and transcranial Doppler
- Guideline-linked pathways for PALS emergencies, pediatric sepsis, pediatric ARDS, asthma, seizures, and shock

All clinical tools are decision-support aids. They require verification against current institutional protocols, licensed references, patient-specific data, and supervising clinician judgment.

### Medical Calculators (10 tools)
| Calculator | Use |
|---|---|
| ISL Calculator | Insensible fluid loss with vent/fever/CRRT adjustments |
| Drug Dose Calculator | Weight-based dosing with preparation instructions |
| Ventilator Settings | Initial vent settings by age and indication |
| PELOD-2 | Pediatric mortality prediction score |
| RAI (Renal Angina Index) | AKI risk stratification |
| Nutrition (Schofield) | Caloric, protein, fluid targets; enteral/parenteral |
| PALS Emergency | Emergency drug doses and equipment sizes |
| PRISM-IV | Pediatric Risk of Mortality score |
| Phoenix Sepsis Score | 2024 pediatric sepsis criteria |
| **Growth Chart** | WHO/CDC growth percentiles — weight, height, head circumference, BMI by age & sex |

### Export Centre
- Export all active patients to Excel (.xlsx)
- Export single patient with all sub-records (fluid balance, drugs, labs, notes)
- Date-range export for fluid balance across patients
- Uses SheetJS (xlsx) library

### Admin Panel (`admin` role only)
- Profile management
- PICU settings (unit name, bed count)
- Drug library CRUD
- Education content management (videos, notes, MCQs)
- Social media links

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6 |
| Routing | React Router 7 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email, Google OAuth, Magic Link) |
| Storage | Supabase Storage |
| Excel Export | SheetJS (xlsx) |
| Growth Charts | WHO/CDC LMS reference data |
| Icons | Lucide React |
| Fonts | DM Sans, DM Serif Display (Google Fonts) |

---

## Project Structure

```
ourpicu-app/
├── public/
│   └── favicon.svg
├── sql/
│   └── migration.sql          # Full database migration (tables + RLS + triggers + admin seed)
├── src/
│   ├── lib/
│   │   └── supabase.js        # Supabase client initialization
│   ├── context/
│   │   └── AuthContext.jsx    # Auth provider with all auth methods
│   ├── components/
│   │   ├── AppLayout.jsx      # Private app layout (sidebar + content)
│   │   ├── PublicLayout.jsx   # Public site layout (header + content)
│   │   └── Sidebar.jsx        # Navigation sidebar
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── public/
│   │   │   ├── Home.jsx
│   │   │   ├── Education.jsx
│   │   │   └── About.jsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── patients/
│   │   │   ├── PatientList.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   └── PatientForm.jsx
│   │   ├── fluidBalance/
│   │   │   └── FluidBalance.jsx
│   │   ├── drugs/
│   │   │   └── DrugLibrary.jsx
│   │   ├── investigations/
│   │   │   └── Investigations.jsx
│   │   ├── notes/
│   │   │   ├── ClinicalNotes.jsx
│   │   │   └── Images.jsx
│   │   ├── calculators/
│   │   │   ├── CalculatorHome.jsx
│   │   │   ├── ISLCalc.jsx
│   │   │   ├── DrugCalc.jsx
│   │   │   ├── VentCalc.jsx
│   │   │   ├── PELODCalc.jsx
│   │   │   ├── RAICalc.jsx
│   │   │   ├── NutritionCalc.jsx
│   │   │   ├── PALSCalc.jsx
│   │   │   ├── PRISMCalc.jsx
│   │   │   ├── PhoenixCalc.jsx
│   │   │   └── GrowthChartCalc.jsx
│   │   ├── education/
│   │   │   └── PrivateEducation.jsx
│   │   ├── export/
│   │   │   └── ExportCenter.jsx
│   │   └── admin/
│   │       └── AdminPanel.jsx
│   ├── App.jsx                 # Router configuration
│   ├── main.jsx                # Entry point
│   └── index.css               # Complete design system CSS
├── .env.example
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd ourpicu-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=***

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Build

```bash
npm run build
# Output: dist/ folder, ready for deployment
```

---

## Supabase Setup

### 1. Create Supabase Project
Go to [supabase.com](https://supabase.com) → New Project → fill in details.

### 2. Run Migration
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `sql/migration.sql`
4. Paste and click **Run**

This creates all tables, indexes, RLS policies, triggers, and the `user_role` enum.

### 3. Configure Auth
1. Go to **Authentication → Providers**
2. Enable **Email** provider (default)
3. To enable Google OAuth: enable **Google** provider, add Client ID/Secret
4. To enable Magic Link: it's built into the Email provider (no extra config)

### 4. Set Up Storage
1. Go to **Storage**
2. Create a new bucket named `patient-images`
3. Set it to **Public**
4. Set file size limit to **524288** (500KB)

### 5. Set Up Admin Account
See [Admin Account Setup](#admin-account-setup) below.

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://abc123.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Get these from: Supabase Dashboard → Settings → API

---

## Database Schema

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profiles, extends auth.users | role, full_name, designation, hospital, beds |
| `education` | Single-row: videos[], teaching_notes[], mcqs[], social_media{} | All JSONB content |
| `patients` | Core patient records | bed_number, age, weight, diagnosis, latest_fo, active |
| `fluid_balance` | Daily fluid balance per patient | date, total_input, total_output, fluid_overload_pct, isl_daily |
| `patient_drugs` | Medications per patient | drug_name, dose_per_kg, frequency, route |
| `investigations` | Lab results per patient | date, lab_values (JSONB) |
| `patient_notes` | Clinical notes per patient | text, type (progress/ward_round/procedure/nursing) |
| `patient_images` | Uploaded image metadata | storage_url, type, description |
| `calc_results` | Saved calculator results | type (vexus/prism/phoenix), data (JSONB) |
| `drug_library` | Global drug reference | name, dose, max, freq, route, prep |

### Storage Bucket

| Bucket | Purpose | Limit |
|---|---|---|
| `patient-images` | Patient radiology/ultrasound/clinical images | 500KB per file |

---

## Authentication

All auth goes through Supabase Auth. Available methods:

1. **Email/Password**: Standard sign-in/sign-up
2. **Google OAuth**: One-click sign-in with Google account
3. **Magic Link**: Passwordless — enter email, click link in inbox

New users automatically get a `profiles` row with `doctor` role via the `handle_new_user()` trigger.

---

## Permissions (RLS)

Role-Based Access Control via PostgreSQL Row-Level Security:

| Role | Permissions |
|---|---|
| `admin` | Full access: manage patients, drugs, education, settings, promote users |
| `doctor` | Read/write patients and clinical data; cannot access admin panel |
| `nurse` | Read/write clinical data; limited settings access |
| `viewer` | Read-only access to patient data |

All tables have RLS enabled. The admin panel UI is also gated at the React level (`isAdmin` check).

---

## Medical Calculators

All calculators run client-side (no backend needed). The clinical formulas are embedded in the React components.

### Growth Chart Calculator
Uses WHO/CDC reference data with LMS (Lambda-Mu-Sigma) methodology:
- **Weight-for-age**: 0-19 years (boys & girls)
- **Height-for-age**: 0-19 years (boys & girls)
- **Head circumference-for-age**: 0-5 years (boys & girls)
- **BMI-for-age**: 2-19 years (derived from weight & height z-scores)
- Inputs: Date of Birth, Sex, Weight, Height, Head Circumference
- Outputs: Z-score, Percentile, Clinical Category for each measurement

**Disclaimer:** These calculators are clinical decision-support tools. They should not be used as the sole basis for clinical decisions. Always verify with institutional protocols and clinical judgment.

---

## Export

Excel exports use SheetJS (xlsx library). Three export modes:

1. **All Patients**: Summary of all active patients
2. **Single Patient**: Full export including fluid balance, drugs, labs, notes, and calc results
3. **Date Range**: Fluid balance data across all patients within a date range

---

## Admin Account Setup

**Admin account setup:**

Create an administrator using a secure, organization-controlled email address through the normal signup flow or Supabase Dashboard. Do not commit passwords, access tokens, or real administrator emails to this repository.

After the user has been created, promote the account from the Supabase SQL Editor using its user ID or a locally supplied environment variable:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<approved-user-uuid>';
```

Verify by signing in and confirming that the Admin Panel appears. Rotate any credentials that may previously have been present in repository history.

---

## Customization Guide

### Change Colors
Edit CSS variables in `src/index.css` (lines starting with `--navy`, `--teal`, `--blue`, etc.).

### Change Doctor Name / Hospital
Via the Admin Panel → Profile tab, or directly in Supabase `profiles` table.

### Add/Remove Drugs
Via the Admin Panel → Drug Library tab, or directly in `drug_library` table.

### Change Navigation
Edit `NAV_ITEMS` array in `src/components/Sidebar.jsx`.

### Add/Remove Calculators
Edit the `CALCULATORS` array in `src/pages/calculators/CalculatorHome.jsx` and add/remove the corresponding component file.

### Deploy to Production
```bash
npm run build
# Deploy the dist/ folder to Vercel, Netlify, Cloudflare Pages, or any static host
```

For Vercel: `vercel --prod` after installing Vercel CLI.
For Netlify: drag `dist/` folder, or connect git repo with build command `npm run build`.

---

## License

MIT License. Free for academic and clinical use.

---

*Built with ❤️ for Patan Academy of Health Sciences, Nepal.*
