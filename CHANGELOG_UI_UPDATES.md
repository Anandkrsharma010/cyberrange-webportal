# Changelog: CyberRange UI Modernization & Backend Integration

This document summarizes all user interface (UI) enhancements, database configuration fixes, and workflow improvements implemented across the CyberRange portal (Frontend and Backend repositories).

---

## 1. Frontend: Admin Dashboard Redesign (`Complete_UI_changes` branch)

We modernized the admin panels using a premium dark-themed glassmorphism aesthetic (`backdrop-blur-xl`, `bg-white/[0.02]`, custom gradients, and glowing indicator borders).

### Key Pages Redesigned:

* **Admin Sidebar Layout (`app/admin/layout.tsx`)**
  * Transformed the sidebar navigation to a dark console aesthetic.
  * Added emerald green vertical line indicators to highlight the active menu route.

* **Operations Feed (`app/admin/ops/feed/page.tsx`)**
  * Converted logs and feeds table into a dark grid console with glowing status elements.
  * Replaced the manual text-input field (which previously required copying/pasting UUIDs) with a **dynamic dropdown selector** loaded from the user database via `api.listUsers()`.
  * Integrated assignee updates to automatically patch and save changes in the Postgres database in real-time.

* **Workshop Operations (`app/admin/ops/workshop/page.tsx`)**
  * Refactored manifest lists into premium card components displaying metrics, manifests, and duration.
  * Implemented status-aware glowing lights (Active = Emerald, Pending Audit = Amber, Archived = Rose).

* **Participants Coverage Monitor (`app/admin/participants/page.tsx`)**
  * Built a deployment roster checker displaying enrollment statistics.
  * Created glowing red issue boxes with pulsing warning indicators if user enrollment gaps are discovered.

---

## 2. Backend: Infrastructure & Seeding (`UI-update-compete` branch)

We updated database migrations, cleaned up source trees, and generated realistic development seeds.

### Key Changes:

* **Idempotent Database Migrations (`alembic/versions/`)**
  * Modified Alembic scripts (e.g. constraints, check checks, and table creations) to use `IF NOT EXISTS` or PG `DO $$ BEGIN ... END $$;` blocks.
  * Prevents migration failures if databases are partially initialized.

* **Database Seeding (`seed_participants_data.sql`)**
  * Created mock data for courses, deployments, and participant lists.
  * Configured active testing scenarios:
    1. *AWS Cloud Security* (No users added)
    2. *Wazuh SIEM Lab* (Users missing)
    3. *Active Directory basics* (All users added)

* **Git Ignore Rules (`.gitignore`)**
  * Excluded local SQLite databases (`dev.db`) and WSL virtual environment folders (`.venv2/`) from code commits.
