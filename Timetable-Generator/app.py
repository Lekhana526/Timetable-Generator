import os
import sys
from flask import Flask, jsonify, request, render_template, send_from_directory
from timetable_engine import run_genetic_algorithm
from school_engine import run_school_genetic_algorithm

app = Flask(__name__, template_folder='templates', static_folder='static')

# Ensure directories exist
os.makedirs(os.path.join(app.root_path, 'templates'), exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'static', 'css'), exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'static', 'js'), exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'static', 'assets'), exist_ok=True)

# Default batch data matching single class preset schema
DEFAULT_BATCH_DATA = {
    "CSE_DD": {
        "theory": [
            {"code": "CS3006", "name": "Probability & Statistics", "teacher": "Anitha", "group": "", "credits": 4},
            {"code": "CS3000", "name": "Theory of Computation", "teacher": "Meena", "group": "", "credits": 3},
            {"code": "CS3002", "name": "Computer Architecture", "teacher": "Ravi", "group": "", "credits": 3},
            {"code": "DS3000", "name": "Database Systems", "teacher": "Meena", "group": "", "credits": 3}
        ],
        "labs": [
            {"code": "CSL3001", "name": "Design Lab", "teacher": "Anitha", "group": ""},
            {"code": "CSL3002", "name": "COA Lab", "teacher": "Ravi", "group": ""},
            {"code": "CSL3003", "name": "DBMS Lab", "teacher": "Rahul", "group": ""}
        ]
    }
}

DEFAULT_CONFIG = {
    "days": 5,
    "theory_slots": 4,
    "lab_slots": 3,
    "theory_rooms": ["R101", "R102"],
    "lab_rooms": ["LAB1", "LAB2"],
    "population_size": 50,
    "generations": 50,
    "mutation_rate": 0.5
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/presets")
def get_presets():
    """Returns default presets so they can be loaded into the UI"""
    return jsonify({
        "batch_data": DEFAULT_BATCH_DATA,
        "config": DEFAULT_CONFIG
    })

@app.route("/api/generate", methods=["POST"])
def generate():
    """Runs the genetic algorithm based on user inputs"""
    try:
        data = request.json or {}
        batch_data = data.get("batch_data")
        config = data.get("config", {})

        if not batch_data:
            return jsonify({"error": "Missing batch data"}), 400

        # Validate and clean batch data — theory and labs are now lists of dicts
        clean_batch_data = {}
        for batch_name, details in batch_data.items():
            clean_theory = []
            clean_labs = []

            # Theory: list of {code, name, teacher, group, credits}
            for entry in details.get("theory", []):
                if isinstance(entry, dict) and entry.get("code") and entry.get("teacher"):
                    clean_theory.append({
                        "code": str(entry.get("code", "")),
                        "name": str(entry.get("name", "")),
                        "teacher": str(entry.get("teacher", "")),
                        "group": str(entry.get("group", "")),
                        "credits": int(entry.get("credits", 3))
                    })

            # Labs: list of {code, name, teacher, group}
            for entry in details.get("labs", []):
                if isinstance(entry, dict) and entry.get("code") and entry.get("teacher"):
                    clean_labs.append({
                        "code": str(entry.get("code", "")),
                        "name": str(entry.get("name", "")),
                        "teacher": str(entry.get("teacher", "")),
                        "group": str(entry.get("group", ""))
                    })

            clean_batch_data[batch_name] = {
                "theory": clean_theory,
                "labs": clean_labs
            }

        # Run the engine
        try:
            result = run_genetic_algorithm(clean_batch_data, config)
            return jsonify(result)
        except ValueError as val_err:
            return jsonify({
                "error": "Genetic Algorithm constraint violation",
                "details": str(val_err)
            }), 422
        except Exception as engine_err:
            return jsonify({
                "error": "Engine error occurred during timetable generation",
                "details": str(engine_err)
            }), 500

    except Exception as e:
        return jsonify({
            "error": "Failed to parse generation request details",
            "details": str(e)
        }), 400

# ─── School Timetable Routes ────────────────────────────────────────────────

# Default school demo data
DEFAULT_SCHOOL_DATA = {
    "class_data": {
        "Grade 6-A": [
            {"subject": "Mathematics",  "teacher": "Mr. Kumar",   "weekly_periods": 5},
            {"subject": "English",      "teacher": "Ms. Rao",     "weekly_periods": 4},
            {"subject": "Science",      "teacher": "Mr. Sharma",  "weekly_periods": 4},
            {"subject": "Social Studies","teacher": "Ms. Verma",  "weekly_periods": 3},
            {"subject": "Hindi",        "teacher": "Ms. Priya",   "weekly_periods": 3},
            {"subject": "Computer",     "teacher": "Mr. Vijay",   "weekly_periods": 2}
        ],
        "Grade 6-B": [
            {"subject": "Mathematics",  "teacher": "Ms. Divya",   "weekly_periods": 5},
            {"subject": "English",      "teacher": "Ms. Rao",     "weekly_periods": 4},
            {"subject": "Science",      "teacher": "Mr. Sharma",  "weekly_periods": 4},
            {"subject": "Social Studies","teacher": "Mr. Ganesh", "weekly_periods": 3},
            {"subject": "Hindi",        "teacher": "Ms. Priya",   "weekly_periods": 3},
            {"subject": "Computer",     "teacher": "Mr. Vijay",   "weekly_periods": 2}
        ],
        "Grade 7-A": [
            {"subject": "Mathematics",  "teacher": "Mr. Kumar",   "weekly_periods": 5},
            {"subject": "English",      "teacher": "Mr. Anand",   "weekly_periods": 4},
            {"subject": "Science",      "teacher": "Ms. Lakshmi", "weekly_periods": 4},
            {"subject": "Social Studies","teacher": "Ms. Verma",  "weekly_periods": 3},
            {"subject": "Hindi",        "teacher": "Ms. Deepa",   "weekly_periods": 3},
            {"subject": "Computer",     "teacher": "Mr. Vijay",   "weekly_periods": 2}
        ]
    },
    "config": {
        "days": 5,
        "periods_per_day": 7,
        "population_size": 50,
        "generations": 80,
        "mutation_rate": 0.35
    }
}

@app.route("/api/school/presets")
def school_presets():
    """Returns default demo data for the school timetable form."""
    return jsonify(DEFAULT_SCHOOL_DATA)

@app.route("/api/school/generate", methods=["POST"])
def school_generate():
    """Runs the school genetic algorithm based on user inputs."""
    try:
        data = request.json or {}
        class_data = data.get("class_data")
        config     = data.get("config", {})

        if not class_data:
            return jsonify({"error": "Missing class data"}), 400

        # Validate and clean class data
        clean_class_data = {}
        for cls_name, subjects in class_data.items():
            cls_name = str(cls_name).strip()
            if not cls_name:
                continue
            clean_subjects = []
            for s in subjects:
                if isinstance(s, dict) and s.get("subject") and s.get("teacher"):
                    clean_subjects.append({
                        "subject":        str(s.get("subject", "")).strip(),
                        "teacher":        str(s.get("teacher", "")).strip(),
                        "weekly_periods": max(1, int(s.get("weekly_periods", 1)))
                    })
            if clean_subjects:
                clean_class_data[cls_name] = clean_subjects

        if not clean_class_data:
            return jsonify({"error": "No valid class/subject data provided"}), 400

        try:
            result = run_school_genetic_algorithm(clean_class_data, config)
            return jsonify(result)
        except Exception as engine_err:
            return jsonify({
                "error": "School engine error during timetable generation",
                "details": str(engine_err)
            }), 500

    except Exception as e:
        return jsonify({
            "error": "Failed to parse school generation request",
            "details": str(e)
        }), 400

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template("index.html")

if __name__ == "__main__":
    # Determine port
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting University Timetable Generator server on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
