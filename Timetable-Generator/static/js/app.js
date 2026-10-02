/**
 * Timetable Generator Client Application Logic
 */

// Application state tracker
let appState = {
    presetsFetched: false,
    timetableGenerated: false,
    activeTab: 'home',
    runCount: 0,
    generatedTimetable: null, // Holds the result from server
    selectedTimetableBatch: null, // Tab filtering for generated batches
    subjectColors: {} // Subject code -> Hex Color map
};

// Preset colors palette list (Cream/Orange pastel style + premium accent compatibility)
const PASTEL_PALETTE = [
    '#E76F51', // Terracotta
    '#F4A261', // Orange
    '#2A9D8F', // Mint Teal
    '#457B9D', // Slate Blue
    '#E9C46A', // Pastel Gold
    '#9B5DE5', // Lavender Purple
    '#F15BB5', // Muted Pink
    '#00F5D4', // Pastel Cyan
    '#3A86C8', // Royal Blue
    '#588157'  // Sage Green
];

// Document loaded listener
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    
    // Start with 1 clean empty batch card when link is opened
    appendBatchCard("", [], []);
});

// App Initializer
function initApp() {
    setupModeSelection();
    setupRouting();
    setupFormControls();
    setupExportHandlers();
    setupThemeToggle();
    setupDashboard();
    setupViewModeToggle();
    // Ensure landing overlay is shown when no mode is selected
    if (!localStorage.getItem('timetable_generator_mode')) {
        const modeOverlay = document.getElementById('mode-select-screen');
        const uniApp = document.getElementById('university-app');
        const schoolApp = document.getElementById('school-app');
        if (modeOverlay) modeOverlay.style.display = 'flex';
        if (uniApp) uniApp.style.display = 'none';
        if (schoolApp) schoolApp.style.display = 'none';
    }
}

function setupModeSelection() {
    const modeOverlay = document.getElementById('mode-select-screen');
    const uniApp = document.getElementById('university-app');
    const schoolApp = document.getElementById('school-app');

    const btnUni = document.getElementById('btn-select-university-mode');
    const btnSchool = document.getElementById('btn-select-school-mode') || document.getElementById('btn-select-mode-school');

    if (btnUni) {
        btnUni.addEventListener('click', () => {
            if (modeOverlay) modeOverlay.style.display = 'none';
            if (uniApp) uniApp.style.display = 'block';
            if (schoolApp) schoolApp.style.display = 'none';
            localStorage.setItem('timetable_generator_mode', 'university');
        });
    }

    if (btnSchool) {
        btnSchool.addEventListener('click', () => {
            if (modeOverlay) modeOverlay.style.display = 'none';
            if (uniApp) uniApp.style.display = 'none';
            if (schoolApp) schoolApp.style.display = 'block';
            localStorage.setItem('timetable_generator_mode', 'school');

            // Ensure initial class card exists in school mode if container is empty
            const container = document.getElementById('school-class-cards-container');
            if (container && container.children.length === 0 && typeof appendSchoolClassCard === 'function') {
                appendSchoolClassCard("", []);
            }
        });
    }

    // Handle all "Switch Mode" buttons
    document.querySelectorAll('.switch-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modeOverlay) modeOverlay.style.display = 'flex';
            if (uniApp) uniApp.style.display = 'none';
            if (schoolApp) schoolApp.style.display = 'none';
            localStorage.removeItem('timetable_generator_mode');
            localStorage.removeItem('timetable_generator_tab');
        });
    });
}


/**
 * 1. SPA CLIENT ROUTING SYSTEM WITH HASH BROWSER HISTORY
 */
function setupRouting() {
    const navbarLinks = document.querySelectorAll('.nav-link');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    // Mobile menu toggle
    if (mobileToggle && navLinksContainer) {
        mobileToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('mobile-visible');
            const icon = mobileToggle.querySelector('i');
            if (navLinksContainer.classList.contains('mobile-visible')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    function switchView(tabId) {
        // Close mobile Navbar if open
        if (navLinksContainer && navLinksContainer.classList.contains('mobile-visible')) {
            navLinksContainer.classList.remove('mobile-visible');
            if (mobileToggle) mobileToggle.querySelector('i').className = 'fa-solid fa-bars';
        }

        // Hide all panels
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        // Show target panel
        const targetPanel = document.getElementById(`tab-${tabId}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            appState.activeTab = tabId;
            if (localStorage.getItem('timetable_generator_mode') === 'university') {
                localStorage.setItem('timetable_generator_tab', tabId);
            }
        }

        // Update nav links active class
        navbarLinks.forEach(link => {
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update sidebar items active class
        sidebarItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Auto scroll to top
        window.scrollTo(0, 0);
    }

    // Assign click listeners
    const triggerElements = [...navbarLinks, ...sidebarItems];
    triggerElements.forEach(element => {
        element.addEventListener('click', (e) => {
            const tabId = element.getAttribute('data-tab');
            if (tabId) {
                e.preventDefault();
                // If it is the timetable view tab and we haven't generated one yet, prompt warning
                if (tabId === 'timetable' && !appState.timetableGenerated) {
                    showToast("No schedule available", "Please run the generator first to view the timetable.", "warning");
                    switchView('generator');
                    return;
                }
                switchView(tabId);
                history.pushState(null, "", `#${tabId}`);
            }
        });
    });

    // Check pre-existing hash Router on fresh load
    const hash = window.location.hash.substring(1);
    if (hash && ['home', 'dashboard', 'generator', 'timetable', 'about'].includes(hash)) {
        if (hash === 'timetable' && !appState.timetableGenerated) {
            switchView('home');
        } else {
            switchView(hash);
        }
    }

    // Expose switchView globally on window
    window.switchView = switchView;
}

// Global Tab switcher accessor
window.switchTab = function(tabId) {
    if (window.switchView) {
        window.switchView(tabId);
    }
};

/**
 * 2. DYNAMIC INPUT FORM AND PRESETS LOADING
 */
function setupFormControls() {
    const btnAddBatch = document.getElementById('btn-add-batch');
    const presetBtn = document.getElementById('btn-load-presets');
    const generatorForm = document.getElementById('timetable-form');

    // Add Batch listener
    if (btnAddBatch) {
        btnAddBatch.addEventListener('click', () => {
            appendBatchCard();
            showToast("Batch Form Added", "Provide subjects and hours for this new class.", "success");
        });
    }

    // Submit generation request
    if (generatorForm) {
        generatorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitGeneratorData();
        });
    }

    // Modal Learn More toggle controls
    const learnMoreModal = document.getElementById('learn-more-modal');
    const learnMoreTrigger = document.querySelector('a[href="#how-it-works"]');
    const closeModalBtns = [
        document.getElementById('btn-close-modal'),
        document.getElementById('btn-close-modal-footer')
    ];

    if (learnMoreTrigger && learnMoreModal) {
        // We override standard anchor link since we want details modal toggle
        const learnMoreAnchor = document.querySelector('.hero-actions a[href="#how-it-works"] + a');
        const learnMoreBtn = document.querySelector('.hero-actions a[href="#how-it-works"]');
        
        let triggers = [learnMoreBtn];
        // If secondary learn more is present
        const secCta = document.querySelector('.hero-actions a[href="#how-it-works"].btn-secondary');
        if (secCta) triggers.push(secCta);

        triggers.forEach(t => {
            if (t) {
                t.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    learnMoreModal.style.display = 'flex';
                });
            }
        });
    }

    closeModalBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (learnMoreModal) learnMoreModal.style.display = 'none';
            });
        }
    });

    if (presetBtn) {
        presetBtn.addEventListener('click', () => {
            loadPresetsDirectly();
        });
    }

    const btnSaveDetails = document.getElementById('btn-save-details');
    const btnLoadSavedDetails = document.getElementById('btn-load-saved-details');
    const btnResetPanel = document.getElementById('btn-reset-panel');

    if (btnSaveDetails) {
        btnSaveDetails.addEventListener('click', () => {
            saveUniversityDetails();
        });
    }
    if (btnLoadSavedDetails) {
        btnLoadSavedDetails.addEventListener('click', () => {
            loadUniversityDetails();
        });
    }
    if (btnResetPanel) {
        btnResetPanel.addEventListener('click', () => {
            resetUniversityPanel();
        });
    }
}

// Generate unique identifier
function makeId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Append active Batch Card component into workspace wrapper
function appendBatchCard(batchName = "", theoryData = {}, labsData = {}, yearProgram = "B.Tech - 3rd Year") {
    const wrapper = document.getElementById('batches-wrapper');
    const batchId = 'batch_' + makeId(8);
    
    // Create card element container
    const card = document.createElement('div');
    card.className = 'batch-box';
    card.id = batchId;
    card.setAttribute('data-element-type', 'batch-node');

    card.innerHTML = `
        <div class="batch-box-header">
            <div class="batch-box-title">
                <i class="fa-solid fa-users text-orange"></i>
                <input type="text" class="batch-name-input" placeholder="Batch Name (e.g. CSE_DD)" value="${batchName}" required style="font-weight:bold; border:none; background:transparent; border-bottom:1px dashed var(--primary); padding:2px; color:var(--text-primary); outline:none;">
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <select class="batch-year-select" style="padding:6px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-primary); font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="B.Tech - 1st Year" ${yearProgram === "B.Tech - 1st Year" ? "selected" : ""}>B.Tech - 1st Year</option>
                    <option value="B.Tech - 2nd Year" ${yearProgram === "B.Tech - 2nd Year" ? "selected" : ""}>B.Tech - 2nd Year</option>
                    <option value="B.Tech - 3rd Year" ${yearProgram === "B.Tech - 3rd Year" ? "selected" : ""}>B.Tech - 3rd Year</option>
                    <option value="B.Tech - 4th Year" ${yearProgram === "B.Tech - 4th Year" ? "selected" : ""}>B.Tech - 4th Year</option>
                    <option value="DD - 1st Year" ${yearProgram === "DD - 1st Year" ? "selected" : ""}>DD - 1st Year</option>
                    <option value="DD - 2nd Year" ${yearProgram === "DD - 2nd Year" ? "selected" : ""}>DD - 2nd Year</option>
                    <option value="DD - 3rd Year" ${yearProgram === "DD - 3rd Year" ? "selected" : ""}>DD - 3rd Year</option>
                    <option value="DD - 4th Year" ${yearProgram === "DD - 4th Year" ? "selected" : ""}>DD - 4th Year</option>
                    <option value="DD - 5th Year" ${yearProgram === "DD - 5th Year" ? "selected" : ""}>DD - 5th Year</option>
                    <option value="M.Tech - 1st Year" ${yearProgram === "M.Tech - 1st Year" ? "selected" : ""}>M.Tech - 1st Year</option>
                    <option value="M.Tech - 2nd Year" ${yearProgram === "M.Tech - 2nd Year" ? "selected" : ""}>M.Tech - 2nd Year</option>
                </select>
                <button type="button" class="btn-remove-batch" onclick="removeBatchCard('${batchId}')">
                    <i class="fa-solid fa-trash-can"></i> Remove
                </button>
            </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
            <!-- Theory Courses Section -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h4 style="font-size:13px; color:var(--primary-dark);"><i class="fa-solid fa-book"></i> Theory Courses</h4>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 10px; font-size:12px;" onclick="addSubjectRow('${batchId}', '', '', '', '', 3)">
                        <i class="fa-solid fa-plus"></i> Add Course
                    </button>
                </div>
                <!-- Column Headers -->
                <div style="display:flex; align-items:center; gap:16px; padding:0 12px 6px 12px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">
                    <div style="width: 15%;">Course Code</div>
                    <div class="subj-col-grow">Course Name</div>
                    <div style="width: 20%;">Faculty Name</div>
                    <div style="width: 20%;">Group of Students</div>
                    <div class="subj-col-sm">Credits</div>
                    <div style="width: 26px;"></div>
                </div>
                <div class="subjects-editor theory-subjects-list" id="${batchId}_theory_list">
                    <!-- Theory rows injected -->
                </div>
            </div>

            <!-- Laboratory Sessions Section -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h4 style="font-size:13px; color:var(--primary-dark);"><i class="fa-solid fa-flask"></i> Laboratory Units</h4>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 10px; font-size:12px;" onclick="addLabRow('${batchId}', '', '', '', '')">
                        <i class="fa-solid fa-plus"></i> Add Lab
                    </button>
                </div>
                <!-- Column Headers -->
                <div style="display:flex; align-items:center; gap:16px; padding:0 12px 6px 12px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">
                    <div style="width: 15%;">Course Code</div>
                    <div class="subj-col-grow">Course Name</div>
                    <div style="width: 25%;">Faculty Name</div>
                    <div style="width: 25%;">Group of Students</div>
                    <div style="width: 26px;"></div>
                </div>
                <div class="subjects-editor lab-subjects-list" id="${batchId}_labs_list">
                    <!-- Lab rows injected -->
                </div>
            </div>
        </div>
    `;

    wrapper.appendChild(card);

    // Populate pre-existing data inside cards if loaded
    const hasTheory = theoryData && theoryData.length > 0;
    if (hasTheory) {
        theoryData.forEach(entry => {
            addSubjectRow(batchId, entry.code, entry.name, entry.teacher, entry.group, entry.credits);
        });
    } else {
        // Populate one default blank row
        addSubjectRow(batchId, "", "", "", "", 3);
    }

    const hasLabs = labsData && labsData.length > 0;
    if (hasLabs) {
        labsData.forEach(entry => {
            addLabRow(batchId, entry.code, entry.name, entry.teacher, entry.group);
        });
    } else {
        // Populate one default blank row
        addLabRow(batchId, "", "", "", "");
    }
}

// Remove entire class Batch Card element
window.removeBatchCard = function(batchId) {
    const card = document.getElementById(batchId);
    if (card) {
        card.remove();
        showToast("Batch Form Removed", "Batch configuration deleted from submission profile.", "warning");
    }
};

// Remove single subject row
window.removeSubjectRow = function(target) {
    let rowEl = null;
    if (typeof target === 'string') {
        rowEl = document.getElementById(target);
    } else if (target && target.nodeType) {
        rowEl = target.closest('.subject-item-row');
    } else if (window.event && window.event.target) {
        rowEl = window.event.target.closest('.subject-item-row');
    }
    if (rowEl) {
        rowEl.remove();
        if (typeof analyzeDashboardResources === 'function') {
            analyzeDashboardResources();
        }
    }
};

// Add dynamic Theory subject row layout
window.addSubjectRow = function(batchId, courseCode = "", courseName = "", teacherName = "", studentGroup = "", credits = 3) {
    const container = document.getElementById(`${batchId}_theory_list`);
    if (!container) return;

    const rowId = 'row_' + makeId(8);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'subject-item-row';
    rowDiv.id = rowId;
    rowDiv.setAttribute('data-row-type', 'theory-row');

    rowDiv.innerHTML = `
        <div class="form-group" style="width: 15%;">
            <input type="text" class="theory-code-input" placeholder="e.g. CS3006" value="${courseCode}" required>
        </div>
        <div class="form-group subj-col-grow">
            <input type="text" class="theory-name-input" placeholder="Course Name" value="${courseName}" required>
        </div>
        <div class="form-group" style="width: 20%;">
            <input type="text" class="theory-teacher-input" placeholder="Faculty Name" value="${teacherName}" required>
        </div>
        <div class="form-group" style="width: 20%;">
            <input type="text" class="theory-group-input" placeholder="e.g. 1 to 80 (Optional)" value="${studentGroup}">
        </div>
        <div class="form-group subj-col-sm">
            <select class="theory-credits-input" title="Lectures / Credits per week">
                <option value="1" ${credits === 1 ? 'selected' : ''}>1h</option>
                <option value="2" ${credits === 2 ? 'selected' : ''}>2h</option>
                <option value="3" ${credits === 3 ? 'selected' : ''}>3h</option>
                <option value="4" ${credits === 4 ? 'selected' : ''}>4h</option>
            </select>
        </div>
        <button type="button" class="btn-remove-subj" onclick="removeSubjectRow(this)" title="Delete Course">
            <i class="fa-solid fa-circle-minus"></i>
        </button>
    `;

    container.appendChild(rowDiv);

    // Direct event listener binding for guaranteed row deletion
    const removeBtn = rowDiv.querySelector('.btn-remove-subj');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeSubjectRow(removeBtn);
        });
    }

    // Recalculate stats when inputs change
    rowDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            if (typeof analyzeDashboardResources === 'function') analyzeDashboardResources();
        });
    });

    if (typeof analyzeDashboardResources === 'function') analyzeDashboardResources();
};

// Add dynamic Laboratory row layout
window.addLabRow = function(batchId, labCode = "", labName = "", teacherName = "", studentGroup = "") {
    const container = document.getElementById(`${batchId}_labs_list`);
    if (!container) return;

    const rowId = 'row_' + makeId(8);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'subject-item-row';
    rowDiv.id = rowId;
    rowDiv.setAttribute('data-row-type', 'lab-row');

    rowDiv.innerHTML = `
        <div class="form-group" style="width: 15%;">
            <input type="text" class="lab-code-input" placeholder="e.g. CSL3001" value="${labCode}" required>
        </div>
        <div class="form-group subj-col-grow">
            <input type="text" class="lab-name-input" placeholder="Course Name" value="${labName}" required>
        </div>
        <div class="form-group" style="width: 25%;">
            <input type="text" class="lab-teacher-input" placeholder="Faculty Name" value="${teacherName}" required>
        </div>
        <div class="form-group" style="width: 25%;">
            <input type="text" class="lab-group-input" placeholder="e.g. 1 to 80 (Optional)" value="${studentGroup}">
        </div>
        <button type="button" class="btn-remove-subj" onclick="removeSubjectRow(this)" title="Delete Lab">
            <i class="fa-solid fa-circle-minus"></i>
        </button>
    `;

    container.appendChild(rowDiv);

    // Direct event listener binding for guaranteed row deletion
    const removeBtn = rowDiv.querySelector('.btn-remove-subj');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeSubjectRow(removeBtn);
        });
    }

    // Recalculate stats when inputs change
    rowDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            if (typeof analyzeDashboardResources === 'function') analyzeDashboardResources();
        });
    });

    if (typeof analyzeDashboardResources === 'function') analyzeDashboardResources();
};

/**
 * Fetch Preset JSON config from Backend API
 */
function loadPresetsDirectly() {
    fetch('/api/presets')
        .then(res => res.json())
        .then(data => {
            // Fill high-level fields
            document.getElementById('config-days').value = data.config.days;
            document.getElementById('config-theory-slots').value = data.config.theory_slots;
            document.getElementById('config-lab-slots').value = data.config.lab_slots;
            document.getElementById('theory-rooms-input').value = data.config.theory_rooms.join(', ');
            document.getElementById('lab-rooms-input').value = data.config.lab_rooms.join(', ');

            // Clear active Batch container
            const wrapper = document.getElementById('batches-wrapper');
            wrapper.innerHTML = "";

            // Populate each batch preset
            for (const [batch, details] of Object.entries(data.batch_data)) {
                appendBatchCard(batch, details.theory, details.labs);
            }
            
            showToast("Demo Presets Loaded", "Timetable scheduler details prefilled with sample curriculum profiles.", "success");
            appState.presetsFetched = true;
            
            // Re-analyze items count on dashboard
            analyzeDashboardResources();
        })
        .catch(err => {
            console.error("Presets loading error", err);
            showToast("Presets unavailable", "Could not fetch default scheduling templates from web server.", "error");
        });
}

/**
 * Parse inputs, compile payload structure, post, handle UI load timers
 */
function submitGeneratorData() {
    // 1. Parse high level configs
    const days = parseInt(document.getElementById('config-days').value);
    const theory_slots = parseInt(document.getElementById('config-theory-slots').value);
    const lab_slots = parseInt(document.getElementById('config-lab-slots').value);
    const mutationRate = parseFloat(document.getElementById('config-mutation').value);
    
    // Clean string arrays
    const parseRoomsStr = id => document.getElementById(id).value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const theoryRooms = parseRoomsStr('theory-rooms-input');
    const labRooms = parseRoomsStr('lab-rooms-input');

    // 2. Validate basic boundaries
    if (theoryRooms.length === 0 || labRooms.length === 0) {
        showToast("Boundary Error", "Please provide at least one classroom and one laboratory hall.", "error");
        return;
    }

    // 3. Compile dynamic batch structures
    const batchNodes = document.querySelectorAll('[data-element-type="batch-node"]');
    if (batchNodes.length === 0) {
        showToast("Missing Classes", "Please define at least one Class Batch configuration.", "error");
        return;
    }

    const compiledBatchData = {};
    let parseError = false;

    batchNodes.forEach(node => {
        let batchName = node.querySelector('.batch-name-input').value.trim();
        const yearSelect = node.querySelector('.batch-year-select');
        
        if (!batchName) {
            parseError = true;
            return;
        }

        if (yearSelect) {
            batchName = `${batchName} (${yearSelect.value})`;
        }

        compiledBatchData[batchName] = {
            "theory": [],
            "labs": []
        };

        // Gather theory subjects
        const theoryRows = node.querySelectorAll('[data-row-type="theory-row"]');
        theoryRows.forEach(row => {
            const code = row.querySelector('.theory-code-input').value.trim();
            const name = row.querySelector('.theory-name-input').value.trim();
            const teacher = row.querySelector('.theory-teacher-input').value.trim();
            const group = row.querySelector('.theory-group-input').value.trim();
            const credits = parseInt(row.querySelector('.theory-credits-input').value);
            
            if (code && teacher) {
                compiledBatchData[batchName]["theory"].push({
                    code: code,
                    name: name,
                    teacher: teacher,
                    group: group,
                    credits: credits
                });
            }
        });

        // Gather lab subjects
        const labRows = node.querySelectorAll('[data-row-type="lab-row"]');
        labRows.forEach(row => {
            const code = row.querySelector('.lab-code-input').value.trim();
            const name = row.querySelector('.lab-name-input').value.trim();
            const teacher = row.querySelector('.lab-teacher-input').value.trim();
            const group = row.querySelector('.lab-group-input').value.trim();
            
            if (code && teacher) {
                compiledBatchData[batchName]["labs"].push({
                    code: code,
                    name: name,
                    teacher: teacher,
                    group: group
                });
            }
        });
    });

    if (parseError) {
        showToast("Validation Warning", "Ensure all class batch cards have valid names.", "error");
        return;
    }

    // Structure submission JSON
    const payload = {
        batch_data: compiledBatchData,
        config: {
            days: days,
            theory_slots: theory_slots,
            lab_slots: lab_slots,
            theory_rooms: theoryRooms,
            lab_rooms: labRooms,
            population_size: 50,
            generations: 50,
            mutation_rate: mutationRate
        }
    };

    // 4. Reveal Generator overlay
    const spinner = document.getElementById('generation-spinner');
    const loadingText = document.getElementById('loading-status-text');
    const loadingBar = document.getElementById('loading-progress-bar');
    const quoteLabel = spinner.querySelector('.loading-quote');

    if (spinner) spinner.style.display = 'flex';
    if (loadingBar) loadingBar.style.width = '5%';

    // Step names to show during the fetch wait
    const progressionPhrases = [
        { text: "Building randomized chromosomes...", progress: "15%", quote: '"Setting up the initial generation (Size: 50)"' },
        { text: "Evaluating fitness profiles...", progress: "30%", quote: '"Calculating constraint penalty sums..."' },
        { text: "Executing crossover selections...", progress: "45%", quote: '"Selecting the top 10% elite timetables..."' },
        { text: "Running mutation entropy vectors...", progress: "60%", quote: '"Swapping periods to break room deadlock collisions..."' },
        { text: "Optimizing lab afternoon grid spaces...", progress: "80%", quote: '"Ensuring triple block boundaries remain continuous..."' },
        { text: "Wrapping high-fitness final structures...", progress: "95%", quote: '"Double checking room and teacher limits..."' }
    ];

    let stepIdx = 0;
    const progressTimer = setInterval(() => {
        if (stepIdx < progressionPhrases.length) {
            const ph = progressionPhrases[stepIdx];
            if (loadingText) loadingText.textContent = ph.text;
            if (loadingBar) loadingBar.style.width = ph.progress;
            if (quoteLabel) quoteLabel.textContent = ph.quote;
            stepIdx++;
        }
    }, 350);

    // 5. Post to API
    fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(async (res) => {
        clearInterval(progressTimer);
        const resultJSON = await res.json();
        
        if (!res.ok) {
            throw new Error(resultJSON.details || resultJSON.error || "Unknown scheduling anomaly.");
        }
        return resultJSON;
    })
    .then(data => {
        // Complete generation success
        if (loadingBar) loadingBar.style.width = '100%';
        
        setTimeout(() => {
            if (spinner) spinner.style.display = 'none';

            appState.timetableGenerated = true;
            appState.generatedTimetable = data; // Save dataset global
            appState.runCount++;

            // Update stats
            const runsEl = document.getElementById('stat-runs');
            if (runsEl) {
                const totalBatches = Object.keys(data.timetable).length;
                runsEl.textContent = totalBatches;
            }
            
            // Add timeline activity log entry
            logActivity(`Optimization Evolved - Fitness: ${data.fitness}`, `Generated shapes for ${Object.keys(data.timetable).length} batches in ${data.history.length} cycles.`);
            
            // Initialize rendering
            initTimetableResults();
            
            showToast("Evolution Accomplished", `Conflict-free timetable resolved successfully with fitness ${data.fitness}!`, "success");
            
            // Refresh counts
            analyzeDashboardResources();

            // Redirect automatically to the timetable sheet view panel
            if (window.switchView) {
                window.switchView('timetable');
            }
            history.pushState(null, "", `#timetable`);
        }, 300);
    })
    .catch(err => {
        clearInterval(progressTimer);
        if (spinner) spinner.style.display = 'none';
        
        console.error(err);
        showToast("Generation Halted", err.message, "error");
        
        logActivity(`Generation Failed`, `Stopped due to conflict details: ${err.message}`);
    });
}

/**
 * 3. RENDER GENERATED TIMETABLE GRID SHEET
 */
function initTimetableResults() {
    if (!appState.generatedTimetable) return;

    const data = appState.generatedTimetable;
    const batchTabsWrapper = document.getElementById('timetable-batch-tabs');
    const fitnessLabel = document.getElementById('timetable-fitness-value');
    
    // Clear tabs
    if (batchTabsWrapper) batchTabsWrapper.innerHTML = "";

    const batches = Object.keys(data.timetable);
    if (batches.length === 0) return;

    // Pick first batch as selected automatically
    appState.selectedTimetableBatch = batches[0];

    // Render batch selection pills
    batches.forEach((batch, idx) => {
        const btn = document.createElement('button');
        btn.className = `batch-tab ${idx === 0 ? 'active' : ''}`;
        btn.textContent = batch;
        btn.addEventListener('click', () => {
            // Reset active pills
            batchTabsWrapper.querySelectorAll('.batch-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            appState.selectedTimetableBatch = batch;
            renderTimetableGrid(batch);
        });
        if (batchTabsWrapper) batchTabsWrapper.appendChild(btn);
    });

    // Output metadata to grid page safely
    const uniInput = document.getElementById('university-name');
    const deptInput = document.getElementById('department-name');
    const termInput = document.getElementById('academic-term');

    const uniVal = uniInput ? uniInput.value : "IIITDM Kancheepuram";
    const deptVal = deptInput ? deptInput.value : "Computer Science Department";
    const termVal = termInput ? termInput.value : "1st Sem 2026-2027";
    
    const uniTitleEl = document.getElementById('view-uni-title');
    if (uniTitleEl) uniTitleEl.textContent = uniVal;

    const uniSubEl = document.getElementById('view-uni-sub');
    if (uniSubEl) uniSubEl.textContent = `${deptVal} | ${termVal}`;

    if (fitnessLabel) {
        fitnessLabel.textContent = `Fitness Score: ${data.fitness}`;
        // Color fitness badge
        if (data.fitness > -50) {
            fitnessLabel.style.backgroundColor = 'var(--success-light)';
            fitnessLabel.style.color = 'var(--success)';
            fitnessLabel.style.borderColor = 'rgba(102,187,106,0.3)';
        } else {
            fitnessLabel.style.backgroundColor = 'rgba(244,162,97,0.1)';
            fitnessLabel.style.color = 'var(--primary-dark)';
            fitnessLabel.style.borderColor = 'var(--primary-light)';
        }
    }

    // Set Report Logs details safely
    const reportGenEl = document.getElementById('report-generations');
    if (reportGenEl) reportGenEl.textContent = data.history.length;

    const scoreVal = Math.abs(data.fitness);
    const hardErrors = Math.floor(scoreVal / 100);
    const softErrors = Math.floor((scoreVal % 100) / 5);

    const hardLabel = document.getElementById('report-hard-errors');
    const softLabel = document.getElementById('report-soft-errors');

    if (hardLabel) {
        if (hardErrors === 0) {
            hardLabel.textContent = "0 (Resolved - Conflict Free)";
            hardLabel.className = "analytics-val text-success";
        } else {
            hardLabel.textContent = `${hardErrors} clash(es)`;
            hardLabel.className = "analytics-val text-danger";
        }
    }
    if (softLabel) {
        softLabel.textContent = `${softErrors} issue(s) (e.g. idle credits/consecutive classes)`;
    }

    // Draw the actual table
    renderTimetableGrid(appState.selectedTimetableBatch);
}

// Generate aesthetic pastel color based on subject string seed
function getSubjectColors(subjectCode) {
    if (appState.subjectColors[subjectCode]) {
        return appState.subjectColors[subjectCode];
    }

    // Basic string hash accumulator
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) {
        hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Map hash back to palette index
    const index = Math.abs(hash) % PASTEL_PALETTE.length;
    const color = PASTEL_PALETTE[index];
    
    appState.subjectColors[subjectCode] = color;
    return color;
}

// Draws the timetable layout table into page
function renderTimetableGrid(batchName) {
    if (!appState.generatedTimetable) return;

    const data = appState.generatedTimetable;
    const gridData = data.timetable[batchName];
    if (!gridData) return;

    // Config references
    const daysCount = parseInt(data.config.days);
    const theorySlots = parseInt(data.config.theory_slots);
    const labSlots = parseInt(data.config.lab_slots);
    const slotsPerDay = theorySlots + labSlots;

    const batchTitleEl = document.getElementById('current-selected-batch-title');
    if (batchTitleEl) batchTitleEl.textContent = `Batch Course: ${batchName}`;

    const batchMetaEl = document.getElementById('current-selected-batch-meta');
    if (batchMetaEl) {
        batchMetaEl.textContent = "";
        batchMetaEl.style.display = "none";
    }

    // Build Headers
    const tableElement = document.getElementById('timetable-table-grid');
    if (!tableElement) return;

    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');

    thead.innerHTML = "";
    tbody.innerHTML = "";

    // 1. Generate Header Row with Period Numbers
    const hr = document.createElement('tr');
    
    const dayHeader = document.createElement('th');
    dayHeader.textContent = "Day";
    hr.appendChild(dayHeader);

    // Render period columns with Period Number (Period 1, Period 2, ...)
    for (let p = 1; p <= slotsPerDay; p++) {
        const th = document.createElement('th');
        th.textContent = `Period ${p}`;
        hr.appendChild(th);
    }

    thead.appendChild(hr);

    // 2. Generate Days rows with full names (Monday, Tuesday...)
    const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    for (let d = 0; d < daysCount; d++) {
        const tr = document.createElement('tr');
        
        // Day name cell
        const tdDay = document.createElement('td');
        tdDay.className = "day-header";
        const fullName = dayNamesFull[d] || `Day ${d + 1}`;
        tdDay.innerHTML = `<strong>${fullName}</strong>`;
        tr.appendChild(tdDay);

        // Periods columns content loop
        for (let p = 0; p < slotsPerDay; p++) {
            const td = document.createElement('td');
            const cellValue = gridData[d][p]; // Split into: Subject-Teacher-Room

            if (!cellValue) {
                td.innerHTML = `
                    <div class="slot-cell empty-slot">
                        <span>-</span>
                    </div>
                `;
            } else {
                const sessions = cellValue.split(' | ');
                const parsed = sessions.map(session => {
                    const parts = session.includes('::') ? session.split('::') : session.split('-');
                    return {
                        code: parts[0] || "Unknown",
                        name: parts[1] || "",
                        teacher: parts[2] || "Staff",
                        room: parts[3] || "N/A",
                        group: parts[4] && parts[4].trim() !== "" && parts[4].trim().toLowerCase() !== "all" ? parts[4].trim() : ""
                    };
                });

                const cardColor = getSubjectColors(parsed[0].code);
                const subjectName = parsed[0].name || parsed[0].code;

                if (parsed.length === 1) {
                    const s = parsed[0];
                    const groupText = s.group ? ` - ${s.group}` : "";
                    td.innerHTML = `
                        <div class="slot-cell active-class" style="background-color: ${cardColor}; padding: 8px 6px; display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                            <span class="slot-subject" style="font-weight:700; font-size:12px; line-height:1.2;">${subjectName}</span>
                            <span class="slot-teacher" style="font-size:11px; font-weight:600; line-height:1.2;"><i class="fa-solid fa-user-tie"></i> ${s.teacher}${groupText}</span>
                            <span class="slot-room" style="font-size:11px; font-weight:500; line-height:1.2;"><i class="fa-solid fa-location-dot"></i> ${s.room}</span>
                        </div>
                    `;
                } else {
                    let groupContent = '';
                    parsed.forEach((s, idx) => {
                        const groupText = s.group ? ` - ${s.group}` : '';
                        const borderStyle = idx > 0 ? 'margin-top:6px; padding-top:6px; border-top:1px dashed rgba(0,0,0,0.15);' : 'margin-top:4px;';
                        groupContent += `
                            <div style="${borderStyle} display:flex; flex-direction:column; gap:3px; font-size:11px; line-height:1.2;">
                                <span class="slot-teacher" style="font-weight:600;"><i class="fa-solid fa-user-tie"></i> ${s.teacher}${groupText}</span>
                                <span class="slot-room" style="font-size:11px; font-weight:500;"><i class="fa-solid fa-location-dot"></i> ${s.room}</span>
                            </div>
                        `;
                    });

                    td.innerHTML = `
                        <div class="slot-cell active-class" style="background-color: ${cardColor}; padding: 8px 6px; display:flex; flex-direction:column; gap:4px;">
                            <span class="slot-subject" style="font-weight:700; font-size:12px; margin-bottom:2px; line-height:1.2;">${subjectName}</span>
                            ${groupContent}
                        </div>
                    `;
                }
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

/**
 * 3b. FACULTY TIMETABLE VIEW MODE TOGGLE & RENDERER
 */
function setupViewModeToggle() {
    const btnBatch = document.getElementById('btn-view-batch');
    const btnFaculty = document.getElementById('btn-view-faculty');
    const batchView = document.getElementById('batch-timetable-view');
    const facultyView = document.getElementById('faculty-timetable-view');

    if (!btnBatch || !btnFaculty) return;

    btnBatch.addEventListener('click', () => {
        btnBatch.style.background = 'var(--primary)';
        btnBatch.style.color = 'white';
        btnFaculty.style.background = 'var(--bg-card)';
        btnFaculty.style.color = 'var(--text-secondary)';
        if (batchView) batchView.style.display = '';
        if (facultyView) facultyView.style.display = 'none';
    });

    btnFaculty.addEventListener('click', () => {
        btnFaculty.style.background = 'var(--primary)';
        btnFaculty.style.color = 'white';
        btnBatch.style.background = 'var(--bg-card)';
        btnBatch.style.color = 'var(--text-secondary)';
        if (batchView) batchView.style.display = 'none';
        if (facultyView) facultyView.style.display = '';

        // Parse and render faculty schedules
        if (appState.generatedTimetable) {
            initFacultyTimetable();
        }
    });
}

// Parse generated timetable to extract faculty schedules
function buildFacultySchedules() {
    if (!appState.generatedTimetable) return {};

    const data = appState.generatedTimetable;
    const daysCount = parseInt(data.config.days);
    const theorySlots = parseInt(data.config.theory_slots);
    const labSlots = parseInt(data.config.lab_slots);
    const slotsPerDay = theorySlots + labSlots;

    const facultySchedules = {};

    // Helper to ensure teacher grid structure exists
    const initTeacherGrid = (teacher) => {
        if (!teacher || facultySchedules[teacher]) return;
        facultySchedules[teacher] = [];
        for (let dd = 0; dd < daysCount; dd++) {
            const daySlots = [];
            for (let sp = 0; sp < slotsPerDay; sp++) {
                daySlots.push([]); // Store an array of sessions for each slot
            }
            facultySchedules[teacher].push(daySlots);
        }
    };

    // Scan generated timetable to record assigned sessions for each teacher
    for (const [batchName, gridData] of Object.entries(data.timetable)) {
        for (let d = 0; d < daysCount; d++) {
            for (let p = 0; p < slotsPerDay; p++) {
                const cellValue = gridData[d][p];
                if (!cellValue) continue;

                const sessions = cellValue.split(' | ');
                
                sessions.forEach(session => {
                    const parts = session.includes('::') ? session.split('::') : session.split('-');
                    // Format: code-name-teacher-room-group
                    if (parts.length >= 4) {
                        const code = parts[0];
                        const name = parts[1];
                        const teacher = parts[2] ? parts[2].trim() : "";
                        const room = parts[3];
                        const group = parts[4] && parts[4].trim() !== "" && parts[4].trim().toLowerCase() !== "all" ? parts[4].trim() : "";

                        if (teacher) {
                            initTeacherGrid(teacher);

                            const cleanBatchName = batchName.split(' (')[0];
                            const batchDisplay = group ? `${cleanBatchName} [${group}]` : cleanBatchName;

                            facultySchedules[teacher][d][p].push({
                                subject: name || code,
                                code: code,
                                batch: batchDisplay,
                                room: room
                            });
                        }
                    }
                });
            }
        }
    }

    // Also include any teachers registered in the batch forms who might have zero classes
    document.querySelectorAll('[data-element-type="batch-node"]').forEach(b => {
        b.querySelectorAll('.theory-teacher-input, .lab-teacher-input').forEach(input => {
            const tName = input.value.trim();
            if (tName) initTeacherGrid(tName);
        });
    });

    return facultySchedules;
}

// Build one faculty section block (title + table)
function buildFacultyTableBlock(teacherName, schedule, data) {
    const daysCount = parseInt(data.config.days);
    const theorySlots = parseInt(data.config.theory_slots);
    const labSlots = parseInt(data.config.lab_slots);
    const slotsPerDay = theorySlots + labSlots;
    const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const wrapper = document.createElement('div');
    wrapper.className = 'timetable-paper-card';
    wrapper.style.marginBottom = '32px';

    // Watermark
    const watermark = document.createElement('div');
    watermark.className = 'timetable-watermark';
    watermark.textContent = 'Faculty Schedule - Generated by Timetable Generator Engine';
    wrapper.appendChild(watermark);

    // Header
    const headerMeta = document.createElement('div');
    headerMeta.className = 'timetable-grid-header-meta';
    headerMeta.innerHTML = `<h3 style="margin:0 0 2px 0;">Faculty: ${teacherName}</h3><p style="margin:0; font-size:13px; opacity:0.7;">Weekly schedule across all batches</p>`;
    wrapper.appendChild(headerMeta);

    // Scrollable table container
    const container = document.createElement('div');
    container.className = 'timetable-responsive-container';
    container.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.className = 'timetable-grid';

    // Header row
    const thead = document.createElement('thead');
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
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
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
            } else if (slots.length === 1) {
                const slot = slots[0];
                const cardColor = getSubjectColors(slot.code || slot.subject);
                td.innerHTML = `
                    <div class="slot-cell active-class" style="background-color: ${cardColor}; padding:8px 6px; display:flex; flex-direction:column; gap:4px;">
                        <span class="slot-subject" style="font-weight:700; font-size:12px; line-height:1.2;">${slot.subject}</span>
                        <span class="slot-teacher" style="font-size:11px; font-weight:600; line-height:1.2;"><i class="fa-solid fa-users"></i> ${slot.batch}</span>
                        <span class="slot-room" style="font-size:11px; font-weight:500; line-height:1.2;"><i class="fa-solid fa-location-dot"></i> ${slot.room}</span>
                    </div>`;
            } else {
                const cardColor = getSubjectColors(slots[0].code || slots[0].subject);
                let groupContent = '';
                slots.forEach((slot, idx) => {
                    const borderStyle = idx > 0 ? 'margin-top:5px; padding-top:5px; border-top:1px dashed rgba(0,0,0,0.15);' : '';
                    groupContent += `
                        <div style="${borderStyle} display:flex; flex-direction:column; gap:3px; font-size:11px; line-height:1.2;">
                            <span style="font-weight:700; font-size:12px;">${slot.subject}</span>
                            <span style="font-weight:600;"><i class="fa-solid fa-users"></i> ${slot.batch}</span>
                            <span style="font-weight:500;"><i class="fa-solid fa-location-dot"></i> ${slot.room}</span>
                        </div>`;
                });
                td.innerHTML = `<div class="slot-cell active-class" style="background-color:${cardColor}; padding:8px 6px; display:flex; flex-direction:column; gap:4px;">${groupContent}</div>`;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
    wrapper.appendChild(container);
    return wrapper;
}

// Initialize Faculty Timetable — all faculty names as pill tabs (wrapping), click shows grid
function initFacultyTimetable() {
    const facultySchedules = buildFacultySchedules();
    const facultyNames = Object.keys(facultySchedules).sort();

    const tabsWrapper = document.getElementById('timetable-faculty-tabs');
    if (tabsWrapper) tabsWrapper.innerHTML = '';

    if (facultyNames.length === 0) return;

    appState.facultySchedules = facultySchedules;
    appState.selectedFaculty = facultyNames[0];

    // Render all faculty as pill buttons — they wrap onto new lines naturally
    facultyNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = `batch-tab${idx === 0 ? ' active' : ''}`;
        btn.textContent = name;
        btn.style.cssText = 'flex-shrink:0;';
        btn.addEventListener('click', () => {
            tabsWrapper.querySelectorAll('.batch-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.selectedFaculty = name;
            renderFacultyGrid(name);
        });
        if (tabsWrapper) tabsWrapper.appendChild(btn);
    });

    // Show first faculty by default
    renderFacultyGrid(facultyNames[0]);
}

// Render the selected faculty's timetable into the grid
function renderFacultyGrid(teacherName) {
    if (!appState.generatedTimetable || !appState.facultySchedules) return;

    const schedule = appState.facultySchedules[teacherName];
    if (!schedule) return;

    const data = appState.generatedTimetable;
    const daysCount = parseInt(data.config.days);
    const theorySlots = parseInt(data.config.theory_slots);
    const labSlots = parseInt(data.config.lab_slots);
    const slotsPerDay = theorySlots + labSlots;

    const titleEl = document.getElementById('current-faculty-title');
    if (titleEl) titleEl.textContent = `Faculty: ${teacherName}`;

    const tableElement = document.getElementById('faculty-table-grid');
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
    const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
            } else if (slots.length === 1) {
                const slot = slots[0];
                const cardColor = getSubjectColors(slot.code || slot.subject);
                td.innerHTML = `
                    <div class="slot-cell active-class" style="background-color:${cardColor}; padding:8px 6px; display:flex; flex-direction:column; gap:4px;">
                        <span class="slot-subject" style="font-weight:700; font-size:12px; line-height:1.2;">${slot.subject}</span>
                        <span class="slot-teacher" style="font-size:11px; font-weight:600; line-height:1.2;"><i class="fa-solid fa-users"></i> ${slot.batch}</span>
                        <span class="slot-room" style="font-size:11px; font-weight:500; line-height:1.2;"><i class="fa-solid fa-location-dot"></i> ${slot.room}</span>
                    </div>`;
            } else {
                const cardColor = getSubjectColors(slots[0].code || slots[0].subject);
                let groupContent = '';
                slots.forEach((slot, idx) => {
                    const borderStyle = idx > 0 ? 'margin-top:5px; padding-top:5px; border-top:1px dashed rgba(0,0,0,0.15);' : '';
                    groupContent += `
                        <div style="${borderStyle} display:flex; flex-direction:column; gap:3px; font-size:11px; line-height:1.2;">
                            <span style="font-weight:700; font-size:12px;">${slot.subject}</span>
                            <span style="font-weight:600;"><i class="fa-solid fa-users"></i> ${slot.batch}</span>
                            <span style="font-weight:500;"><i class="fa-solid fa-location-dot"></i> ${slot.room}</span>
                        </div>`;
                });
                td.innerHTML = `<div class="slot-cell active-class" style="background-color:${cardColor}; padding:8px 6px; display:flex; flex-direction:column; gap:4px;">${groupContent}</div>`;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

/**
 * 4. EXPORT HANDLERS (PDF, EXCEL, NATIVE PRINT)
 */
function setupExportHandlers() {
    const btnPdf = document.getElementById('btn-export-pdf');
    const btnExcel = document.getElementById('btn-export-excel');
    const btnPrint = document.getElementById('btn-print');

    // 1. PDF Export
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            if (!appState.timetableGenerated) return;

            const element = document.getElementById('timetable-pdf-area');
            const batchVal = appState.selectedTimetableBatch || "timetable";

            const opt = {
                margin:       10,
                filename:     `Timetable_${batchVal}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            showToast("Preparing PDF", "Compiling styles and vector pages for download.", "success");
            
            // Run export
            html2pdf().set(opt).from(element).save()
                .then(() => {
                    showToast("PDF Download Complete", `File saved as Timetable_${batchVal}.pdf`, "success");
                })
                .catch(err => {
                    console.error("PDF Export error", err);
                    showToast("PDF Export failed", "An error occurred compiling the PDF document.", "error");
                });
        });
    }

    // 2. Excel Sheets Export
    if (btnExcel) {
        btnExcel.addEventListener('click', () => {
            if (!appState.timetableGenerated || !XLSX) return;

            const data = appState.generatedTimetable;
            const batchName = appState.selectedTimetableBatch;
            const gridData = data.timetable[batchName];

            if (!gridData) return;

            const daysCount = parseInt(data.config.days);
            const theorySlots = parseInt(data.config.theory_slots);
            const labSlots = parseInt(data.config.lab_slots);
            const slotsPerDay = theorySlots + labSlots;
            
            const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

            // Assemble row arrays
            const excelRows = [];
            
            // Build headers
            const headerRow = ["Day / Period"];
            for (let p = 1; p <= slotsPerDay; p++) {
                headerRow.push(`Period ${p}`);
            }
            excelRows.push(headerRow);

            // Fetch cells
            for (let d = 0; d < daysCount; d++) {
                const row = [dayNames[d] || `Day ${d + 1}`];
                for (let p = 0; p < slotsPerDay; p++) {
                    const c = gridData[d][p];
                    if (!c) {
                        row.push("-");
                    } else {
                        // Replace hyphens for clean excel readability
                        row.push(c.replace(/-/g, ' / '));
                    }
                }
                excelRows.push(row);
            }

            // Create workbook sheet using SheetJS
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelRows);
            XLSX.utils.book_append_sheet(wb, ws, "Timetable");

            // Write and download
            XLSX.writeFile(wb, `Timetable_${batchName}.xlsx`);
            showToast("Excel Export Complete", `Spreadsheet exported successfully for batch ${batchName}.`, "success");
        });
    }

    // 3. Print Dialog
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
}

/**
 * 5. TOAST FLOATING NOTIFICATIONS
 */
function showToast(title, bodyText, type = "success") {
    const container = document.getElementById('toast-bin');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconHtml = '<i class="fa-solid fa-circle-check toast-icon"></i>';
    if (type === 'error') {
        iconHtml = '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';
    } else if (type === 'warning') {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation toast-icon"></i>';
    }

    toast.innerHTML = `
        ${iconHtml}
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${bodyText}</p>
        </div>
    `;

    container.appendChild(toast);

    // Destroy toast after 4s
    const removeTimeout = setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 4000);
}

// Global accessor helper
window.showToast = showToast;

/**
 * 6. DARK MODE THEME TOGGLER
 */
function setupThemeToggle() {
    const btn = document.getElementById('dark-mode-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = btn.querySelector('i');
        
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fa-solid fa-sun';
            showToast("Dark Mode Active", "Night scheduling environment turned on.", "success");
            localStorage.setItem('theme', 'dark');
        } else {
            icon.className = 'fa-solid fa-moon';
            showToast("Cream Mode Active", "Eye comfort cream background restored.", "success");
            localStorage.setItem('theme', 'light');
        }
    });

    // Check pre-saved theme setting
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
}

/**
 * 7. ACADEMIC DASHBOARD LOGS AND STATS ENGINE
 */
function setupDashboard() {
    // Fill inventory grids on start
    analyzeDashboardResources();
}

function analyzeDashboardResources() {
    // 1. Calculate count of batch cards
    const batches = document.querySelectorAll('[data-element-type="batch-node"]');
    document.getElementById('stat-departments').textContent = batches.length;

    // 2. Fetch resources list
    let allTeachers = new Set();
    let allTheoryRooms = new Set();
    let allLabRooms = new Set();

    // Rooms lists parses
    const tRoomsStr = document.getElementById('theory-rooms-input').value;
    const lRoomsStr = document.getElementById('lab-rooms-input').value;

    tRoomsStr.split(',').map(s=>s.trim()).filter(s=>s.length > 0).forEach(r => allTheoryRooms.add(r));
    lRoomsStr.split(',').map(s=>s.trim()).filter(s=>s.length > 0).forEach(r => allLabRooms.add(r));

    batches.forEach(b => {
        // Teacher fields
        b.querySelectorAll('.theory-teacher-input').forEach(t => {
            const v = t.value.trim();
            if (v) allTeachers.add(v);
        });
        b.querySelectorAll('.lab-teacher-input').forEach(t => {
            const v = t.value.trim();
            if (v) allTeachers.add(v);
        });
    });

    // Update Counts
    document.getElementById('stat-faculty').textContent = allTeachers.size;
    document.getElementById('stat-rooms').textContent = allTheoryRooms.size + allLabRooms.size;

    // Output Inventories elements
    const formatPillBin = (setObj, elementId) => {
        const bin = document.getElementById(elementId);
        if (!bin) return;
        bin.innerHTML = "";
        
        if (setObj.size === 0) {
            bin.innerHTML = `<span class="pill" style="opacity:0.5;">None</span>`;
            return;
        }

        setObj.forEach(val => {
            const span = document.createElement('span');
            span.className = "pill";
            span.textContent = val;
            bin.appendChild(span);
        });
    };

    formatPillBin(allTheoryRooms, 'inventory-theory-rooms');
    formatPillBin(allLabRooms, 'inventory-lab-rooms');
    formatPillBin(allTeachers, 'inventory-teachers');
}

// Log actions dynamically inside timeline block on dashboard
function logActivity(titleText, summaryText) {
    const list = document.getElementById('timeline-list');
    if (!list) return;

    // Clear empty stats
    const emptyRow = list.querySelector('.empty-state');
    if (emptyRow) emptyRow.remove();

    const date = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = document.createElement('div');
    item.className = "timeline-item";

    item.innerHTML = `
        <div class="timeline-time">${timeStr}</div>
        <div class="timeline-title">${titleText}</div>
        <p style="font-size:12px;">${summaryText}</p>
    `;

    // Prepend log to list top
    list.insertBefore(item, list.firstChild);
}

// ─── University Generator State Handlers ─────────────────────────────────────

function saveUniversityDetails() {
    // 1. Gather high level config values
    const universityName = document.getElementById('university-name')?.value || "";
    const departmentName = document.getElementById('department-name')?.value || "";
    const academicTerm = document.getElementById('academic-term')?.value || "";
    
    const days = document.getElementById('config-days')?.value || "5";
    const theory_slots = document.getElementById('config-theory-slots')?.value || "4";
    const lab_slots = document.getElementById('config-lab-slots')?.value || "3";
    const mutation = document.getElementById('config-mutation')?.value || "0.5";
    const theoryRooms = document.getElementById('theory-rooms-input')?.value || "";
    const labRooms = document.getElementById('lab-rooms-input')?.value || "";

    // 2. Gather batches data
    const batchNodes = document.querySelectorAll('[data-element-type="batch-node"]');
    const batches = [];

    batchNodes.forEach(node => {
        const batchNameInput = node.querySelector('.batch-name-input');
        const yearSelect = node.querySelector('.batch-year-select');
        if (!batchNameInput) return;

        const batchName = batchNameInput.value.trim();
        const yearProgram = yearSelect ? yearSelect.value : "";

        const theory = [];
        const labs = [];

        // Gather theory subjects
        const theoryRows = node.querySelectorAll('[data-row-type="theory-row"]');
        theoryRows.forEach(row => {
            const code = row.querySelector('.theory-code-input')?.value.trim() || "";
            const name = row.querySelector('.theory-name-input')?.value.trim() || "";
            const teacher = row.querySelector('.theory-teacher-input')?.value.trim() || "";
            const group = row.querySelector('.theory-group-input')?.value.trim() || "";
            const credits = parseInt(row.querySelector('.theory-credits-input')?.value || "3");
            
            if (code || name || teacher) { // save even partial rows
                theory.push({ code, name, teacher, group, credits });
            }
        });

        // Gather lab subjects
        const labRows = node.querySelectorAll('[data-row-type="lab-row"]');
        labRows.forEach(row => {
            const code = row.querySelector('.lab-code-input')?.value.trim() || "";
            const name = row.querySelector('.lab-name-input')?.value.trim() || "";
            const teacher = row.querySelector('.lab-teacher-input')?.value.trim() || "";
            const group = row.querySelector('.lab-group-input')?.value.trim() || "";
            
            if (code || name || teacher) { // save even partial rows
                labs.push({ code, name, teacher, group });
            }
        });

        batches.push({
            name: batchName,
            yearProgram: yearProgram,
            theory: theory,
            labs: labs
        });
    });

    const configData = {
        universityName,
        departmentName,
        academicTerm,
        days,
        theory_slots,
        lab_slots,
        mutation,
        theoryRooms,
        labRooms,
        batches
    };

    localStorage.setItem('saved_university_timetable_details', JSON.stringify(configData));
    if (typeof showToast === 'function') {
        showToast("Configuration Saved", "University generator details successfully saved locally.", "success");
    } else {
        alert("University generator details successfully saved locally.");
    }
}

function loadUniversityDetails(silent = false) {
    const dataStr = localStorage.getItem('saved_university_timetable_details');
    if (!dataStr) {
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("No Saved Details Found", "There are no saved university configurations to load.", "warning");
            } else {
                alert("No saved university configurations to load.");
            }
        }
        return false;
    }

    try {
        const data = JSON.parse(dataStr);

        // Fill high level details
        if (document.getElementById('university-name')) document.getElementById('university-name').value = data.universityName || "";
        if (document.getElementById('department-name')) document.getElementById('department-name').value = data.departmentName || "";
        if (document.getElementById('academic-term')) document.getElementById('academic-term').value = data.academicTerm || "";
        
        if (document.getElementById('config-days')) document.getElementById('config-days').value = data.days || "5";
        if (document.getElementById('config-theory-slots')) document.getElementById('config-theory-slots').value = data.theory_slots || "4";
        if (document.getElementById('config-lab-slots')) document.getElementById('config-lab-slots').value = data.lab_slots || "3";
        if (document.getElementById('config-mutation')) document.getElementById('config-mutation').value = data.mutation || "0.5";
        if (document.getElementById('theory-rooms-input')) document.getElementById('theory-rooms-input').value = data.theoryRooms || "";
        if (document.getElementById('lab-rooms-input')) document.getElementById('lab-rooms-input').value = data.labRooms || "";

        // Clear active Batch container
        const wrapper = document.getElementById('batches-wrapper');
        if (wrapper) {
            wrapper.innerHTML = "";
            // Populate each batch preset
            if (data.batches && data.batches.length > 0) {
                data.batches.forEach(batch => {
                    appendBatchCard(batch.name, batch.theory, batch.labs, batch.yearProgram);
                });
            } else {
                appendBatchCard("", [], []);
            }
        }

        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("Configuration Loaded", "Saved university configuration restored successfully.", "success");
            } else {
                alert("Saved university configuration restored successfully.");
            }
        }
        
        // Re-analyze items count on dashboard
        if (typeof analyzeDashboardResources === 'function') {
            analyzeDashboardResources();
        }
        return true;
    } catch (e) {
        console.error("Error loading saved details:", e);
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast("Load Error", "Failed to parse saved configuration.", "error");
            } else {
                alert("Failed to parse saved configuration.");
            }
        }
        return false;
    }
}

function resetUniversityPanel() {
    if (confirm("Are you sure you want to clear the generator panel? All current details will be lost.")) {
        // Reset high level details
        if (document.getElementById('university-name')) document.getElementById('university-name').value = "IIITDM Kancheepuram";
        if (document.getElementById('department-name')) document.getElementById('department-name').value = "";
        if (document.getElementById('academic-term')) document.getElementById('academic-term').value = "1st Sem 2026-2027";
        
        if (document.getElementById('config-days')) document.getElementById('config-days').value = "5";
        if (document.getElementById('config-theory-slots')) document.getElementById('config-theory-slots').value = "4";
        if (document.getElementById('config-lab-slots')) document.getElementById('config-lab-slots').value = "3";
        if (document.getElementById('config-mutation')) document.getElementById('config-mutation').value = "0.5";
        if (document.getElementById('theory-rooms-input')) document.getElementById('theory-rooms-input').value = "R101, R102";
        if (document.getElementById('lab-rooms-input')) document.getElementById('lab-rooms-input').value = "LAB1, LAB2";

        // Clear and add one empty batch card
        const wrapper = document.getElementById('batches-wrapper');
        if (wrapper) {
            wrapper.innerHTML = "";
            appendBatchCard("", [], []);
        }

        if (typeof showToast === 'function') {
            showToast("Form Reset", "Generator panel reset to default clean state.", "success");
        } else {
            alert("Generator panel reset to default clean state.");
        }
        
        if (typeof analyzeDashboardResources === 'function') {
            analyzeDashboardResources();
        }
    }
}

// Expose functions globally
window.saveUniversityDetails = saveUniversityDetails;
window.loadUniversityDetails = loadUniversityDetails;
window.resetUniversityPanel = resetUniversityPanel;
