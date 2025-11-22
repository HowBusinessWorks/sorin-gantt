# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Construction Gantt Chart Dashboard 2026** is an interactive monthly-based Gantt chart application for managing 26 construction projects throughout 2026. It provides timeline visualization, progress tracking, and detailed project management with stage-level granularity.

### Key Architecture: Monthly-Based, Not Daily

Unlike typical Gantt charts that work with days, this implementation uses **months as the basic unit**:
- Timeline consists of 12 months (January-December 2026)
- Each task has `startMonth` (0-11) and `duration` (in months, 1-12)
- Cell width is 120px per month (not 30px per day)
- This simplifies the UI and reduces visual clutter for year-long project planning

## Core Technology Stack

- **React 18** - Component-based UI with hooks (`useState`, `useEffect`, `useRef`)
- **Tailwind CSS** - Utility-first styling with custom extensions
- **Lucide React** - Icon library (`Calendar`, `Search`, `Plus`, `X`, `ChevronDown`, `ChevronRight`)
- **Vite 4** - Development server and build tool

## Project Structure

```
src/
├── App.jsx          # Main component containing all state, handlers, and layout
├── data.js          # Constants: initialTasks, months, monthsShort, cellWidth, rowHeight
├── utils.js         # Helper functions: getProgressColor, getTotalMonths, getMonthName
├── main.jsx         # React DOM render entry point
└── index.css        # Tailwind directives (@tailwind imports)
```

## Build & Development Commands

- **`npm install`** - Install dependencies
- **`npm run dev`** - Start Vite development server (hot module reloading)
- **`npm run build`** - Create optimized production build
- **`npm run preview`** - Preview production build locally

## Core Data Structure

### Task Object
```javascript
{
  id: number,           // Unique identifier (1-26)
  name: string,         // Project name (in Romanian)
  startMonth: number,   // 0-11 (January-December)
  duration: number,     // 1-12 months
  progress: number,     // 0-100 percentage
  stages: Stage[]       // Array of sub-tasks
}
```

### Stage Object
```javascript
{
  id: number,           // Unique identifier (timestamp-based)
  name: string,         // Stage name
  startMonth: number,   // 0-11
  duration: number      // 1-12 months
}
```

## State Management

The entire app is contained in `App.jsx` with these primary state variables:

- **`tasks`** - Array of task objects from `data.js`
- **`filteredTasks`** - Computed from tasks after applying search and date filters
- **`searchTerm`** - String for text search (case-insensitive on task names)
- **`dateFilter`** - Object with `startMonth` and `endMonth` (0-11)
- **`selectedTask`** / **`editingTask`** - Modal state
- **`expandedTasks`** - Object mapping task IDs to boolean (visible stages)
- **`dragging`** - Tracks active drag operation on task bars
- **`sidebarWidth`** - Adjustable width (300-800px, default 500px)
- **`resizingSidebar`** - Boolean flag for sidebar resize operation

### Refs
- **`sidebarRef`** - Left sidebar container for synchronized scrolling
- **`timelineRef`** - Right timeline grid for synchronized scrolling

## Key Features & Implementation

### 1. Synchronized Scrolling
- Vertical scroll position is synchronized between sidebar and timeline
- Uses flags (`isScrolling`) to prevent feedback loops
- Implemented via `useEffect` on `filteredTasks` dependency

### 2. Task Bar Dragging
- Left edge drag: Adjusts `startMonth` and maintains `endMonth`
- Right edge drag: Adjusts `duration` only, keeps `startMonth` fixed
- Movement quantized to month boundaries (multiples of `cellWidth` = 120px)
- Calculated with `deltaMonths = Math.round((e.clientX - startX) / cellWidth)`
- `useEffect` listens for `mousemove` and `mouseup` events when `dragging` is active

### 3. Sidebar Resizing
- 1px resize handle on right edge with blue highlight on hover
- Min width: 300px, Max width: 800px
- `useEffect` manages mouse events during resize operation

### 4. Expandable Stages
- Only visible for tasks with `stages.length > 0`
- Click chevron button to toggle `expandedTasks[taskId]`
- Stage rows are 40px height (vs 50px for main tasks)
- Includes `e.stopPropagation()` to prevent modal opening

### 5. Progress Color Coding
Helper function in `utils.js`:
- **0%** → Gray (`bg-gray-400`)
- **1-49%** → Yellow (`bg-yellow-500`)
- **50-99%** → Blue (`bg-blue-500`)
- **100%** → Green (`bg-green-500`)

### 6. Edit Modal
- Controlled modal that opens on task click (sidebar or task bar)
- Form fields: project name, start month, duration, progress slider
- Stages section with add/delete capability
- Save persists changes to `tasks` state
- Cancel discards changes

## Styling Notes

- **Header**: Gradient background (`from-blue-600 via-blue-700 to-blue-800`)
- **Sidebar**: White background with gray header, resizable with handle
- **Timeline**: Month headers with gradient (`from-blue-50 to-blue-100`)
- **Task bars**: Rounded with shadow, hover effects, progress overlay
- **Stage bars**: Light blue gradient (`from-blue-300 to-blue-400`)
- **Modal**: 50% opacity backdrop, max-width 2xl, scrollable content

## Common Development Tasks

### Adding a New Task
Add to `initialTasks` in `src/data.js`:
```javascript
{ id: 27, name: "New Project", startMonth: 0, duration: 2, progress: 0, stages: [] }
```

### Modifying Styles
All styling uses Tailwind classes in JSX. No separate CSS files. Update class strings directly.

### Adjusting Timeline Scale
Change `cellWidth` constant in `src/data.js`:
- Current: 120px per month
- Smaller values zoom in, larger values zoom out

### Adding Icons
New icons from Lucide React are imported at top of `App.jsx`:
```javascript
import { NewIcon } from 'lucide-react';
```

## Important Implementation Details

### Why Monthly, Not Daily?
The original PRD (in `claude/requirements.md`) specified a day-based system (365 days, 30px per day). This implementation was simplified to a **month-based system** for better UX:
- Reduced visual complexity (12 cells vs 365)
- More appropriate for year-long construction planning
- All calculations use months instead of days

### Event Listener Cleanup
All global event listeners are properly cleaned up in `useEffect` return functions to prevent memory leaks.

### Task Bar Interaction
- Click anywhere on task bar (except drag handles) opens edit modal
- Drag handles have cursor `ew-resize`
- Task bar has `hover:scale-105` and `hover:shadow-xl` effects
- Progress indicator is a white semi-transparent overlay

### Modal Behavior
- Opens on click of task row or task bar
- Close via X button or Cancel button
- Save button updates `tasks` state and closes modal
- Modal is scrollable if content exceeds viewport height

## Testing Checklist

- [ ] Search filters tasks by name (case-insensitive)
- [ ] Date filter shows only tasks overlapping selected month range
- [ ] Drag left edge of task bar changes start month
- [ ] Drag right edge of task bar changes duration
- [ ] Sidebar resizes between 300-800px with smooth interaction
- [ ] Modal opens and closes correctly
- [ ] Stage expansion/collapse works
- [ ] Progress slider updates percentage in real-time
- [ ] Synchronized scrolling maintains alignment
- [ ] Task bars render in correct month positions

## Potential Future Enhancements

- Zoom in/out on timeline (adjust cellWidth dynamically)
- Drag entire task bar to shift both start and duration
- Today marker line on current month
- Export to PDF or Excel
- Color coding by project type or team
- Task dependencies with connecting lines
- Undo/redo functionality
- Keyboard shortcuts for common actions
