# Timetable Generator – University & School Web App

A modern, responsive, and gorgeous web-based scheduling platform that uses state-of-the-art **Genetic Algorithms (GA)** to evolve conflict-free timetables for universities and schools alike.

Choose between two modes:
- 🎓 **University Mode** — Batches, subjects, professors, classrooms, and labs
- 🏫 **School Mode** — Classes, subjects, teachers, and weekly period distribution

Inspired by a warm pastry, cream, and soft pastel orange color palette, the UI features responsive dashboards, dynamic form inputs, live evolutionary generation reports, and high-quality browser downloads.

---

## 🎨 Design Tokens

- **Background**: Soft Warm Cream (`#FFF8EE`)
- **Card Backgrounds**: Pure White (`#FFFFFF`) / Light Beige (`#FFFDF9`)
- **Primary Accents**: Pastel Orange (`#F4A261`) & Soft Muted Sand (`#F9C784`)
- **Accent Bold**: Terracotta Peach (`#E76F51`)
- **Borders & Grid**: Cream Rose (`#F2E4D5`)
- **Shadows**: Warm ambient glow (`rgba(244, 162, 97, 0.08)`)
- **Borders Radius**: Smooth rounded corners (`20px` to `24px`)
- **Typography**: `Poppins` sans-serif (Google Fonts)

---

## 🚀 How to Run Locally

### Prerequisites

- Python 3.8+
- pip

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lekhana526/Timetable-Generator.git
   cd Timetable-Generator
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask app:**
   ```bash
   python app.py
   ```

4. **Open in browser:**
   ```
   http://localhost:5000
   ```

---

## 🧬 How the Genetic Algorithm Works

Modern schedule creation is an NP-hard problem. This app solves it using optimization cycles (Generations):

1. **Chromosome Representation**: Timetables are represented as a mapping of batch/class cells. University periods are divided into Theory slots (morning lectures) and Lab slots (continuous afternoon lab blocks).
2. **Hard Constraints (Penalty: 100 points)**:
   - *Professor/Teacher collision*: No lecturer can teach two classes at the same hour.
   - *Room double-booking*: No lecture room or lab can host more than one class at the same hour.
3. **Soft Constraints (Penalty: 5 points)**:
   - *Idle periods*: Student schedules shouldn't contain long break blocks or empty spaces.
   - *Subject density*: Instructors shouldn't teach consecutive periods of the same topic.
   - *Topic limits*: Batch subjects are capped at 2 hours maximum per day.
4. **Crossover & Mutation**:
   - The top 10% best schedules are directly preserved (Elitism).
   - Remaining variations are produced via random chromosome joins.
   - Mutation swaps periods to search for better placements.
5. **Generations**: Loops for 50–80 cycles or until a zero-clash structure is achieved.

---

## 📊 Features

### 🎓 University Mode
- Configure batches with theory subjects (credits) and lab sessions
- Theory rooms and lab rooms management
- Group support for parallel sections
- Lab sessions automatically assigned to continuous afternoon blocks

### 🏫 School Mode
- Configure multiple classes (e.g. Grade 6-A, Grade 7-B)
- Assign subjects, teachers, and weekly period counts per class
- Teacher timetable view — see any teacher's full weekly schedule
- Automatic clash detection across all classes

### 🛠️ Shared Features
- **Interactive Landing Hero**: Animated SVG stat cards highlighting key metrics
- **Dashboard**: Live count tracker for classes, teachers, rooms, and generation history
- **Load Demo Data**: One-click preset fill with sample university/school data
- **Weekly Schedule Sheets**: Color-coded cards reflecting courses, lecturers, and rooms
- **Responsive Navigation**: Sidebar drawer and mobile slide-down menu toggles
- **Dark Mode**: Full CSS variable dark-mode toggle
- **Export Formats**:
  - 📄 **PDF Export** — `html2pdf.js` landscape document capture
  - 📊 **Excel Export** — Multi-sheet `.xlsx` via SheetJS (one sheet per class/teacher)
  - 🖨️ **Print Dialog** — `@media print` preformatted styles

---

## 🗂️ Project Structure

```
Timetable-Generator/
├── app.py                  # Flask backend & API routes
├── timetable_engine.py     # University Genetic Algorithm engine
├── school_engine.py        # School Genetic Algorithm engine
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Single-page frontend
└── static/
    ├── css/
    │   └── styles.css      # All styles & dark mode
    ├── js/
    │   ├── app.js          # University timetable logic
    │   └── school.js       # School timetable logic
    └── assets/
        └── hero.png        # Hero section image
```

---

## 🌐 Deployment (Render)

This app is production-ready for [Render](https://render.com):

1. Push this repo to GitHub
2. Go to Render → **New → Web Service** → Connect your repo
3. Set the following:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Click **Deploy**!

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| Algorithm | Custom Genetic Algorithm |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| PDF Export | html2pdf.js |
| Excel Export | SheetJS (XLSX) |
| Fonts | Google Fonts — Poppins |
| Icons | Font Awesome 6 |
| Deployment | Gunicorn + Render |
