/* ============================================================
   Schedule Manager V2 — Interactive JavaScript
   Calendar schedule, live filters, quick task modal, AJAX actions
   ============================================================ */

// ── Toast System ─────────────────────────────────────────────
const toastContainer = document.getElementById('toast-container');
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

function csrfHeaders() {
  return csrfToken ? {
    'X-CSRFToken': csrfToken,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
}

function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) return;
  const icons = {
    success: '✓', danger: '✕', info: 'ℹ', warning: '⚠'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = icons[type] || icons.info;
  const text = document.createElement('span');
  text.textContent = message;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => closeToast(toast));
  toast.append(icon, text, close);
  toastContainer.appendChild(toast);
  setTimeout(() => closeToast(toast), duration);
}

function closeToast(el) {
  if (!el || el.classList.contains('hide')) return;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 280);
}

// ── Dynamic Greeting ──────────────────────────────────────────
function updateDynamicGreeting() {
  const prefixEl = document.getElementById('dynamic-greeting-prefix');
  if (!prefixEl) return;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    prefixEl.textContent = 'Morning';
  } else if (hour >= 12 && hour < 17) {
    prefixEl.textContent = 'Afternoon';
  } else {
    prefixEl.textContent = 'Evening';
  }
}

// ── Sidebar Toggle ────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebar-overlay');
const menuBtn  = document.getElementById('menu-btn');

function openSidebar() {
  sidebar?.classList.add('open');
  overlay?.classList.add('visible');
  menuBtn?.setAttribute('aria-expanded', 'true');
  sidebar?.querySelector('a, button')?.focus();
}

function closeSidebar() {
  const wasOpen = sidebar?.classList.contains('open');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('visible');
  menuBtn?.setAttribute('aria-expanded', 'false');
  if (wasOpen) menuBtn?.focus();
}

menuBtn?.addEventListener('click', openSidebar);
overlay?.addEventListener('click', closeSidebar);
sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (sidebar?.classList.contains('open')) closeSidebar();
    closeQuickModal();
  }
});

// ── Flash → Toast Bridge ──────────────────────────────────────
document.querySelectorAll('.server-flash').forEach(el => {
  const type = el.dataset.category || 'info';
  showToast(el.dataset.message, type === 'danger' ? 'danger'
    : type === 'success' ? 'success'
    : type === 'warning' ? 'warning' : 'info');
});

// ── Task Collection Extractor ─────────────────────────────────
function extractTasksFromDOM() {
  const cards = document.querySelectorAll('.tasks-grid .task-card');
  const tasks = [];
  cards.forEach(card => {
    const id = card.id.replace('task-card-', '');
    const title = card.querySelector('.task-title')?.textContent.trim() || '';
    const desc = card.querySelector('.task-desc')?.textContent.trim() || '';
    const status = card.dataset.status || 'Pending';
    const category = card.dataset.category || 'General';
    const priority = card.dataset.priority || 'Medium';
    const dueDate = card.dataset.dueDate || '';
    tasks.push({ id, title, desc, status, category, priority, dueDate, el: card });
  });
  return tasks;
}

// ── Interactive Calendar & Scheduled Daily Timeline ───────────
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth(); // 0-indexed
let selectedDateStr = new Date().toISOString().split('T')[0];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDateForLabel(isoStr) {
  if (!isoStr) return 'No Date';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = isoStr === todayStr;
  const formatted = `${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
  return isToday ? `Today (${formatted})` : formatted;
}

function renderCalendar() {
  const labelEl = document.getElementById('calendar-month-year-label');
  const gridEl = document.getElementById('calendar-days-grid');
  if (!labelEl || !gridEl) return;

  labelEl.textContent = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

  const tasks = extractTasksFromDOM();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

  gridEl.innerHTML = '';
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Previous Month Spillover Days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${dayNum}</span>
      </div>
    `;
    gridEl.appendChild(cell);
  }

  // 2. Current Month Days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(calCurrentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${calCurrentYear}-${monthStr}-${dayStr}`;

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.dataset.date = dateStr;

    if (dateStr === todayStr) cell.classList.add('is-today');
    if (dateStr === selectedDateStr) cell.classList.add('selected');

    // Matching tasks for this day
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);

    let pillsHtml = '';
    const maxVisiblePills = 3;
    dayTasks.slice(0, maxVisiblePills).forEach(t => {
      const priorityClass = `indicator-${t.priority.toLowerCase()}`;
      pillsHtml += `
        <div class="cal-task-pill" title="${t.title}">
          <span class="cal-task-indicator ${priorityClass}"></span>
          <span>${t.title}</span>
        </div>
      `;
    });
    if (dayTasks.length > maxVisiblePills) {
      pillsHtml += `<div class="cal-more-pill">+${dayTasks.length - maxVisiblePills} more</div>`;
    }

    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${day}</span>
      </div>
      <div class="cal-day-tasks">
        ${pillsHtml}
      </div>
    `;

    cell.addEventListener('click', () => {
      document.querySelectorAll('.cal-day-cell.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      selectedDateStr = dateStr;
      renderScheduledPanel(selectedDateStr);
    });

    cell.addEventListener('dblclick', () => {
      openQuickModal(dateStr);
    });

    gridEl.appendChild(cell);
  }

  // 3. Next Month Spillover Days to fill 35 or 42 grid cells
  const totalRendered = firstDayIndex + daysInMonth;
  const remainingCells = (totalRendered <= 35 ? 35 : 42) - totalRendered;
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${nextDay}</span>
      </div>
    `;
    gridEl.appendChild(cell);
  }

  renderScheduledPanel(selectedDateStr);
}

// ── Scheduled Panel (Timeline Cards) ──────────────────────────
function renderScheduledPanel(dateIsoStr) {
  const titleDateEl = document.getElementById('scheduled-selected-date-label');
  const containerEl = document.getElementById('scheduled-timeline');
  if (!containerEl) return;

  if (titleDateEl) {
    titleDateEl.textContent = formatDateForLabel(dateIsoStr);
  }

  const tasks = extractTasksFromDOM().filter(t => t.dueDate === dateIsoStr);

  if (tasks.length === 0) {
    containerEl.innerHTML = `
      <div class="scheduled-empty">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p>No activities scheduled for this date.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="openQuickModal('${dateIsoStr}')">
          + Schedule Activity
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  tasks.forEach((t, idx) => {
    const barClass = t.priority === 'High' ? 'bar-orange'
      : t.priority === 'Medium' ? 'bar-lime' : 'bar-blue';

    // Mock progressive time tags matching the reference design (09:00, 10:00, 13:00)
    const mockHours = ['09:00', '10:30', '13:00', '15:30', '17:00'];
    const timeLabel = mockHours[idx % mockHours.length];

    html += `
      <div class="scheduled-time-slot">
        <span class="scheduled-time-tag">${timeLabel}</span>
        <div class="sched-card" id="sched-card-${t.id}">
          <div class="sched-card-topbar ${barClass}"></div>
          <div class="sched-card-header">
            <div>
              <h4 class="sched-card-title ${t.status === 'Completed' ? 'done' : ''}">${t.title}</h4>
              ${t.desc ? `<p class="sched-card-subtitle">${t.desc}</p>` : ''}
            </div>
            <button type="button" class="task-check ${t.status === 'Completed' ? 'done' : ''}"
              data-task-action="toggle" data-task-id="${t.id}"
              aria-label="Toggle task ${t.title}">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
          <div class="sched-card-meta">
            <span class="sched-time-pill">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${t.category}
            </span>
            <div class="sched-actions">
              <a href="/edit/${t.id}" class="btn btn-ghost btn-sm" title="Edit">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </a>
              <button type="button" class="btn btn-ghost btn-sm"
                data-task-action="delete" data-task-id="${t.id}" title="Delete">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  containerEl.innerHTML = html;
}

// ── Calendar Steppers ─────────────────────────────────────────
document.getElementById('cal-prev-month-btn')?.addEventListener('click', () => {
  calCurrentMonth--;
  if (calCurrentMonth < 0) {
    calCurrentMonth = 11;
    calCurrentYear--;
  }
  renderCalendar();
});

document.getElementById('cal-next-month-btn')?.addEventListener('click', () => {
  calCurrentMonth++;
  if (calCurrentMonth > 11) {
    calCurrentMonth = 0;
    calCurrentYear++;
  }
  renderCalendar();
});

document.getElementById('sched-prev-day-btn')?.addEventListener('click', () => {
  const cur = new Date(selectedDateStr);
  cur.setDate(cur.getDate() - 1);
  selectedDateStr = cur.toISOString().split('T')[0];
  calCurrentYear = cur.getFullYear();
  calCurrentMonth = cur.getMonth();
  renderCalendar();
});

document.getElementById('sched-next-day-btn')?.addEventListener('click', () => {
  const cur = new Date(selectedDateStr);
  cur.setDate(cur.getDate() + 1);
  selectedDateStr = cur.toISOString().split('T')[0];
  calCurrentYear = cur.getFullYear();
  calCurrentMonth = cur.getMonth();
  renderCalendar();
});

// ── View Mode Switcher (Calendar vs Full Library) ─────────────
const viewModeCalBtn = document.getElementById('view-mode-calendar-btn');
const viewModeListBtn = document.getElementById('view-mode-list-btn');
const calViewContainer = document.getElementById('calendar-view-container');
const tasksGridWrapper = document.getElementById('tasks-grid-wrapper');

viewModeCalBtn?.addEventListener('click', () => {
  viewModeCalBtn.classList.add('active');
  viewModeCalBtn.setAttribute('aria-pressed', 'true');
  viewModeListBtn?.classList.remove('active');
  viewModeListBtn?.setAttribute('aria-pressed', 'false');
  if (calViewContainer) calViewContainer.style.display = '';
});

viewModeListBtn?.addEventListener('click', () => {
  viewModeListBtn.classList.add('active');
  viewModeListBtn.setAttribute('aria-pressed', 'true');
  viewModeCalBtn?.classList.remove('active');
  viewModeCalBtn?.setAttribute('aria-pressed', 'false');
  tasksGridWrapper?.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('nav-calendar-btn')?.addEventListener('click', () => {
  viewModeCalBtn?.click();
  calViewContainer?.scrollIntoView({ behavior: 'smooth' });
});

// ── Quick Task Modal ("Brainstorm Session" Popover) ───────────
const quickModal = document.getElementById('quick-task-modal');
const quickModalCloseBtn = document.getElementById('modal-close-btn');
const quickTaskForm = document.getElementById('quick-task-form');

function openQuickModal(prefillDate) {
  if (!quickModal) return;
  const dateInput = document.getElementById('quick-due-date');
  if (dateInput) {
    dateInput.value = prefillDate || selectedDateStr || new Date().toISOString().split('T')[0];
  }
  quickModal.hidden = false;
  document.getElementById('quick-title')?.focus();
}

function closeQuickModal() {
  if (!quickModal) return;
  quickModal.hidden = true;
  quickTaskForm?.reset();
}

document.getElementById('open-quick-modal-btn')?.addEventListener('click', () => openQuickModal());
document.getElementById('scheduled-quick-add-btn')?.addEventListener('click', () => openQuickModal(selectedDateStr));
quickModalCloseBtn?.addEventListener('click', closeQuickModal);

quickModal?.addEventListener('click', e => {
  if (e.target === quickModal) closeQuickModal();
});

quickTaskForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('quick-save-btn');
  if (saveBtn) saveBtn.disabled = true;

  const payload = {
    title: document.getElementById('quick-title')?.value.trim(),
    due_date: document.getElementById('quick-due-date')?.value || null,
    category: document.getElementById('quick-category')?.value || 'General',
    priority: document.querySelector('input[name="priority"]:checked')?.value || 'Medium',
    description: document.getElementById('quick-description')?.value.trim() || '',
    status: 'Pending'
  };

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: csrfHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create task');
    }

    const newTask = await res.json();
    showToast('Activity scheduled successfully!', 'success');
    closeQuickModal();

    // Reload page or dynamically insert
    window.location.reload();
  } catch (err) {
    showToast(err.message || 'Could not schedule task.', 'danger');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

// ── Global Delegate for Task Toggle & Delete ─────────────────
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button[data-task-action]');
  const card = button?.closest('.task-card') || button?.closest('.sched-card');
  if (!button) return;

  const taskId = button.dataset.taskId;
  if (!taskId) return;

  if (button.dataset.taskAction === 'toggle') {
    toggleTask(taskId, card);
  } else if (button.dataset.taskAction === 'delete') {
    deleteTask(taskId, card, button);
  }
});

// ── AJAX Task Toggle ──────────────────────────────────────────
async function toggleTask(id, cardEl) {
  try {
    const res = await fetch(`/api/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: csrfHeaders()
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    const isDone = data.status === 'Completed';

    // Update all matching task elements in DOM
    const allMatchingCards = document.querySelectorAll(`[id="task-card-${id}"], [id="sched-card-${id}"]`);
    allMatchingCards.forEach(card => {
      const checkBtn = card.querySelector('.task-check');
      const titleEl = card.querySelector('.task-title, .sched-card-title');
      const statusChip = card.querySelector('.status-chip');
      card.dataset.status = data.status;

      if (isDone) {
        checkBtn?.classList.add('done');
        card.classList.add('status-completed');
        titleEl?.classList.add('done');
        if (statusChip) {
          statusChip.className = 'chip status-chip chip-status-completed';
          statusChip.textContent = 'Completed';
        }
      } else {
        checkBtn?.classList.remove('done');
        card.classList.remove('status-completed');
        titleEl?.classList.remove('done');
        if (statusChip) {
          statusChip.className = 'chip status-chip chip-status-pending';
          statusChip.textContent = 'Pending';
        }
      }
    });

    showToast(isDone ? 'Activity marked complete.' : 'Activity reopened.', isDone ? 'success' : 'info');
    applyFilters();
    renderCalendar();
    refreshStats().catch(() => {});
  } catch {
    showToast('Could not update task. Please try again.', 'danger');
  }
}

// ── AJAX Task Delete ──────────────────────────────────────────
async function deleteTask(id, cardEl, btn) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: csrfHeaders()
    });
    if (!res.ok) throw new Error();

    // Remove matching DOM elements
    const allMatching = document.querySelectorAll(`[id="task-card-${id}"], [id="sched-card-${id}"]`);
    allMatching.forEach(c => {
      c.style.transition = 'opacity 180ms ease, transform 180ms ease';
      c.style.opacity = '0';
      c.style.transform = 'scale(0.9)';
      setTimeout(() => c.remove(), 180);
    });

    setTimeout(() => {
      checkEmpty();
      renderCalendar();
      refreshStats().catch(() => {});
      showToast('Activity deleted.', 'success');
    }, 200);
  } catch {
    if (btn) btn.disabled = false;
    showToast('Could not delete the task. Please try again.', 'danger');
  }
}

// ── Refresh Stats Counters ────────────────────────────────────
async function refreshStats() {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error();
  const data = await res.json();
  const map = {
    total: 'stat-total',
    pending: 'stat-pending',
    in_progress: 'stat-progress',
    completed: 'stat-completed'
  };
  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = data[key] ?? 0;
  }
  const overdueEl = document.getElementById('stat-overdue');
  if (overdueEl && data.analytics?.overdue !== undefined) {
    overdueEl.textContent = data.analytics.overdue;
  }
}

// ── Live Multi-Filter ─────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const filterTabs = document.querySelectorAll('.filter-tab');
const categorySel = document.getElementById('category-filter');
const prioritySel = document.getElementById('priority-filter');
const recurringToggle = document.getElementById('is_recurring');
const recurrenceFields = document.getElementById('recurrence-fields');
const allCards = () => document.querySelectorAll('.tasks-grid .task-card');

function applyFilters() {
  const q = (searchInput?.value || '').toLowerCase().trim();
  const status = document.querySelector('.filter-tab.active')?.dataset.status || '';
  const cat = categorySel?.value || '';
  const priority = prioritySel?.value || '';

  let visible = 0;
  allCards().forEach(card => {
    const title = (card.dataset.title || '').toLowerCase();
    const cStat = card.dataset.status || '';
    const cCat = card.dataset.category || '';
    const cPri = card.dataset.priority || '';

    const matchesQuery = !q || title.includes(q);
    const matchesStatus = !status || cStat === status;
    const matchesCat = !cat || cCat === cat;
    const matchesPri = !priority || cPri === priority;

    const show = matchesQuery && matchesStatus && matchesCat && matchesPri;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  checkEmpty(visible);
}

function checkEmpty(count) {
  const tasksGrid = document.getElementById('tasks-grid');
  if (!tasksGrid) return;
  const actual = count !== undefined ? count : [...allCards()].filter(c => c.style.display !== 'none').length;
  let emptyEl = document.getElementById('empty-state');
  if (actual === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'empty-state';
      emptyEl.className = 'empty-state';
      emptyEl.setAttribute('role', 'status');
      emptyEl.innerHTML = `
        <div class="empty-icon-box">
          <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h3>No matching tasks found</h3>
        <p>Try refining your search query or filter selections.</p>
      `;
      tasksGrid.appendChild(emptyEl);
    }
  } else {
    emptyEl?.remove();
  }
}

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-pressed', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-pressed', 'true');
    applyFilters();
  });
});

searchInput?.addEventListener('input', applyFilters);
categorySel?.addEventListener('change', applyFilters);
prioritySel?.addEventListener('change', applyFilters);

recurringToggle?.addEventListener('change', () => {
  if (recurrenceFields) recurrenceFields.hidden = !recurringToggle.checked;
});

// ── Initial Boot ──────────────────────────────────────────────
updateDynamicGreeting();
renderCalendar();
checkEmpty();
