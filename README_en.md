English | [简体中文](./README.md)

# 💼 Job-Hop Calculator

This is a specialized **job-hopping cost-effectiveness analyzer and city cost-of-living comparison tool** designed for professionals. 
It helps you accurately calculate your real after-tax income, compare the living costs of two different cities, and evaluate whether jumping ship is truly "worth it" through intuitive charts.

## ✨ Core Features

- 💰 **Precise Tax & Social Insurance Calculation**: Automatically calculates your "pre-tax salary" and "real after-tax income" based on the latest tax rates and social insurance brackets (supports custom contribution rates and separate taxation for year-end bonuses).
- 🏙️ **City Cost of Living Comparison**: Built-in data for major Chinese cities (Beijing, Shanghai, Guangzhou, Shenzhen, Hangzhou, Chengdu, etc.). Comprehensively compares "hidden costs" including rent, food, commute, and utilities before and after changing jobs.
- 📊 **Visualized Cost-Effectiveness Analysis**: Intuitively displays salary structures, savings rates, and future savings forecasts through multi-dimensional radar and line charts.
- ☁️ **Supabase Cloud Sync**: Supports seamless data synchronization across multiple devices. Once configured on a PC, simply scan the QR code with your phone to load data instantly. Supports 1-click export/import for backups.
- 🎨 **Minimalist Cyberpunk Design**: Features a Glassmorphism and neon-gradient UI that is fully responsive for both mobile and desktop browsing.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **UI & Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid)
- **Icons**: Lucide-React
- **Charts**: Recharts
- **Cloud Sync**: Supabase (PostgreSQL)
- **Deployment**: GitHub Pages (Auto-build)

## 🚀 Quick Start (Local Setup)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jasonesque/Job-Hop-Calculator.git
   cd job-hop-calculator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local dev server**:
   ```bash
   npm run dev
   ```

4. **Build for production** (if self-hosting):
   ```bash
   npm run build
   ```

## ☁️ Cloud Sync Configuration Guide (Optional)

This project natively supports synchronizing your calculator configuration to your personal Supabase database, enabling multi-device connectivity via QR code scanning:

1. Register and create a free [Supabase](https://supabase.com/) project.
2. Navigate to the bottom of the left sidebar and click **⚙️ Settings** -> **API**.
3. Copy the **Project URL** (Note: only the root domain is needed, do not include suffixes like `/rest/v1/`).
4. Copy the **Publishable key** (usually starts with `sb_publishable_`).
5. **Crucial Step (Table Creation)**: Go to the **SQL Editor** in Supabase, create a New Query, and execute the following SQL to create the sync table and grant access:
   ```sql
   CREATE TABLE IF NOT EXISTS jobhop_sync (
     id text primary key,
     current_data jsonb,
     target_data jsonb,
     updated_at timestamptz
   );
   
   ALTER TABLE jobhop_sync DISABLE ROW LEVEL SECURITY;
   GRANT ALL ON TABLE jobhop_sync TO anon;
   ```
6. Return to the calculator webpage, click the personal module in the bottom left corner, fill in your URL and Key, and save. Enjoy seamless cloud synchronization!

## 📄 License

This project is licensed under the MIT License. You are free to use, modify, and distribute it.
