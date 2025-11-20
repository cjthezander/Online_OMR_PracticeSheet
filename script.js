// --- State Management ---
const state = {
    timerMode: 'stopwatch', // 'stopwatch' or 'countdown'
    timerInterval: null,
    startTime: 0,
    elapsedTime: 0,
    countdownDuration: 0,
    isRunning: false,
    answers: {}, // { qIndex: optionIndex }
    answerKey: [] // Array of correct option indices
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const user = auth.checkAuth();

    // Pre-fill Student Name
    if (user && user.username) {
        const nameInput = document.getElementById('studentName');
        if (nameInput) nameInput.value = user.username;
    }

    // Load Saved Progress
    const savedProgress = localStorage.getItem('omr_progress');
    if (savedProgress) {
        try {
            state.answers = JSON.parse(savedProgress);
            console.log('Loaded saved progress:', state.answers);
        } catch (e) {
            console.error('Failed to load progress', e);
        }
    }

    // Initialize with default view
    generateOMR();
});

// --- Timer Logic ---

function switchTimerMode(mode) {
    stopTimerLogic();
    state.timerMode = mode;

    // Update UI
    document.getElementById('btn-stopwatch').classList.toggle('active', mode === 'stopwatch');
    document.getElementById('btn-countdown').classList.toggle('active', mode === 'countdown');

    const countdownInputs = document.getElementById('countdown-inputs');
    if (mode === 'countdown') {
        countdownInputs.classList.remove('hidden');
        updateTimerDisplay(getCountdownInputSeconds());
    } else {
        countdownInputs.classList.add('hidden');
        updateTimerDisplay(0);
    }
}

function getCountdownInputSeconds() {
    const h = parseInt(document.getElementById('hoursCount').value) || 0;
    const m = parseInt(document.getElementById('minutesCount').value) || 0;
    const s = parseInt(document.getElementById('secondsCount').value) || 0;
    return (h * 3600) + (m * 60) + s;
}

function updateTimerDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const formatted =
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    document.getElementById('timer-display-main').textContent = formatted;
}

function startTimerLogic() {
    if (state.isRunning) return;

    if (state.timerMode === 'stopwatch') {
        state.startTime = Date.now() - state.elapsedTime;
        state.timerInterval = setInterval(() => {
            state.elapsedTime = Date.now() - state.startTime;
            updateTimerDisplay(Math.floor(state.elapsedTime / 1000));
        }, 1000);
    } else {
        // Countdown
        let remaining = state.countdownDuration > 0 ? state.countdownDuration : getCountdownInputSeconds();

        if (remaining <= 0) return; // Don't start if 0

        state.countdownDuration = remaining; // Save for pause resume
        updateTimerDisplay(remaining);

        state.timerInterval = setInterval(() => {
            remaining--;
            state.countdownDuration = remaining;
            updateTimerDisplay(remaining);

            if (remaining <= 0) {
                stopTimerLogic();
                alert("Time's up!");
            }
        }, 1000);
    }

    state.isRunning = true;
}

function stopTimerLogic() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    state.isRunning = false;
}

function resetTimerLogic() {
    stopTimerLogic();
    state.elapsedTime = 0;
    state.countdownDuration = 0;

    if (state.timerMode === 'stopwatch') {
        updateTimerDisplay(0);
    } else {
        updateTimerDisplay(getCountdownInputSeconds());
    }
}

// --- OMR Generation ---

function generateOMR() {
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const numOptions = parseInt(document.getElementById('numOptions').value);
    const container = document.getElementById('omrSheet');

    // Update Header Info
    document.getElementById('displayExamName').textContent =
        document.getElementById('examName').value || 'Exam Name';
    document.getElementById('displayStudentInfo').textContent =
        `${document.getElementById('studentName').value || 'Student'} | ${document.getElementById('rollNumber').value || 'Roll No'}`;

    container.innerHTML = ''; // Clear existing

    const optionsLabels = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 1; i <= numQuestions; i++) {
        const row = document.createElement('div');
        row.className = 'question-row';

        const qNum = document.createElement('div');
        qNum.className = 'q-num';
        qNum.textContent = i;
        row.appendChild(qNum);

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        for (let j = 0; j < numOptions; j++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.textContent = optionsLabels[j];
            bubble.onclick = () => selectOption(i, j, bubble);

            // Restore selection if exists
            if (state.answers[i] === j) {
                bubble.classList.add('selected');
            }

            optionsContainer.appendChild(bubble);
        }

        row.appendChild(optionsContainer);
        container.appendChild(row);
    }
}

function selectOption(qIndex, optIndex, bubbleElement) {
    // Deselect others in row
    const parent = bubbleElement.parentElement;
    Array.from(parent.children).forEach(child => child.classList.remove('selected'));

    // Select clicked
    bubbleElement.classList.add('selected');
    state.answers[qIndex] = optIndex;
}

// --- Answer Handling ---

function setManualKey() {
    const input = document.getElementById('manualAnswerKey').value;
    if (!input) return;

    const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
    state.answerKey = input.toUpperCase().split(',').map(k => map[k.trim()]);
    alert('Answer Key Set!');
}

function saveAnswers() {
    // In a real app, this would send to backend
    localStorage.setItem('omr_progress', JSON.stringify(state.answers));
    alert('Progress Saved Locally!');
}

function checkAnswers() {
    if (state.answerKey.length === 0) {
        alert('Please set an Answer Key first (Admin Tools).');
        return;
    }

    let score = 0;
    let correctCount = 0;
    const total = state.answerKey.length;

    // Visual Feedback
    const rows = document.querySelectorAll('.question-row');

    rows.forEach((row, index) => {
        if (index >= total) return;

        const options = row.querySelectorAll('.bubble');
        const correctOptIndex = state.answerKey[index];
        const userOptIndex = state.answers[index + 1]; // answers are 1-based

        // Highlight correct answer
        if (options[correctOptIndex]) {
            options[correctOptIndex].style.borderColor = 'var(--success-color)';
            options[correctOptIndex].style.color = 'var(--success-color)';
        }

        if (userOptIndex === correctOptIndex) {
            score++;
            correctCount++;
            row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'; // Light green
        } else if (userOptIndex !== undefined) {
            // Wrong answer
            options[userOptIndex].style.backgroundColor = 'var(--danger-color)';
            options[userOptIndex].style.color = 'white';
            options[userOptIndex].style.borderColor = 'var(--danger-color)';
        }
    });

    alert(`Score: ${score} / ${total}`);
}

// --- Theme Toggle ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// --- PDF Download ---
function downloadPDF() {
    const element = document.getElementById('omrSheetContainer');
    const examName = document.getElementById('examName').value || 'OMR_Sheet';
    const studentName = document.getElementById('studentName').value || 'Student';

    const opt = {
        margin: [10, 10, 10, 10],
        filename: `${examName}_${studentName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Temporarily hide buttons for clean PDF
    const buttons = document.querySelectorAll('.omr-header-actions button');
    buttons.forEach(btn => btn.style.display = 'none');

    html2pdf().set(opt).from(element).save().then(() => {
        // Restore buttons
        buttons.forEach(btn => btn.style.display = '');
    }).catch(err => {
        console.error('PDF generation failed:', err);
        alert('Failed to generate PDF. Please try again.');
        buttons.forEach(btn => btn.style.display = '');
    });
}

// --- Reset Answers ---
function resetAnswers() {
    if (confirm('Are you sure you want to reset all answers? This cannot be undone.')) {
        state.answers = {};
        localStorage.removeItem('omr_progress');

        // Re-render to clear UI
        const bubbles = document.querySelectorAll('.bubble');
        bubbles.forEach(b => b.classList.remove('selected'));

        alert('All answers have been reset.');
    }
}
