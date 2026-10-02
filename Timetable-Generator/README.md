# Timetable Generator - University Web App

A modern, responsive, and gorgeous web-based scheduling platform that uses state-of-the-art **Genetic Algorithms (GA)** to evolve conflict-free university schedules for batches, subjects, professors, classrooms, and labs.

Inspired by a warm pastry, cream, and soft pastel orange color palette, the user interface features responsive dashboards, dynamic form inputs, live evolutionary generation reports, and high-quality browser downloads.

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

## 🚀 How to Start the App

The backend is built in **Python Flask** so it runs seamlessly with the python Genetic Algorithm engine.

### Prerequisites

Make sure you have Python 3 installed. You'll need `Flask` installed. Install it via pip:

```bash
pip install flask
```

### Steps to Run

1. Navigate to the project root directory:
   ```bash
   cd c:\Users\cmlekhana\Timetable-Generator
   ```

2. Start the Flask application:
   ```bash
   python app.py
   ```

3. Open your browser and go to:
   [http://localhost:5000](http://localhost:5000)

---

## 🧬 How the Genetic Algorithm Works 

Modern schedule creation is an NP-hard problem. This app solves it using optimization cycles (Generations):

1. **Chromosomes representation**: Timetables are represented as a mapping of batch cells. Periods are divided into Theory slots (morning lectures) and Lab slots (continuous afternoon lab blocks).
2. **Hard Constraints (Penalty: 100 points)**:
   - *Professor collision*: No lecturer can teach two classes at the same hour.
   - *Room double-booking*: No lecture room or lab can host more than one class at the same hour.
3. **Soft Constraints (Penalty: 5 points)**:
   - *Idle periods*: Student schedules shouldn't contain long break blocks or empty spaces.
   - *Subject density*: Instructors shouldn't teach consecutive periods of the same topic.
   - *Topic limits*: Batch subjects are capped at 2 hours maximum per day.
4. **Crossover & Mutation**:
   - The top 10% best schedules are directly preserved (Elitism).
   - Remaining variations are loaded via random chromosome joins.
   - Mutation swaps periods to search for better placements.
5. **Generations**: Loops for 50 cycles or until a zero-clash structure is resolved.

---

## 📊 Features

- **Interactive Landing Hero**: Beautiful animated SVG vector cards highlighting key stats.
- **Resource Inventory Dashboard**: Live count tracker showing enrolled batches, teachers, rooms, and generation history metrics.
- **Dynamic Config Inputs**: Direct list inputs. Hit **Load Demo Data** to instant-fill mock details based on the default university genetic algorithm profile.
- **Weekly Schedule Sheets**: Color-coded cards reflecting courses, lecturers, and room allocations.
- **Responsive Navigation**: Includes side bar drawer controllers and mobile slide-down drop menu toggles.
- **Aesthetic Eye Comfort Mode**: A full CSS variable dark-mode toggle layout.
- **Export Formats**:
  - **PDF Export**: Uses `html2pdf.js` vector capture elements to print landscape documents.
  - **Excel Export**: Parses dynamic HTML rows into worksheets using `XLSX` (SheetJS).
  - **Print Dialog**: Preformatted prints styles using `@media print` tags.
