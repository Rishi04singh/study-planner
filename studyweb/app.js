/* ===== StudyFlow — App logic ===== */

const STORAGE_KEYS = {
  slots: 'studyflow_slots',
  tasks: 'studyflow_tasks',
  pins: 'studyflow_pins',
  goals: 'studyflow_goals',
  notes: 'studyflow_notes',
  theme: 'studyflow_theme',
  notifications: 'studyflow_notifications',
  weekOffset: 'studyflow_weekOffset',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6:00 to 19:00

const MOTIVATION_QUOTES = [
  "The only way to do great work is to love what you're learning.",
  "Small steps every day lead to big results. You've got this.",
  "Don't wish for it—work for it. Your future is built today.",
  "Every expert was once a beginner. Keep going.",
  "Study hard, dream big. Your efforts will pay off.",
  "The secret of getting ahead is getting started.",
  "Believe in yourself. You are smarter than you think.",
  "Success is the sum of small efforts repeated every day.",
  "Your only limit is you. Push past it.",
  "Learn something new every day. Growth never stops.",
  "Today's study is tomorrow's success.",
  "Stay focused. Stay curious. Stay hungry to learn.",
  "Hard work beats talent when talent doesn't work hard.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every chapter you finish is a step closer to your goal.",
  "Trust the process. Consistency beats intensity.",
  "Make today count. Your future self will thank you.",
];

// ----- State -----
let state = {
  slots: [],
  tasks: [],
  pins: [],
  goals: [],
  notes: [],
  weekOffset: 0,
  notificationsEnabled: false,
  timerInterval: null,
  timerSeconds: 25 * 60,
  timerRunning: false,
  reminderCheckInterval: null,
};

// ----- Helpers -----
function loadState() {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    if (theme) document.body.setAttribute('data-theme', theme);
    const notif = localStorage.getItem(STORAGE_KEYS.notifications);
    state.notificationsEnabled = notif === 'true';
    state.weekOffset = parseInt(localStorage.getItem(STORAGE_KEYS.weekOffset) || '0', 10);
    state.slots = JSON.parse(localStorage.getItem(STORAGE_KEYS.slots) || '[]');
    state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || '[]');
    state.pins = JSON.parse(localStorage.getItem(STORAGE_KEYS.pins) || '[]');
    state.goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.goals) || '[]');
    state.notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || '[]');
  } catch (e) {
    console.warn('Load state error', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.slots, JSON.stringify(state.slots));
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.pins, JSON.stringify(state.pins));
    localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(state.goals));
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
    localStorage.setItem(STORAGE_KEYS.weekOffset, String(state.weekOffset));
    localStorage.setItem(STORAGE_KEYS.notifications, String(state.notificationsEnabled));
  } catch (e) {
    console.warn('Save state error', e);
  }
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatWeekLabel(dates) {
  const first = dates[0];
  const last = dates[6];
  const sameMonth = first.getMonth() === last.getMonth();
  if (sameMonth) {
    return `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
  }
  return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function showToast(message, isWarning = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('warning', isWarning);
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 3500);
}

function pickMotivationQuote() {
  return MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
}

function updateMotivation() {
  const quote = pickMotivationQuote();
  const heroQuote = document.getElementById('heroQuote');
  const motivationText = document.getElementById('motivationText');
  if (heroQuote) heroQuote.textContent = quote;
  if (motivationText) motivationText.textContent = quote;
}

// ----- Modals -----
function openModal(modalId) {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  document.getElementById('modalOverlay').classList.add('open');
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'block';
}

function closeModals() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModals();
});
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeModals));

// ----- Tabs -----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const id = 'panel-' + tab.dataset.tab;
    const panel = document.getElementById(id);
    if (panel) panel.classList.add('active');
    if (tab.dataset.tab === 'stats') renderStats();
    if (tab.dataset.tab === 'news') fetchNews();
  });
});

// ----- Theme -----
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.theme, next);
  themeToggle.textContent = next === 'light' ? '🌙' : '☀';
});
if (document.body.getAttribute('data-theme') === 'light') themeToggle.textContent = '🌙';

// ----- Notifications -----
document.getElementById('notifyToggle').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser.', true);
    return;
  }
  if (Notification.permission === 'granted') {
    state.notificationsEnabled = !state.notificationsEnabled;
    saveState();
    showToast(state.notificationsEnabled ? 'Reminders enabled.' : 'Reminders disabled.');
    return;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    state.notificationsEnabled = perm === 'granted';
    saveState();
    showToast(perm === 'granted' ? 'Reminders enabled!' : 'Permission denied.');
  }
});

function notify(title, body) {
  if (state.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch (e) {}
  }
  showToast(body || title, false);
}

// ----- Timetable -----
function slotToDate(slot, weekDates) {
  const d = weekDates[slot.day];
  if (!d) return null;
  const [h, m] = slot.start.split(':').map(Number);
  const date = new Date(d);
  date.setHours(h, m, 0, 0);
  return date;
}

function renderTimetable() {
  const grid = document.getElementById('timetableGrid');
  const weekDates = getWeekDates(state.weekOffset);
  grid.innerHTML = '';

  // Header row: empty + days
  const headerRow = document.createElement('div');
  headerRow.className = 'timetable-cell header-cell';
  headerRow.textContent = '';
  grid.appendChild(headerRow);
  weekDates.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'timetable-cell header-cell';
    cell.textContent = d.getDate() + ' ' + DAYS[d.getDay()];
    grid.appendChild(cell);
  });

  // Time rows
  for (const hour of HOURS) {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'timetable-cell time-cell';
    timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
    grid.appendChild(timeLabel);

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('div');
      cell.className = 'timetable-cell';
      cell.dataset.day = day;
      cell.dataset.hour = hour;

      const weekStartStr = weekDates[0].toDateString();
      const daySlots = state.slots.filter(s => {
        const slotWeekStart = s.weekStart || (state.weekOffset === 0 ? weekStartStr : null);
        if (slotWeekStart !== weekStartStr) return false;
        return s.day === day && parseInt(s.start.split(':')[0], 10) === hour;
      });

      daySlots.forEach(slot => {
        const card = document.createElement('div');
        card.className = 'slot-card' + (slot.done ? ' done' : '');
        card.dataset.id = slot.id;
        card.innerHTML = `
          <div>
            <span class="slot-subject">${escapeHtml(slot.subject)}</span>
            <span class="slot-time">${slot.start} (${slot.duration}m)</span>
          </div>
          <div class="slot-card-actions">
            <input type="checkbox" ${slot.done ? 'checked' : ''} title="Mark done" />
            <button type="button" class="btn btn-secondary" title="Edit">Edit</button>
            <button type="button" class="btn btn-danger" title="Delete">Del</button>
          </div>
        `;
        card.querySelector('input').addEventListener('change', (e) => {
          e.stopPropagation();
          toggleSlotDone(slot.id);
        });
        card.querySelector('button.btn-secondary').addEventListener('click', (e) => {
          e.stopPropagation();
          openEditSlotModal(slot);
        });
        card.querySelector('button.btn-danger').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSlot(slot.id);
        });
        cell.appendChild(card);
      });
      grid.appendChild(cell);
    }
  }

  document.getElementById('weekLabel').textContent = state.weekOffset === 0 ? 'This week' : formatWeekLabel(weekDates);
}

function getWeekForSlot(slot) {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day + state.weekOffset * 7);
  const d = new Date(start);
  d.setDate(start.getDate() + slot.day);
  return d;
}

function toggleSlotDone(slotId) {
  const slot = state.slots.find(s => s.id === slotId);
  if (slot) {
    slot.done = !slot.done;
    saveState();
    renderTimetable();
    updateStudyNowBanner();
    showToast(slot.done ? 'Marked as done!' : 'Unmarked.');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('prevWeek').addEventListener('click', () => {
  state.weekOffset--;
  saveState();
  renderTimetable();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  state.weekOffset++;
  saveState();
  renderTimetable();
});

function exportTimetable() {
  const weekDates = getWeekDates(state.weekOffset);
  const weekStartStr = weekDates[0].toDateString();
  const slots = state.slots.filter(s => (s.weekStart || (state.weekOffset === 0 ? weekStartStr : null)) === weekStartStr);
  const rows = [
    ['Day', 'Date', 'Start', 'Duration (min)', 'Subject', 'Done'],
    ...slots.map(s => {
      const d = weekDates[s.day];
      return [
        DAYS[d.getDay()],
        d.toLocaleDateString(),
        s.start,
        s.duration,
        s.subject,
        s.done ? 'Yes' : 'No',
      ];
    }),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `studyflow-timetable-${weekStartStr.replace(/\s/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Timetable exported.');
}

document.getElementById('exportTimetableBtn').addEventListener('click', exportTimetable);

// Add slot modal
const slotForm = document.getElementById('slotForm');
const slotModal = document.getElementById('slotModal');
const daySelect = slotForm.querySelector('select[name="day"]');

function openEditSlotModal(slot) {
  daySelect.innerHTML = '';
  const weekDates = getWeekDates(state.weekOffset);
  weekDates.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${DAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
    if (i === slot.day) opt.selected = true;
    daySelect.appendChild(opt);
  });
  slotForm.querySelector('input[name="slotId"]').value = slot.id;
  slotForm.querySelector('select[name="day"]').value = slot.day;
  slotForm.querySelector('input[name="start"]').value = slot.start;
  slotForm.querySelector('input[name="duration"]').value = slot.duration;
  slotForm.querySelector('input[name="subject"]').value = slot.subject;
  document.getElementById('slotModalTitle').textContent = 'Edit study slot';
  document.getElementById('slotSubmitBtn').textContent = 'Update';
  openModal('slotModal');
}

function deleteSlot(slotId) {
  if (!confirm('Delete this study slot?')) return;
  state.slots = state.slots.filter(s => s.id !== slotId);
  saveState();
  renderTimetable();
  updateStudyNowBanner();
  showToast('Slot deleted.');
}

document.getElementById('addSlotBtn').addEventListener('click', () => {
  slotForm.querySelector('input[name="slotId"]').value = '';
  daySelect.innerHTML = '';
  const weekDates = getWeekDates(state.weekOffset);
  weekDates.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${DAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
    daySelect.appendChild(opt);
  });
  slotForm.reset();
  slotForm.querySelector('input[name="duration"]').value = 60;
  slotForm.querySelector('input[name="slotId"]').value = '';
  document.getElementById('slotModalTitle').textContent = 'Add study slot';
  document.getElementById('slotSubmitBtn').textContent = 'Save';
  openModal('slotModal');
});

slotForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(slotForm);
  const slotId = fd.get('slotId');
  const weekDates = getWeekDates(state.weekOffset);
  const payload = {
    day: parseInt(fd.get('day'), 10),
    start: fd.get('start'),
    duration: parseInt(fd.get('duration'), 10),
    subject: fd.get('subject').trim(),
    weekStart: weekDates[0].toDateString(),
  };
  if (slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (slot) {
      slot.day = payload.day;
      slot.start = payload.start;
      slot.duration = payload.duration;
      slot.subject = payload.subject;
      slot.weekStart = payload.weekStart;
    }
    saveState();
    closeModals();
    renderTimetable();
    showToast('Slot updated!');
  } else {
    state.slots.push({
      id: id(),
      ...payload,
      done: false,
    });
    saveState();
    closeModals();
    renderTimetable();
    showToast('Study slot added!');
  }
});

// ----- Tasks -----
function renderTasks() {
  const list = document.getElementById('tasksList');
  if (state.tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No tasks yet.</p><p>Add one and mark it done when you finish!</p></div>';
    return;
  }
  list.innerHTML = state.tasks.map(task => `
    <div class="task-item ${task.done ? 'done' : ''}" data-id="${task.id}">
      <input type="checkbox" ${task.done ? 'checked' : ''} />
      <div>
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.due ? `<div class="task-due">Due: ${new Date(task.due).toLocaleString()}</div>` : ''}
      </div>
      <button class="btn btn-danger" data-delete>Delete</button>
    </div>
  `).join('');

  list.querySelectorAll('.task-item').forEach(item => {
    const taskId = item.dataset.id;
    item.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      const t = state.tasks.find(x => x.id === taskId);
      if (t) { t.done = !t.done; saveState(); renderTasks(); showToast(t.done ? 'Task done!' : 'Reopened.'); }
    });
    item.querySelector('[data-delete]')?.addEventListener('click', () => {
      state.tasks = state.tasks.filter(x => x.id !== taskId);
      saveState();
      renderTasks();
    });
  });
}

document.getElementById('addTaskBtn').addEventListener('click', () => openModal('taskModal'));
document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const due = fd.get('due');
  state.tasks.push({
    id: id(),
    title: fd.get('title').trim(),
    due: due || null,
    done: false,
  });
  saveState();
  closeModals();
  renderTasks();
  showToast('Task added!');
});

// ----- Pins (remind later) -----
function renderPins() {
  const list = document.getElementById('pinsList');
  const now = new Date();
  if (state.pins.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Nothing pinned.</p><p>Pin something to do later and we’ll remind you!</p></div>';
    return;
  }
  list.innerHTML = state.pins.map(pin => {
    const remindAt = new Date(pin.remindAt);
    const past = remindAt <= now;
    return `
      <div class="pin-item ${past ? 'past' : ''}" data-id="${pin.id}">
        <div>
          <div class="pin-title">${escapeHtml(pin.title)}</div>
          <div class="pin-remind">Remind: ${remindAt.toLocaleString()}</div>
        </div>
        <button class="btn btn-danger" data-delete>Remove</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.pin-item').forEach(item => {
    const pinId = item.dataset.id;
    item.querySelector('[data-delete]')?.addEventListener('click', () => {
      state.pins = state.pins.filter(x => x.id !== pinId);
      saveState();
      renderPins();
    });
  });
}

document.getElementById('addPinBtn').addEventListener('click', () => openModal('pinModal'));
document.getElementById('pinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.pins.push({
    id: id(),
    title: fd.get('title').trim(),
    remindAt: fd.get('remindAt'),
  });
  saveState();
  closeModals();
  renderPins();
  showToast('Pinned! We’ll remind you at that time.');
});

// ----- Pinned & study reminders (time running) -----
function checkReminders() {
  const now = new Date();
  state.pins.forEach(pin => {
    const remindAt = new Date(pin.remindAt);
    const diff = remindAt - now;
    if (diff > 0 && diff <= 60000) {
      notify('StudyFlow reminder', pin.title);
      state.pins = state.pins.filter(p => p.id !== pin.id);
      saveState();
      renderPins();
    }
  });
}

function startStudyReminderInterval() {
  if (state.reminderCheckInterval) return;
  state.reminderCheckInterval = setInterval(() => {
    checkReminders();
  }, 30000);
}

// ----- Focus timer -----
function formatTimer(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = formatTimer(state.timerSeconds);
}

function getTimerSecondsFromMode() {
  const activeMode = document.querySelector('.timer-mode-btn.active');
  if (!activeMode) return 25 * 60;
  const min = activeMode.dataset.min;
  if (min === 'custom') {
    const minInput = document.getElementById('timerCustomMinutes');
    const secInput = document.getElementById('timerCustomSeconds');
    const m = Math.max(0, parseInt(minInput?.value || '0', 10));
    const s = Math.max(0, Math.min(59, parseInt(secInput?.value || '0', 10)));
    return m * 60 + s || 60;
  }
  return parseInt(min, 10) * 60;
}

function applyCustomTime() {
  const minInput = document.getElementById('timerCustomMinutes');
  const secInput = document.getElementById('timerCustomSeconds');
  const m = Math.max(0, Math.min(240, parseInt(minInput?.value || '0', 10)));
  const s = Math.max(0, Math.min(59, parseInt(secInput?.value || '0', 10)));
  const total = m * 60 + s;
  state.timerSeconds = total > 0 ? total : 60;
  if (minInput) minInput.value = Math.floor(state.timerSeconds / 60);
  if (secInput) secInput.value = state.timerSeconds % 60;
  updateTimerDisplay();
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.timerRunning = false;
}

document.querySelectorAll('.timer-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const min = btn.dataset.min;
    stopTimer();
    if (min === 'custom') {
      const section = document.getElementById('timerCustomSection');
      if (section) section.classList.add('show');
      applyCustomTime();
    } else {
      const section = document.getElementById('timerCustomSection');
      if (section) section.classList.remove('show');
      state.timerSeconds = parseInt(min, 10) * 60;
      updateTimerDisplay();
    }
  });
});

document.getElementById('timerApplyCustom')?.addEventListener('click', () => {
  applyCustomTime();
  stopTimer();
  const startBtn = document.getElementById('timerStart');
  if (startBtn) startBtn.textContent = 'Start';
  showToast('Custom time set. Press Start when ready.');
});

document.getElementById('timerStart')?.addEventListener('click', () => {
  if (state.timerRunning) {
    stopTimer();
    state.timerRunning = false;
    document.getElementById('timerStart').textContent = 'Start';
    return;
  }
  state.timerRunning = true;
  document.getElementById('timerStart').textContent = 'Pause';
  state.timerInterval = setInterval(() => {
    state.timerSeconds = Math.max(0, state.timerSeconds - 1);
    updateTimerDisplay();
    if (state.timerSeconds <= 0) {
      stopTimer();
      state.timerRunning = false;
      document.getElementById('timerStart').textContent = 'Start';
      state.timerSeconds = getTimerSecondsFromMode();
      updateTimerDisplay();
      notify('Time’s up!', 'Take a break or start another focus session.');
      showToast('Time’s up! Take a break.');
    }
  }, 1000);
});

document.getElementById('timerReset')?.addEventListener('click', () => {
  stopTimer();
  state.timerRunning = false;
  document.getElementById('timerStart').textContent = 'Start';
  state.timerSeconds = getTimerSecondsFromMode();
  updateTimerDisplay();
});

// ----- Goals -----
function renderGoals() {
  const list = document.getElementById('goalsList');
  if (state.goals.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No goals yet.</p><p>Set a study goal and track it!</p></div>';
    return;
  }
  list.innerHTML = state.goals.map(goal => `
    <div class="goal-item" data-id="${goal.id}">
      <input type="checkbox" ${goal.done ? 'checked' : ''} />
      <div>
        <div class="goal-title">${escapeHtml(goal.title)}</div>
        ${goal.targetDate ? `<div class="task-due">Target: ${new Date(goal.targetDate).toLocaleDateString()}</div>` : ''}
      </div>
      <button class="btn btn-danger" data-delete>Delete</button>
    </div>
  `).join('');

  list.querySelectorAll('.goal-item').forEach(item => {
    const goalId = item.dataset.id;
    item.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      const g = state.goals.find(x => x.id === goalId);
      if (g) { g.done = !g.done; saveState(); renderGoals(); }
    });
    item.querySelector('[data-delete]')?.addEventListener('click', () => {
      state.goals = state.goals.filter(x => x.id !== goalId);
      saveState();
      renderGoals();
    });
  });
}

document.getElementById('addGoalBtn').addEventListener('click', () => openModal('goalModal'));
document.getElementById('goalForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const target = fd.get('targetDate');
  state.goals.push({
    id: id(),
    title: fd.get('title').trim(),
    targetDate: target || null,
    done: false,
  });
  saveState();
  closeModals();
  renderGoals();
  showToast('Goal added!');
});

// ----- Notes -----
function renderNotes() {
  const grid = document.getElementById('notesGrid');
  if (state.notes.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>No notes yet.</p><p>Add quick notes for revision!</p></div>';
    return;
  }
  grid.innerHTML = state.notes.map(note => `
    <div class="note-card" data-id="${note.id}">
      <div class="note-title">${escapeHtml(note.title || 'Untitled')}</div>
      <div class="note-content">${escapeHtml(note.content || '')}</div>
      <div class="note-actions">
        <button type="button" class="btn btn-primary btn-small" data-view-full>View full</button>
        <button class="btn btn-danger btn-small" data-delete>Delete</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.note-card').forEach(card => {
    const noteId = card.dataset.id;
    const note = state.notes.find(n => n.id === noteId);
    card.querySelector('[data-view-full]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (note) openViewNoteModal(note);
    });
    card.querySelector('[data-delete]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.notes = state.notes.filter(x => x.id !== noteId);
      saveState();
      renderNotes();
    });
  });
}

function openViewNoteModal(note) {
  document.getElementById('viewNoteTitle').textContent = note.title || 'Untitled';
  const contentEl = document.getElementById('viewNoteContent');
  contentEl.textContent = note.content || '(No content)';
  contentEl.style.whiteSpace = 'pre-wrap';
  document.getElementById('viewNoteModal').dataset.noteId = note.id;
  openModal('viewNoteModal');
}

document.getElementById('viewNoteEditBtn')?.addEventListener('click', () => {
  const noteId = document.getElementById('viewNoteModal').dataset.noteId;
  const note = state.notes.find(n => n.id === noteId);
  if (!note) return;
  closeModals();
  document.getElementById('noteModalTitle').textContent = 'Edit note';
  document.getElementById('noteSubmitBtn').textContent = 'Update';
  document.getElementById('noteForm').querySelector('input[name="noteId"]').value = note.id;
  document.getElementById('noteForm').querySelector('input[name="title"]').value = note.title || '';
  document.getElementById('noteForm').querySelector('textarea[name="content"]').value = note.content || '';
  openModal('noteModal');
});

document.getElementById('addNoteBtn').addEventListener('click', () => {
  document.getElementById('noteModalTitle').textContent = 'New note';
  document.getElementById('noteSubmitBtn').textContent = 'Save';
  document.getElementById('noteForm').reset();
  document.getElementById('noteForm').querySelector('input[name="noteId"]').value = '';
  openModal('noteModal');
});
document.getElementById('noteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const noteId = fd.get('noteId');
  const title = (fd.get('title') || '').trim() || 'Untitled';
  const content = (fd.get('content') || '').trim();
  if (noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (note) {
      note.title = title;
      note.content = content;
    }
    saveState();
    closeModals();
    renderNotes();
    showToast('Note updated!');
  } else {
    state.notes.push({ id: id(), title, content });
    saveState();
    closeModals();
    renderNotes();
    showToast('Note saved!');
  }
});

// ----- "Time is running — study" reminder -----
function hasActiveSlotNow() {
  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const weekStartStr = getWeekDates(0)[0].toDateString();

  return state.slots.some(slot => {
    const slotWeekStart = slot.weekStart || getWeekDates(0)[0].toDateString();
    if (slotWeekStart !== weekStartStr) return false;
    if (slot.day !== day) return false;
    const [h, m] = slot.start.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + slot.duration;
    return currentMinutes >= startMin && currentMinutes < endMin && !slot.done;
  });
}

function updateStudyNowBanner() {
  const banner = document.getElementById('studyNowBanner');
  if (hasActiveSlotNow()) {
    banner.removeAttribute('hidden');
  } else {
    banner.setAttribute('hidden', '');
  }
}

function maybeShowStudyReminder() {
  updateStudyNowBanner();
  if (!hasActiveSlotNow()) return;

  if (state.notificationsEnabled) {
    const lastShown = parseInt(sessionStorage.getItem('studyflow_last_reminder') || '0', 10);
    if (Date.now() - lastShown > 60000) {
      sessionStorage.setItem('studyflow_last_reminder', String(Date.now()));
      notify('Time is running!', 'You have a study slot now — get to it!');
    }
  }
}

document.getElementById('studyNowDismiss')?.addEventListener('click', () => {
  document.getElementById('studyNowBanner').setAttribute('hidden', '');
});

setInterval(maybeShowStudyReminder, 60000);

// ----- Stats -----
function renderStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  const weekDates = getWeekDates(0);
  const weekStartStr = weekDates[0].toDateString();
  const weekSlots = state.slots.filter(s => (s.weekStart || weekStartStr) === weekStartStr);
  const slotsDone = weekSlots.filter(s => s.done).length;
  const tasksDone = state.tasks.filter(t => t.done).length;
  const goalsDone = state.goals.filter(g => g.done).length;

  const stats = [
    { value: weekSlots.length, label: 'Study slots this week', img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=96&h=96&fit=crop' },
    { value: slotsDone, label: 'Slots completed', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=96&h=96&fit=crop' },
    { value: state.tasks.length, label: 'Total tasks', img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=96&h=96&fit=crop' },
    { value: tasksDone, label: 'Tasks done', img: null },
    { value: state.goals.length, label: 'Goals set', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=96&h=96&fit=crop' },
    { value: goalsDone, label: 'Goals achieved', img: null },
    { value: state.notes.length, label: 'Notes', img: null },
    { value: state.pins.length, label: 'Pinned reminders', img: null },
  ];

  grid.innerHTML = stats.map((s, i) => `
    <div class="stat-card">
      ${s.img ? `<img src="${s.img}" alt="" />` : ''}
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${escapeHtml(s.label)}</div>
    </div>
  `).join('');
}

// ----- Trending News -----
const NEWS_RSS = 'https://feeds.bbci.co.uk/news/world/rss.xml';
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(NEWS_RSS);

let newsCache = [];

function fetchNews() {
  const loading = document.getElementById('newsLoading');
  const list = document.getElementById('newsList');
  if (loading) loading.classList.remove('hidden');
  if (list) list.innerHTML = '';

  fetch(RSS2JSON)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok' && data.items && data.items.length) {
        newsCache = data.items.slice(0, 15);
        renderNews(newsCache);
      } else {
        if (list) list.innerHTML = '<p class="empty-state">Could not load news. Try again later.</p>';
      }
    })
    .catch(() => {
      if (list) list.innerHTML = '<p class="empty-state">Failed to load news. Check your connection.</p>';
    })
    .finally(() => {
      if (loading) loading.classList.add('hidden');
    });
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  if (!list) return;
  list.innerHTML = items.map(item => {
    const title = escapeHtml(item.title || '');
    const link = escapeHtml(item.link || '#');
    const desc = escapeHtml((item.description || '').replace(/<[^>]+>/g, '').slice(0, 150));
    const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString() : '';
    return `
      <article class="news-item">
        <div class="news-item-title"><a href="${link}" target="_blank" rel="noopener">${title}</a></div>
        ${desc ? `<div class="news-item-desc">${desc}…</div>` : ''}
        ${date ? `<div class="news-item-date">${date}</div>` : ''}
      </article>
    `;
  }).join('');
}

document.getElementById('newsRefreshBtn')?.addEventListener('click', fetchNews);

// ----- Brain Games -----
const MEMORY_EMOJIS = ['📚', '✏️', '🔬', '🌍', '💡', '📐', '🎯', '⭐'];
const MATH_OPS = ['+', '-', '*'];
const WORD_LIST = ['STUDY', 'LEARN', 'BRAIN', 'FOCUS', 'GOALS', 'NOTES', 'BOOKS', 'CLASS', 'QUIZ', 'GRADE', 'EXAM', 'LOGIC', 'TREND', 'SMART', 'SHARP'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  return shuffle(word.split('')).join('');
}

function renderGameArea(html) {
  const area = document.getElementById('gameArea');
  if (area) area.innerHTML = html;
}

function gameBackBtn() {
  return '<button type="button" class="btn btn-secondary game-back" data-game-back>← Back to games</button>';
}

// Memory Match
function startMemoryGame() {
  const pairs = shuffle([...MEMORY_EMOJIS, ...MEMORY_EMOJIS]).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
  let firstCard = null;
  let lock = false;

  function render() {
    const grid = pairs.map((p, i) => `
      <div class="memory-card ${p.flipped || p.matched ? 'flipped' : ''} ${p.matched ? 'matched' : ''}" data-idx="${i}">
        ${p.flipped || p.matched ? p.emoji : '<span class="card-back">?</span>'}
      </div>
    `).join('');
    renderGameArea(gameBackBtn() + '<div class="game-title">Find matching pairs. Click two cards.</div><div class="memory-grid" id="memoryGrid">' + grid + '</div>');

    document.getElementById('memoryGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.memory-card');
      if (!card || lock) return;
      const idx = parseInt(card.dataset.idx, 10);
      const p = pairs[idx];
      if (p.flipped || p.matched) return;
      p.flipped = true;
      render();
      if (!firstCard) { firstCard = p; return; }
      lock = true;
      if (firstCard.emoji === p.emoji) {
        firstCard.matched = true;
        p.matched = true;
        firstCard = null;
        lock = false;
        render();
        if (pairs.every(x => x.matched)) setTimeout(() => showToast('You won! Well done!'), 300);
      } else {
        setTimeout(() => {
          firstCard.flipped = false;
          p.flipped = false;
          firstCard = null;
          lock = false;
          render();
        }, 600);
      }
    });
  }
  render();
}

// Quick Math
function startMathGame() {
  let score = 0;
  let qIndex = 0;
  const total = 10;
  let a = 0, b = 0, op = '+', answer = 0;

  function nextQuestion() {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 15) + 1;
    const o = MATH_OPS[Math.floor(Math.random() * MATH_OPS.length)];
    op = o;
    if (o === '+') answer = a + b;
    else if (o === '-') { if (a < b) [a, b] = [b, a]; answer = a - b; }
    else { a = Math.min(a, 9); b = Math.min(b, 9); answer = a * b; }
  }

  function render() {
    if (qIndex >= total) {
      renderGameArea(gameBackBtn() + '<div class="game-title">Score: ' + score + ' / ' + total + '</div><p class="math-score">Well done! Keep your brain sharp.</p>');
      return;
    }
    nextQuestion();
    const html = gameBackBtn() +
      '<div class="game-title">Quick Math (' + (qIndex + 1) + '/' + total + ')</div>' +
      '<div class="math-score">Score: ' + score + '</div>' +
      '<div class="math-question">' + a + ' ' + op + ' ' + b + ' = ?</div>' +
      '<div class="math-input-wrap"><input type="number" id="mathAnswer" placeholder="Answer" /><button type="button" class="btn btn-primary" id="mathSubmit">Check</button></div>';
    renderGameArea(html);

    document.getElementById('mathSubmit')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('mathAnswer')?.value || '', 10);
      if (val === answer) score++;
      qIndex++;
      render();
    });
    document.getElementById('mathAnswer')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('mathSubmit')?.click(); });
  }
  render();
}

// Word Scramble
function startWordGame() {
  let score = 0;
  let word = '';
  let scrambled = '';

  function nextWord() {
    word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    scrambled = scrambleWord(word);
  }

  function render() {
    nextWord();
    const html = gameBackBtn() +
      '<div class="game-title">Unscramble the word</div>' +
      '<div class="math-score">Score: ' + score + '</div>' +
      '<div class="word-scramble-display">' + scrambled + '</div>' +
      '<div class="word-scramble-input-wrap"><input type="text" id="wordAnswer" placeholder="Your answer" maxlength="10" /><button type="button" class="btn btn-primary" id="wordSubmit">Check</button></div>' +
      '<p class="math-score">Tip: All words are study-related, 5 letters.</p>';
    renderGameArea(html);

    document.getElementById('wordSubmit')?.addEventListener('click', check);
    document.getElementById('wordAnswer')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });

    function check() {
      const val = (document.getElementById('wordAnswer')?.value || '').trim().toUpperCase();
      if (val === word) {
        score++;
        showToast('Correct!');
      } else {
        showToast('Wrong. It was: ' + word);
      }
      document.getElementById('wordAnswer').value = '';
      nextWord();
      const disp = document.querySelector('.word-scramble-display');
      const scoreEl = document.querySelector('.game-area .math-score');
      if (disp) disp.textContent = scrambled;
      if (scoreEl) scoreEl.textContent = 'Score: ' + score;
    }
  }
  render();
}

document.getElementById('gamesMenu')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.game-card');
  if (!btn) return;
  const game = btn.dataset.game;
  if (game === 'memory') startMemoryGame();
  else if (game === 'math') startMathGame();
  else if (game === 'word') startWordGame();
});

document.getElementById('gameArea')?.addEventListener('click', (e) => {
  if (e.target.matches('[data-game-back]')) {
    renderGameArea('');
  }
});

// ----- Motivation -----
document.getElementById('motivationNext')?.addEventListener('click', () => {
  updateMotivation();
});

// ----- Init -----
loadState();
updateMotivation();
renderTimetable();
renderTasks();
renderPins();
renderGoals();
renderNotes();
renderStats();
updateTimerDisplay();
startStudyReminderInterval();
updateStudyNowBanner();
