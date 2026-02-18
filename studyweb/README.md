# StudyFlow — Your Study Hub

A single-page education website to manage your study timetable, tasks, pinned reminders, focus timer, goals, and notes. Data is stored in your browser (localStorage).

## Features

- **Timetable** — Add weekly study slots (day, time, duration, subject). Navigate between weeks. Mark slots as done when you finish.
- **Tasks** — Add study tasks with optional due dates. Check them off when done.
- **Pinned** — Pin things to do later with a reminder date/time. You get notified at that time (enable browser notifications).
- **Focus** — Pomodoro-style timer: 25 min focus, 5 min short break, 15 min long break. Notifies when time's up.
- **Goals** — Set study goals with optional target dates. Mark as done when achieved.
- **Notes** — Quick notes for revision.
- **Study reminder** — When you have an active study slot (current time) and it's not done, a banner says "Time is running — study!" and you can get browser notifications if enabled.
- **Theme** — Toggle light/dark mode (saved).

## How to run

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge).
2. Or serve the folder with any static server, e.g. `npx serve .` or `python -m http.server 8080`, then open the URL.

## Notifications

Click the bell icon in the header and allow notifications when prompted. Then you'll get:
- Reminders when a pinned "do later" time is reached
- "Time's up!" when the focus timer ends
- "Time is running — study!" when you have an active study slot (at most once per minute)

All data stays in your browser; nothing is sent to any server.
