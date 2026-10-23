
const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "devtrack-tasks-v1";
const taskList = $("#task-list");
const taskForm = $("#task-form");
const modal = $("#modal");

let tasks = loadTasks();
let currentView = "all";
let editingId = null;

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["High", "Medium", "Low"].includes(task.priority)
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    alert("Could not save tasks. Check your browser storage.");
    return false;
  }
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "No deadline";
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(task) {
  return Boolean(task.dueDate && task.dueDate < todayString() && !task.completed);
}

function renderStats() {
  const completed = tasks.filter(task => task.completed).length;
  const active = tasks.filter(task => !task.completed).length;
  const overdue = tasks.filter(isOverdue).length;
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  $("#total-stat").textContent = tasks.length;
  $("#active-stat").textContent = active;
  $("#done-stat").textContent = completed;
  $("#overdue-stat").textContent = overdue;
  $("#progress-number").textContent = rate + "%";
  $("#progress-ring").style.background =
    `conic-gradient(#9b7afa ${rate}%, #273044 ${rate}%)`;
  $("#legend-done").textContent = completed;
  $("#legend-remaining").textContent = active;

  const priorities = ["High", "Medium", "Low"];
  $("#priority-breakdown").replaceChildren();

  priorities.forEach(priority => {
    const count = tasks.filter(task => task.priority === priority && !task.completed).length;
    const total = tasks.filter(task => !task.completed).length;
    const percentage = total ? Math.round(count / total * 100) : 0;

    const row = document.createElement("div");
    row.className = "priority-row";

    const label = document.createElement("div");
    label.className = "priority-label";

    const name = document.createElement("span");
    name.textContent = priority + " priority";

    const value = document.createElement("span");
    value.textContent = count;

    label.append(name, value);

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "bar-fill " + priority;
    fill.style.width = percentage + "%";

    bar.append(fill);
    row.append(label, bar);
    $("#priority-breakdown").append(row);
  });
}

function renderTasks() {
  const query = $("#search").value.trim().toLowerCase();
  const priority = $("#priority-filter").value;

  const filtered = tasks.filter(task => {
    const matchesSearch =
      (task.title + " " + task.description).toLowerCase().includes(query);

    const matchesPriority = priority === "all" || task.priority === priority;

    let matchesView = true;
    if (currentView === "today") {
      matchesView = !task.completed && task.dueDate === todayString();
    } else if (currentView === "upcoming") {
      matchesView = !task.completed && task.dueDate && task.dueDate > todayString();
    } else if (currentView === "completed") {
      matchesView = task.completed;
    }

    return matchesSearch && matchesPriority && matchesView;
  });

  taskList.replaceChildren();
  $("#task-count").textContent = `${filtered.length} task${filtered.length === 1 ? "" : "s"}`;
  $("#empty-state").hidden = filtered.length > 0;

  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority] ||
      (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
  });

  filtered.forEach(task => {
    const row = document.createElement("article");
    row.className = "task-row" + (task.completed ? " is-done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Complete " + task.title);

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      render();
    });

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    details.append(title);

    if (task.description) {
      const description = document.createElement("div");
      description.className = "task-description";
      description.textContent = task.description;
      details.append(description);
    }

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const badge = document.createElement("span");
    badge.className = "badge " + task.priority;
    badge.textContent = task.priority;

    const deadline = document.createElement("span");
    deadline.className = "deadline" + (isOverdue(task) ? " overdue" : "");
    deadline.textContent = task.dueDate
      ? (isOverdue(task) ? "Overdue · " : "Due · ") + formatDate(task.dueDate)
      : "No deadline";

    meta.append(badge, deadline);
    details.append(meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "✕";
    deleteButton.setAttribute("aria-label", "Delete " + task.title);

    deleteButton.addEventListener("click", () => {
      if (!confirm(`Delete "${task.title}"?`)) return;
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      render();
    });

    row.append(checkbox, details, deleteButton);
    taskList.append(row);
  });
}

function render() {
  renderStats();
  renderTasks();

  const labels = {
    all: "Overview",
    today: "Today's Tasks",
    upcoming: "Upcoming",
    completed: "Completed"
  };

  $("#page-title").textContent = labels[currentView];
  $("#task-heading").textContent =
    currentView === "all" ? "Your tasks" : labels[currentView];

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
}

function openModal() {
  editingId = null;
  taskForm.reset();
  $("#modal-title").textContent = "Create a task";
  modal.hidden = false;
  $("#task-title").focus();
}

function closeModal() {
  modal.hidden = true;
  editingId = null;
}

$("#open-modal").addEventListener("click", openModal);
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#task-title").value.trim();
  const description = $("#task-description").value.trim();
  const priority = $("#task-priority").value;
  const dueDate = $("#task-date").value;

  if (!title) return;

  if (dueDate && dueDate < todayString()) {
    if (!confirm("This deadline is in the past. Add this task anyway?")) return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    priority,
    dueDate,
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  currentView = "all";
  $("#search").value = "";
  $("#priority-filter").value = "all";
  closeModal();
  render();
});

$("#search").addEventListener("input", renderTasks);
$("#priority-filter").addEventListener("change", renderTasks);

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    render();
    $("#sidebar").classList.remove("open");
  });
});

$("#menu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$("#greeting").textContent = (() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning. Let's focus.";
  if (hour < 17) return "Good afternoon. Keep going.";
  return "Good evening. Finish strong.";
})();

render();
