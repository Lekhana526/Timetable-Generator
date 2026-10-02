/**
 * School Timetable Generator Client Application Logic
 */

let schoolState = {
    presetsFetched: false,
    timetableGenerated: false,
    activeTab: 'school-config',
    generatedTimetable: null,
    selectedClass: null,
    teacherSchedules: {},
    selectedTeacher: null
};

// Document loaded listener for school mode
document.addEventListener("DOMContentLoaded", () => {
    initSchoolApp();
});

function initSchoolApp() {
    setupSchoolRouting();
    setupSchoolFormControls();
    setupSchoolExportHandlers();
    restoreStateOnLoad();
}

/**
 * 1. School Routing / Navigation System
 */
function setupSchoolRouting() {
    const navItems = document.querySelectorAll('.school-sidebar-item, .school-nav-link');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            switchSchoolTab(targetTab);
        });
    });

    const ctaBtn = document.getElementById('school-btn-start-generator');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', () => switchSchoolTab('school-generator'));
    }

    const heroCtaBtn = document.getElementById('school-hero-start-btn');
    if (heroCtaBtn) {
        heroCtaBtn.addEventListener('click', () => switchSchoolTab('school-generator'));
    }
}

function switchSchoolTab(tabId) {
    schoolState.activeTab = tabId;
    if (localStorage.getItem('timetable_generator_mode') === 'school') {
        localStorage.setItem('timetable_generator_tab', tabId);
    }

    // Update sidebar & navbar items
    document.querySelectorAll('.school-sidebar-item, .school-nav-link').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab panels
    document.querySelectorAll('.school-tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(tabId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

/**
 * 2. Form Controls & Dynamic Class Node Creation
 */
function setupSchoolFormControls() {
    const btnAddClass = document.getElementById('school-btn-add-class');
    if (btnAddClass) {
        btnAddClass.addEventListener('click', () => {
            appendSchoolClassCard("", []);
        });
    }

    const btnLoadPresets = document.getElementById('school-btn-load-presets');
    if (btnLoadPresets) {
        btnLoadPresets.addEventListener('click', fetchSchoolPresets);
    }

    const btnSaveDetails = document.getElementById('school-btn-save-details');
    const btnLoadSavedDetails = document.getElementById('school-btn-load-saved-details');
    const btnResetPanel = document.getElementById('school-btn-reset-panel');

    if (btnSaveDetails) {
        btnSaveDetails.addEventListener('click', () => {
            saveSchoolDetails();
        });
    }
    if (btnLoadSavedDetails) {
        btnLoadSavedDetails.addEventListener('click', () => {
            loadSchoolDetails();
        });
    }
    if (btnResetPanel) {
        btnResetPanel.addEventListener('click', () => {
            resetSchoolPanel();
        });
    }

    const form = document.getElementById('school-generator-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitSchoolForm();
        });
    }

    // Toggle view mode: Class Timetable vs Teacher Timetable
    const btnViewClass = document.getElementById('school-btn-view-class');
    const btnViewTeacher = document.getElementById('school-btn-view-teacher');
    const classContainer = document.getElementById('school-class-timetable-view');
    const teacherContainer = document.getElementById('school-teacher-timetable-view');

    if (btnViewClass && btnViewTeacher) {
        btnViewClass.addEventListener('click', () => {
            btnViewClass.style.background = 'var(--primary)';
            btnViewClass.style.color = 'white';
            btnViewTeacher.style.background = 'var(--bg-card)';
            btnViewTeacher.style.color = 'var(--text-secondary)';
            if (classContainer) classContainer.style.display = 'block';
            if (teacherContainer) teacherContainer.style.display = 'none';
        });

        btnViewTeacher.addEventListener('click', () => {
            btnViewTeacher.style.background = 'var(--primary)';
            btnViewTeacher.style.color = 'white';
            btnViewClass.style.background = 'var(--bg-card)';
            btnViewClass.style.color = 'var(--text-secondary)';
            if (classContainer) classContainer.style.display = 'none';
            if (teacherContainer) teacherContainer.style.display = 'block';
        });
    }
}

function appendSchoolClassCard(className = "", subjects = []) {
    const container = document.getElementById('school-class-cards-container');
    if (!container) return;

    const classId = `class-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const card = document.createElement('div');
    card.className = 'batch-box class-node';
    card.id = classId;
    card.setAttribute('data-element-type', 'school-class-node');

    card.innerHTML = `
        <div class="batch-box-header">
            <div class="batch-box-title">
                <i class="fa-solid fa-chalkboard-user text-orange"></i>
                <input type="text" class="batch-name-input school-class-name-input" placeholder="Class Name (e.g. Grade 6-A)" value="${className}" required style="font-weight:bold; border:none; background:transparent; border-bottom:1px dashed var(--primary); padding:2px; color:var(--text-primary); outline:none;">
            </div>
            <button type="button" class="btn-remove-batch remove-class-btn">
                <i class="fa-solid fa-trash-can"></i> Remove Class
            </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h4 style="font-size:13px; color:var(--primary-dark); font-weight:700;"><i class="fa-solid fa-book"></i> Subjects & Teachers</h4>
                    <button type="button" class="btn btn-secondary btn-sm add-subject-btn" style="padding:4px 10px; font-size:12px;">
                        <i class="fa-solid fa-plus"></i> Add Subject
                    </button>
                </div>
                
                <!-- Column Headers matching University style -->
                <div style="display:flex; align-items:center; gap:16px; padding:0 12px 6px 12px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">
                    <div style="flex: 2;">Subject Name</div>
                    <div style="flex: 2;">Teacher Name</div>
                    <div style="width: 120px;">Periods / Week</div>
                    <div style="width: 26px;"></div>
                </div>

                <div class="subjects-editor school-subjects-list" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- Dynamic subject rows injected here -->
                </div>
            </div>
        </div>
    `;

    container.appendChild(card);
    updateSchoolDashboardStats();

    const removeBtn = card.querySelector('.remove-class-btn');
    removeBtn.addEventListener('click', () => {
        if (container.querySelectorAll('.class-node').length > 1) {
            card.remove();
            updateSchoolDashboardStats();
        } else {
            alert("At least one class is required.");
        }
    });

    const addSubBtn = card.querySelector('.add-subject-btn');
    const subjectsList = card.querySelector('.school-subjects-list');

    addSubBtn.addEventListener('click', () => {
        appendSchoolSubjectRow(subjectsList, "", "", 4);
    });

    if (subjects && subjects.length > 0) {
        subjects.forEach(sub => {
            appendSchoolSubjectRow(subjectsList, sub.subject, sub.teacher, sub.weekly_periods);
        });
    } else {
        // Add 2 default empty rows
        appendSchoolSubjectRow(subjectsList, "", "", 4);
        appendSchoolSubjectRow(subjectsList, "", "", 3);
    }
}

function updateSchoolDashboardStats() {
    const classNodes = document.querySelectorAll('[data-element-type="school-class-node"]');
    const statClassesEl = document.getElementById('school-stat-classes');
    const statTeachersEl = document.getElementById('school-stat-teachers');

    if (statClassesEl) {
        statClassesEl.textContent = classNodes.length;
    }

    if (statTeachersEl) {
        const teachersSet = new Set();
        document.querySelectorAll('.school-teacher-input').forEach(input => {
            const val = input.value.trim();
            if (val) teachersSet.add(val.toLowerCase());
        });
        statTeachersEl.textContent = teachersSet.size;
    }
}

function appendSchoolSubjectRow(container, subject = "", teacher = "", periods = 4) {
    const row = document.createElement('div');
    row.className = 'subject-item-row school-subject-row';

    row.innerHTML = `
        <div class="form-group" style="flex: 2;">
            <input type="text" class="school-subject-input" placeholder="Subject Name (e.g. Mathematics)" value="${subject}" required>
        </div>
        <div class="form-group" style="flex: 2;">
            <input type="text" class="school-teacher-input" placeholder="Teacher Name (e.g. Mr. Kumar)" value="${teacher}" required>
        </div>
        <div class="form-group" style="width: 120px;">
            <input type="number" class="school-periods-input" min="1" max="20" placeholder="Periods/wk" value="${periods}" required title="Weekly Periods">
        </div>
        <button type="button" class="btn-remove-subj remove-subject-btn" title="Delete Subject">
            <i class="fa-solid fa-circle-minus"></i>
        </button>
    `;

    container.appendChild(row);
    updateSchoolDashboardStats();

    const tInput = row.querySelector('.school-teacher-input');
    if (tInput) {
        tInput.addEventListener('input', updateSchoolDashboardStats);
    }

    row.querySelector('.remove-subject-btn').addEventListener('click', () => {
        if (container.querySelectorAll('.school-subject-row').length > 1) {
            row.remove();
            updateSchoolDashboardStats();
        } else {
            alert("Each class must have at least one subject.");
        }
    });
}

/**
 * 3. Fetch Presets & Data Submission
 */
function fetchSchoolPresets() {
    fetch('/api/school/presets')
        .then(res => res.json())
        .then(data => {
            const classData = data.class_data;
            const config = data.config;

            // Fill config fields
            if (config) {
                const daysInput = document.getElementById('school-days-input');
                const periodsInput = document.getElementById('school-periods-input');
                if (daysInput) daysInput.value = config.days || 5;
                if (periodsInput) periodsInput.value = config.periods_per_day || 7;
            }

            // Clear class cards container
            const container = document.getElementById('school-class-cards-container');
            if (container) container.innerHTML = '';

            // Append preset classes
            Object.keys(classData).forEach(clsName => {
                appendSchoolClassCard(clsName, classData[clsName]);
            });

            alert("School demo presets loaded successfully!");
        })
        .catch(err => {
            console.error("Error loading school presets:", err);
            alert("Failed to load school presets.");
        });
}

function submitSchoolForm() {
    const days = parseInt(document.getElementById('school-days-input').value) || 5;
    const periods_per_day = parseInt(document.getElementById('school-periods-input').value) || 7;

    const classNodes = document.querySelectorAll('[data-element-type="school-class-node"]');
    const class_data = {};

    classNodes.forEach(node => {
        const clsName = node.querySelector('.school-class-name-input').value.trim();
        if (!clsName) return;

        const subjects = [];
        node.querySelectorAll('.school-subject-row').forEach(row => {
            const sub = row.querySelector('.school-subject-input').value.trim();
            const teacher = row.querySelector('.school-teacher-input').value.trim();
            const periods = parseInt(row.querySelector('.school-periods-input').value) || 1;

            if (sub && teacher) {
                subjects.push({
                    subject: sub,
                    teacher: teacher,
                    weekly_periods: periods
                });
            }
        });

        if (subjects.length > 0) {
            class_data[clsName] = subjects;
        }
    });

    if (Object.keys(class_data).length === 0) {
        alert("Please enter at least one valid class with subjects.");
        return;
    }

    const payload = {
        class_data: class_data,
        config: {
            days: days,
            periods_per_day: periods_per_day,
            population_size: 50,
            generations: 80,
            mutation_rate: 0.35
        }
    };

    // Show loading state
    const submitBtn = document.getElementById('school-btn-generate-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating Timetable...`;
    }

    fetch('/api/school/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Generation failed");
        return res.json();
    })
    .then(data => {
        schoolState.generatedTimetable = data;
        schoolState.timetableGenerated = true;

        renderSchoolResults();
        switchSchoolTab('school-timetable');
    })
    .catch(err => {
        console.error("School generation error:", err);
        alert("Error generating timetable. Please check inputs and try again.");
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

/**
 * 4. Render Timetables (Class View & Teacher View)
 */
function renderSchoolResults() {
    if (!schoolState.generatedTimetable) return;

    const data = schoolState.generatedTimetable;
    const timetable = data.timetable;
    const classNames = Object.keys(timetable).sort();

    // Render Class Tabs
    const tabsWrapper = document.getElementById('school-timetable-class-tabs');
    if (tabsWrapper) {
        tabsWrapper.innerHTML = '';
        classNames.forEach((clsName, idx) => {
            const btn = document.createElement('button');
            btn.className = `batch-tab ${idx === 0 ? 'active' : ''}`;
            btn.textContent = clsName;
            btn.addEventListener('click', () => {
                tabsWrapper.querySelectorAll('.batch-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                schoolState.selectedClass = clsName;
                renderSchoolClassGrid(clsName);
            });
            tabsWrapper.appendChild(btn);
        });
    }

    if (classNames.length > 0) {
        schoolState.selectedClass = classNames[0];
        renderSchoolClassGrid(classNames[0]);
    }

    // Build and Render Teacher View
    initSchoolTeacherTimetable();
}

function renderSchoolClassGrid(clsName) {
    if (!schoolState.generatedTimetable) return;

    const data = schoolState.generatedTimetable;
    const gridData = data.timetable[clsName];
    if (!gridData) return;

    const daysCount = parseInt(data.config.days);
    const slotsPerDay = parseInt(data.config.periods_per_day);
    const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const titleEl = document.getElementById('school-current-class-title');
    if (titleEl) titleEl.textContent = `Class Timetable: ${clsName}`;

    const tableElement = document.getElementById('school-class-table-grid');
    if (!tableElement) return;

    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Header Row
    const hr = document.createElement('tr');
    const dayHeader = document.createElement('th');
    dayHeader.textContent = "Day";
    hr.appendChild(dayHeader);

    for (let p = 1; p <= slotsPerDay; p++) {
        const th = document.createElement('th');
        th.textContent = `Period ${p}`;
        hr.appendChild(th);
    }
    thead.appendChild(hr);

    // Day Rows
    for (let d = 0; d < daysCount; d++) {
        const tr = document.createElement('tr');
        const tdDay = document.createElement('td');
        tdDay.className = 'day-header';
        tdDay.innerHTML = `<strong>${dayNamesFull[d] || `Day ${d + 1}`}</strong>`;
        tr.appendChild(tdDay);

        for (let p = 0; p < slotsPerDay; p++) {
            const td = document.createElement('td');
            const session = gridData[d][p];

            if (!session) {
                td.innerHTML = `<div class="slot-cell empty-slot"><span>-</span></div>`;
            } else {
                const parts = session.split("::");
                const subject = parts[0] || "Subject";
                const teacher = parts[1] || "Teacher";
                const cardColor = typeof getSubjectColors === 'function' ? getSubjectColors(subject) : '#F4A261';

                td.innerHTML = `
                    <div class="slot-cell active-class" style="background-color: ${cardColor}; padding: 8px 6px; display: flex; flex-direction: column; gap: 4px;">
                        <span class="slot-subject" style="font-weight: 700; font-size: 12px; line-height: 1.2;">${subject}</span>
                        <span class="slot-teacher" style="font-size: 11px; font-weight: 600; line-height: 1.2;"><i class="fa-solid fa-chalkboard-user"></i> ${teacher}</span>
                    </div>
                `;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

/**
 * 5. Teacher View Aggregation & Rendering
 */
function buildSchoolTeacherSchedules() {
    if (!schoolState.generatedTimetable) return {};

    const data = schoolState.generatedTimetable;
    const timetable = data.timetable;
    const daysCount = parseInt(data.config.days);
    const slotsPerDay = parseInt(data.config.periods_per_day);

    const teacherSchedules = {};

    function initTeacherGrid(tName) {
        if (!teacherSchedules[tName]) {
            teacherSchedules[tName] = Array.from({ length: daysCount }, () =>
                Array.from({ length: slotsPerDay }, () => [])
            );
        }
    }

    for (const [clsName, grid] of Object.entries(timetable)) {
        for (let d = 0; d < daysCount; d++) {
            for (let p = 0; p < slotsPerDay; p++) {
                const session = grid[d][p];
                if (session) {
                    const parts = session.split("::");
                    const subject = parts[0];
                    const teacher = parts[1];

                    if (teacher) {
                        initTeacherGrid(teacher);
                        teacherSchedules[teacher][d][p].push({
                            subject: subject,
                            className: clsName
                        });
                    }
                }
            }
        }
    }

    return teacherSchedules;
}

function initSchoolTeacherTimetable() {
    const teacherSchedules = buildSchoolTeacherSchedules();
    const teacherNames = Object.keys(teacherSchedules).sort();

    schoolState.teacherSchedules = teacherSchedules;

    const tabsWrapper = document.getElementById('school-timetable-teacher-tabs');
    if (tabsWrapper) tabsWrapper.innerHTML = '';

    if (teacherNames.length === 0) return;

    schoolState.selectedTeacher = teacherNames[0];

    teacherNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = `batch-tab${idx === 0 ? ' active' : ''}`;
        btn.textContent = name;
        btn.style.cssText = 'flex-shrink:0;';
        btn.addEventListener('click', () => {
            tabsWrapper.querySelectorAll('.batch-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            schoolState.selectedTeacher = name;
            renderSchoolTeacherGrid(name);
        });
        if (tabsWrapper) tabsWrapper.appendChild(btn);
    });

    renderSchoolTeacherGrid(teacherNames[0]);
}

function renderSchoolTeacherGrid(teacherName) {
    if (!schoolState.generatedTimetable || !schoolState.teacherSchedules) return;

    const schedule = schoolState.teacherSchedules[teacherName];
    if (!schedule) return;

    const data = schoolState.generatedTimetable;
    const daysCount = parseInt(data.config.days);
    const slotsPerDay = parseInt(data.config.periods_per_day);
    const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const titleEl = document.getElementById('school-current-teacher-title');
    if (titleEl) titleEl.textContent = `Teacher: ${teacherName}`;

    const tableElement = document.getElementById('school-teacher-table-grid');
    if (!tableElement) return;

    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Header row
    const hr = document.createElement('tr');
    const dayTh = document.createElement('th');
    dayTh.textContent = 'Day';
    hr.appendChild(dayTh);
    for (let p = 1; p <= slotsPerDay; p++) {
        const th = document.createElement('th');
        th.textContent = `Period ${p}`;
        hr.appendChild(th);
    }
    thead.appendChild(hr);

    // Day rows
    for (let d = 0; d < daysCount; d++) {
        const tr = document.createElement('tr');
        const tdDay = document.createElement('td');
        tdDay.className = 'day-header';
        tdDay.innerHTML = `<strong>${dayNamesFull[d] || `Day ${d + 1}`}</strong>`;
        tr.appendChild(tdDay);

        for (let p = 0; p < slotsPerDay; p++) {
            const td = document.createElement('td');
            const slots = schedule[d][p];

            if (!slots || slots.length === 0) {
                td.innerHTML = `<div class="slot-cell empty-slot"><span>-</span></div>`;
            } else {
                const slot = slots[0];
                const cardColor = typeof getSubjectColors === 'function' ? getSubjectColors(slot.subject) : '#F4A261';

                td.innerHTML = `
                    <div class="slot-cell active-class" style="background-color: ${cardColor}; padding: 8px 6px; display: flex; flex-direction: column; gap: 4px;">
                        <span class="slot-subject" style="font-weight: 700; font-size: 12px; line-height: 1.2;">${slot.subject}</span>
                        <span class="slot-teacher" style="font-size: 11px; font-weight: 600; line-height: 1.2;"><i class="fa-solid fa-users"></i> ${slot.className}</span>
                    </div>
                `;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

/**
 * 6. Export Handlers for School Timetable
 */
function setupSchoolExportHandlers() {
    const btnPdf = document.getElementById('school-btn-export-pdf');
    const btnExcel = document.getElementById('school-btn-export-excel');
    const btnPrint = document.getElementById('school-btn-print');

    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            if (!schoolState.timetableGenerated) return;

            const isClassView = document.getElementById('school-class-timetable-view').style.display !== 'none';
            const element = isClassView ? document.getElementById('school-class-pdf-area') : document.getElementById('school-teacher-pdf-area');
            const titleVal = isClassView ? (schoolState.selectedClass || "Class_Timetable") : (schoolState.selectedTeacher || "Teacher_Timetable");

            const opt = {
                margin:       10,
                filename:     `School_Timetable_${titleVal}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            if (typeof showToast === 'function') {
                showToast("Preparing PDF", "Compiling styles and vector pages for download.", "success");
            }
            
            html2pdf().set(opt).from(element).save()
                .then(() => {
                    if (typeof showToast === 'function') {
                        showToast("PDF Download Complete", `File saved as School_Timetable_${titleVal}.pdf`, "success");
                    }
                })
                .catch(err => {
                    console.error("PDF Export error", err);
                    if (typeof showToast === 'function') {
                        showToast("PDF Export failed", "An error occurred compiling the PDF document.", "error");
                    }
                });
        });
    }

    if (btnExcel) {
        btnExcel.addEventListener('click', () => {
            if (!schoolState.timetableGenerated) {
                if (typeof showToast === 'function') {
                    showToast("No Timetable", "Please generate a timetable first before exporting.", "warning");
                }
                return;
            }

            if (typeof XLSX === 'undefined') {
                alert("Excel library (SheetJS) not loaded. Please refresh the page and try again.");
                return;
            }

            const data = schoolState.generatedTimetable;
            const timetable = data.timetable;
            const daysCount = parseInt(data.config.days);
            const slotsPerDay = parseInt(data.config.periods_per_day);
            const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

            const wb = XLSX.utils.book_new();

            // ── One sheet per class ──────────────────────────────────────────
            Object.keys(timetable).sort().forEach(clsName => {
                const gridData = timetable[clsName];

                const headerRow = ["Day"];
                for (let p = 1; p <= slotsPerDay; p++) headerRow.push(`Period ${p}`);

                const rows = [headerRow];

                for (let d = 0; d < daysCount; d++) {
                    const row = [dayNames[d] || `Day ${d + 1}`];
                    for (let p = 0; p < slotsPerDay; p++) {
                        const session = gridData[d][p];
                        if (!session) {
                            row.push("-");
                        } else {
                            const parts = session.split("::");
                            const subject = parts[0] || "";
                            const teacher = parts[1] || "";
                            row.push(`${subject} (${teacher})`);
                        }
                    }
                    rows.push(row);
                }

                const ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 14 }, ...Array(slotsPerDay).fill({ wch: 22 })];

                // Sheet name: max 31 chars, no special chars
                const safeName = clsName.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, safeName || `Class${Object.keys(timetable).indexOf(clsName) + 1}`);
            });

            // ── One sheet per teacher ────────────────────────────────────────
            const teacherSchedules = buildSchoolTeacherSchedules();
            Object.keys(teacherSchedules).sort().forEach(teacherName => {
                const schedule = teacherSchedules[teacherName];

                const headerRow = ["Day"];
                for (let p = 1; p <= slotsPerDay; p++) headerRow.push(`Period ${p}`);

                const rows = [headerRow];

                for (let d = 0; d < daysCount; d++) {
                    const row = [dayNames[d] || `Day ${d + 1}`];
                    for (let p = 0; p < slotsPerDay; p++) {
                        const slots = schedule[d][p];
                        if (!slots || slots.length === 0) {
                            row.push("-");
                        } else {
                            row.push(`${slots[0].subject} (${slots[0].className})`);
                        }
                    }
                    rows.push(row);
                }

                const ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 14 }, ...Array(slotsPerDay).fill({ wch: 22 })];

                const safeName = (`T_${teacherName}`).replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, safeName);
            });

            // ── Download ─────────────────────────────────────────────────────
            XLSX.writeFile(wb, "School_Timetable.xlsx");

            if (typeof showToast === 'function') {
                showToast("Excel Export Complete", "School_Timetable.xlsx downloaded successfully.", "success");
            }
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
}

// ─── School Generator State Handlers ─────────────────────────────────────────

function saveSchoolDetails() {
    // 1. Gather high level config values
    const days = document.getElementById('school-days-input')?.value || "5";
    const periods = document.getElementById('school-periods-input')?.value || "7";

    // 2. Gather classes data
    const classNodes = document.querySelectorAll('[data-element-type="school-class-node"]');
    const classes = [];

    classNodes.forEach(node => {
        const classNameInput = node.querySelector('.school-class-name-input');
        if (!classNameInput) return;

        const className = classNameInput.value.trim();
        const subjects = [];

        // Gather subject rows
        const subjectRows = node.querySelectorAll('.school-subject-row');
        subjectRows.forEach(row => {
            const subjectInput = row.querySelector('.school-subject-input');
            const teacherInput = row.querySelector('.school-teacher-input');
            const periodsInput = row.querySelector('.school-periods-input');
            
            if (subjectInput && teacherInput) {
                const subject = subjectInput.value.trim();
                const teacher = teacherInput.value.trim();
                const weekly_periods = parseInt(periodsInput?.value || "4");
                
                if (subject || teacher) { // save even partial rows
                    subjects.push({ subject, teacher, weekly_periods });
                }
            }
        });

        classes.push({
            name: className,
            subjects: subjects
        });
    });

    const configData = {
        days,
        periods,
        classes
    };

    localStorage.setItem('saved_school_timetable_details', JSON.stringify(configData));
    if (typeof showToast === 'function') {
        showToast("Configuration Saved", "School generator details successfully saved locally.", "success");
    } else {
        alert("School generator details successfully saved locally.");
    }
}

function loadSchoolDetails(silent = false) {
    const dataStr = localStorage.getItem('saved_school_timetable_details');
    if (!dataStr) {
        // If there's no saved details, make sure at least one class card exists
        const container = document.getElementById('school-class-cards-container');
        if (container && container.children.length === 0) {
            appendSchoolClassCard("", []);
        }
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("No Saved Details Found", "There are no saved school configurations to load.", "warning");
            } else {
                alert("No saved school configurations to load.");
            }
        }
        return false;
    }

    try {
        const data = JSON.parse(dataStr);

        // Fill high level details
        const daysInput = document.getElementById('school-days-input');
        const periodsInput = document.getElementById('school-periods-input');
        if (daysInput) daysInput.value = data.days || 5;
        if (periodsInput) periodsInput.value = data.periods || 7;

        // Clear active Class container
        const container = document.getElementById('school-class-cards-container');
        if (container) {
            container.innerHTML = "";
            // Populate each class preset
            if (data.classes && data.classes.length > 0) {
                data.classes.forEach(cls => {
                    appendSchoolClassCard(cls.name, cls.subjects);
                });
            } else {
                appendSchoolClassCard("", []);
            }
        }

        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("Configuration Loaded", "Saved school configuration restored successfully.", "success");
            } else {
                alert("Saved school configuration restored successfully.");
            }
        }
        
        // Re-analyze items count on dashboard
        if (typeof updateSchoolDashboardStats === 'function') {
            updateSchoolDashboardStats();
        }
        return true;
    } catch (e) {
        console.error("Error loading saved details:", e);
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("Load Error", "Failed to parse saved school configuration.", "error");
            } else {
                alert("Failed to parse saved school configuration.");
            }
        }
        return false;
    }
}

function resetSchoolPanel() {
    if (confirm("Are you sure you want to clear the school generator panel? All current details will be lost.")) {
        // Reset high level details
        const daysInput = document.getElementById('school-days-input');
        const periodsInput = document.getElementById('school-periods-input');
        if (daysInput) daysInput.value = 5;
        if (periodsInput) periodsInput.value = 7;

        // Clear and add one empty class card
        const container = document.getElementById('school-class-cards-container');
        if (container) {
            container.innerHTML = "";
            appendSchoolClassCard("", []);
        }

        if (typeof showToast === 'function') {
            showToast("Form Reset", "School generator panel reset to default clean state.", "success");
        } else {
            alert("School generator panel reset to default clean state.");
        }
        
        if (typeof updateSchoolDashboardStats === 'function') {
            updateSchoolDashboardStats();
        }
    }
}

function restoreStateOnLoad() {
    const savedMode = localStorage.getItem('timetable_generator_mode');
    const savedTab = localStorage.getItem('timetable_generator_tab');

    const modeOverlay = document.getElementById('mode-select-screen');
    const uniApp = document.getElementById('university-app');
    const schoolApp = document.getElementById('school-app');

    if (savedMode === 'university') {
        if (modeOverlay) modeOverlay.style.display = 'none';
        if (uniApp) uniApp.style.display = 'block';
        if (schoolApp) schoolApp.style.display = 'none';

        // Load saved details silently
        if (typeof loadUniversityDetails === 'function') {
            loadUniversityDetails(true);
        }

        // Restore tab
        let tab = savedTab || 'home';
        // Validate tab
        if (['home', 'dashboard', 'generator', 'timetable', 'about'].includes(tab)) {
            if (window.switchView) {
                window.switchView(tab);
            }
        }
    } else if (savedMode === 'school') {
        if (modeOverlay) modeOverlay.style.display = 'none';
        if (uniApp) uniApp.style.display = 'none';
        if (schoolApp) schoolApp.style.display = 'block';

        // Load saved details silently
        loadSchoolDetails(true);

        // Restore tab
        let tab = savedTab || 'school-tab-home';
        // Validate tab
        if (['school-tab-home', 'school-config', 'school-generator', 'school-timetable', 'school-about'].includes(tab)) {
            switchSchoolTab(tab);
        }
    }
}

// Expose functions globally
window.saveSchoolDetails = saveSchoolDetails;
window.loadSchoolDetails = loadSchoolDetails;
window.resetSchoolPanel = resetSchoolPanel;
window.restoreStateOnLoad = restoreStateOnLoad;

