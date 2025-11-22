# Construction Gantt Chart Dashboard - Codebase Analysis

## Executive Summary

This is a React-based **month-based Gantt chart** application for visualizing and managing 26 construction projects throughout 2026. The codebase is well-organized, with clean separation of concerns across 5 main files. The entire application state is managed within a single `App.jsx` component using React hooks.

**Total Lines of Code**: ~632 in App.jsx, ~20 in utils.js, ~46 in data.js, ~10 in other files.

---

## File-by-File Breakdown

### 1. `index.html` - Entry Point (11 lines)
**Purpose**: Minimal HTML shell for the React application

```html
- DOCTYPE and meta tags for viewport/charset
- Single <div id="root"></div> mounting point
- Module script loads /src/main.jsx
```

**Key Insight**: Uses Vite's dev server for hot module reloading. The build process outputs to this template.

---

### 2. `main.jsx` - React DOM Renderer (10 lines)
**Purpose**: Entry point for React application lifecycle

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Key Points**:
- Uses React 18's new `createRoot` API (not legacy `ReactDOM.render`)
- `<React.StrictMode>` wraps the app for development warnings about unsafe practices
- Imports `index.css` to apply Tailwind CSS globally

---

### 3. `index.css` - Tailwind Directives (3 lines)
**Purpose**: Minimal CSS file that imports Tailwind's utility classes

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**How It Works**:
1. Tailwind's PostCSS plugin processes these directives during build
2. Generates CSS based on classes used in JSX files
3. Removes unused styles (PurgeCSS/tree-shaking)
4. All styling is done via class names in React components (no CSS modules)

---

### 4. `data.js` - Constants & Initial State (46 lines)

#### Exports:

**A. `initialTasks` Array (26 objects)**
```javascript
{
  id: 1-26,                    // Unique identifier
  name: string,                // Romanian project names
  startMonth: 0-11,            // 0=Jan, 11=Dec
  duration: 1-5,               // Number of months
  progress: 0-100,             // Completion percentage
  stages: [{                   // Sub-tasks within project
    id: timestamp,             // Unique within project
    name: string,              // Stage name
    startMonth: 0-11,
    duration: 1+
  }]
}
```

**Real Examples from Data**:
- Task #1: "Uzina Arcuda - Reabilitare interioara..." spans 3 months (Jan-Mar), 15% complete, has 3 stages
- Task #3: Has 3 stages (Evaluation, Structural Repairs, Testing)
- Most tasks have 0% progress initially, but some are pre-populated with 60-80% progress

**Distribution**:
- Task durations: 1-5 months
- Start months spread across year: Jan (4 tasks) → Oct (2 tasks)
- About 3 tasks have stages; rest are simple single-unit projects

**B. Month Constants**
```javascript
export const months = ['January', 'February', ..., 'December'];  // Full names
export const monthsShort = ['Jan', 'Feb', ..., 'Dec'];           // Short names
```

**C. Layout Constants**
```javascript
export const cellWidth = 120;      // 120px per month in timeline
export const rowHeight = 50;        // 50px per task row (40px for stages)
export const totalMonths = 12;      // 12-month year
```

---

### 5. `utils.js` - Helper Functions (20 lines)

#### Function 1: `getProgressColor(progress)`
```javascript
0%     → 'bg-gray-400'     (not started)
1-49%  → 'bg-yellow-500'   (early progress)
50-99% → 'bg-blue-500'     (advanced progress)
100%   → 'bg-green-500'    (completed)
```
**Usage**: Applied to task bar classes to color-code by completion status.

#### Function 2: `getTotalMonths()`
```javascript
return totalMonths;  // Returns 12
```
**Purpose**: Simple getter that encapsulates the constant (allows future refactoring).

#### Function 3: `getMonthName(monthIndex)`
```javascript
return months[monthIndex] || '';
```
**Purpose**: Look up month name by index. Returns empty string if invalid.

---

## Core Component: `App.jsx` (632 lines)

### Architecture Overview

**Single Monolithic Component Structure**:
```
App Component (632 lines)
├── State Variables (lines 8-16)
├── Refs (lines 19-20)
├── Computed Values (lines 22-30)
├── Event Handlers & Effects (lines 32-161)
└── Render JSX (lines 163-629)
```

This is intentional for a dashboard app without deeply nested component hierarchy.

---

### State Variables (8 items)

#### 1. **`tasks`** - Master data array
```javascript
const [tasks, setTasks] = useState(initialTasks);
```
- Holds all 26 projects with their stages
- Updated when: user saves modal changes, user drags task bars
- Used by: filtering, rendering, dragging logic

#### 2. **`searchTerm`** - Text search filter
```javascript
const [searchTerm, setSearchTerm] = useState('');
```
- User input from search bar
- Case-insensitive matching against task names
- Updated real-time as user types

#### 3. **`dateFilter`** - Month range filter
```javascript
const [dateFilter, setDateFilter] = useState({ startMonth: 0, endMonth: 11 });
```
- Default: Jan-Dec (all months)
- User can restrict to any subset (e.g., Jan-Jun)
- Filters tasks that overlap the month range

#### 4. **`selectedTask`** - Currently edited task
```javascript
const [selectedTask, setSelectedTask] = useState(null);
```
- `null` = modal closed
- Set to task object when modal opens
- Triggers conditional rendering of modal overlay

#### 5. **`editingTask`** - Working copy for form
```javascript
const [editingTask, setEditingTask] = useState(null);
```
- Separate from `selectedTask` to allow cancel functionality
- Updated when user changes form fields
- Reverted if user clicks Cancel button

#### 6. **`expandedTasks`** - Stage visibility state
```javascript
const [expandedTasks, setExpandedTasks] = useState({});
```
- Object mapping: `{ [taskId]: boolean }`
- Example: `{ 1: true, 3: false, 7: true }`
- `true` = stages are visible below task row
- Only relevant for tasks with `.stages.length > 0`

#### 7. **`dragging`** - Task bar drag state
```javascript
const [dragging, setDragging] = useState(null);
```
- `null` = not dragging
- Active state:
```javascript
{
  task: taskObject,      // The task being dragged
  edge: 'start' | 'end', // Which edge was grabbed
  startX: number         // Mouse X position when drag began
}
```
- Used to track drag operation across mousemove events

#### 8. **`sidebarWidth`** & **`resizingSidebar`** - Sidebar resize
```javascript
const [sidebarWidth, setSidebarWidth] = useState(500);
const [resizingSidebar, setResizingSidebar] = useState(false);
```
- Width: 300-800px range
- When resizing: `resizingSidebar = true`, listens to mousemove
- Applied to inline style: `style={{ width: sidebarWidth }}`

---

### Refs (2 items)

#### 1. **`sidebarRef`** - Left panel reference
```javascript
const sidebarRef = useRef(null);
```
- Attached to: `<div ref={sidebarRef}` (line 220)
- Used to: access scrollTop for synchronized scrolling
- Also stores `isScrolling` flag to prevent feedback loops

#### 2. **`timelineRef`** - Right timeline reference
```javascript
const timelineRef = useRef(null);
```
- Attached to: scrollable timeline container (line 306)
- Used to: sync scroll position with sidebar
- Stores `isScrolling` flag

---

### Computed Values (1 item)

#### **`filteredTasks`** (lines 25-30)
```javascript
const filteredTasks = tasks.filter(task => {
  const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
  const taskEnd = task.startMonth + task.duration - 1;
  const matchesDate = !(taskEnd < dateFilter.startMonth || task.startMonth > dateFilter.endMonth);
  return matchesSearch && matchesDate;
});
```

**Logic**:
1. **Search Match**: Task name contains search term (case-insensitive)
2. **Date Match**: Task overlaps the selected month range
   - Task end month = start + duration - 1
   - No overlap if: task ends before filter starts OR task starts after filter ends
   - Therefore: overlap exists if NEITHER condition is true

**Example**:
- Task spans months 2-4 (Mar-May)
- Filter: months 1-3 (Feb-Apr)
- Task end = 2 + 3 - 1 = 4
- taskEnd (4) < dateFilter.startMonth (1)? No
- task.startMonth (2) > dateFilter.endMonth (3)? No
- Result: ✓ Task is included

---

### Effect Hooks (3 major effects)

#### Effect 1: Sidebar Resizing (lines 33-54)
```javascript
useEffect(() => {
  const handleMouseMove = (e) => {
    if (resizingSidebar) {
      const newWidth = Math.max(300, Math.min(800, e.clientX));
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => setResizingSidebar(false);

  if (resizingSidebar) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [resizingSidebar]);
```

**Lifecycle**:
1. User clicks resize handle → `setResizingSidebar(true)` (line 278)
2. Effect detects change, adds global mouse listeners
3. As mouse moves: `e.clientX` determines new width
4. Width clamped to 300-800px range
5. User releases mouse → `setResizingSidebar(false)`
6. Effect cleans up listeners on unmount

**Key Pattern**: Global event listeners are added/removed reactively based on state.

---

#### Effect 2: Synchronized Scrolling (lines 57-93)
```javascript
useEffect(() => {
  const handleSidebarScroll = (e) => {
    if (timelineRef.current && !timelineRef.current.isScrolling) {
      sidebarRef.current.isScrolling = true;
      timelineRef.current.scrollTop = e.target.scrollTop;
      setTimeout(() => {
        sidebarRef.current.isScrolling = false;
      }, 10ms);
    }
  };

  const handleTimelineScroll = (e) => {
    if (sidebarRef.current && !sidebarRef.current.isScrolling) {
      timelineRef.current.isScrolling = true;
      const sidebarScrollElement = sidebarRef.current.querySelector('.sidebar-scroll');
      if (sidebarScrollElement) {
        sidebarScrollElement.scrollTop = e.target.scrollTop;
      }
      setTimeout(() => {
        timelineRef.current.isScrolling = false;
      }, 10ms);
    }
  };

  // Attach listeners
  const sidebarScrollElement = sidebarRef.current?.querySelector('.sidebar-scroll');
  if (sidebarScrollElement && timelineRef.current) {
    sidebarScrollElement.addEventListener('scroll', handleSidebarScroll);
    timelineRef.current.addEventListener('scroll', handleTimelineScroll);
    // ... cleanup
  }
}, [filteredTasks]);
```

**Problem Solved**: When user scrolls sidebar, the timeline should scroll with it (and vice versa). But if both are scrolling simultaneously, infinite loops occur.

**Solution**: The `isScrolling` flag prevents feedback:
1. User scrolls sidebar
2. `handleSidebarScroll` checks: "Is timeline already scrolling?" → No
3. Sets `sidebarRef.isScrolling = true`
4. Updates timeline scrollTop
5. Clears flag after 10ms (allows other scroll events to register)

**Dependency**: `[filteredTasks]` - Re-runs when filtered tasks change (affects scroll container height).

---

#### Effect 3: Task Bar Dragging (lines 120-161)
```javascript
useEffect(() => {
  const handleMouseMove = (e) => {
    if (dragging) {
      const deltaMonths = Math.round((e.clientX - dragging.startX) / cellWidth);

      let updatedTask = { ...dragging.task };

      if (dragging.edge === 'start') {
        const newStart = Math.max(0, Math.min(11, dragging.task.startMonth + deltaMonths));
        const newDuration = Math.max(1, dragging.task.duration + (dragging.task.startMonth - newStart));
        updatedTask.startMonth = newStart;
        updatedTask.duration = newDuration;
      } else if (dragging.edge === 'end') {
        const newDuration = Math.max(1, dragging.task.duration + deltaMonths);
        const maxDuration = 12 - dragging.task.startMonth;
        updatedTask.duration = Math.min(newDuration, maxDuration);
      }

      setTasks(prevTasks =>
        prevTasks.map(t => t.id === dragging.task.id ? updatedTask : t)
      );
    }
  };

  const handleMouseUp = () => setDragging(null);

  if (dragging) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [dragging, cellWidth, totalMonthsCount]);
```

**Drag Calculation Logic**:

**Left Edge Drag** (start month):
```
deltaMonths = Math.round((currentX - startX) / 120)
newStart = clamp(startMonth + deltaMonths, 0, 11)
newDuration = originalDuration + (originalStart - newStart)
// This maintains the end month while moving start
```

Example: Task at month 3, duration 2 (ends month 4)
- Drag left 120px → deltaMonths = -1
- newStart = 3 - 1 = 2
- newDuration = 2 + (3 - 2) = 3
- Result: now spans months 2-4 (same end)

**Right Edge Drag** (duration):
```
deltaMonths = Math.round((currentX - startX) / 120)
newDuration = max(1, originalDuration + deltaMonths)
maxDuration = 12 - startMonth // Don't exceed December
newDuration = min(newDuration, maxDuration)
```

Example: Task at month 3, duration 2
- Drag right 120px → deltaMonths = +1
- newDuration = 2 + 1 = 3
- Result: now spans months 3-5

**Dependency**: `[dragging, cellWidth, totalMonthsCount]` - Re-runs when any drag state changes.

---

### Event Handlers (4 functions)

#### 1. `handleTaskClick(task)` (lines 96-99)
```javascript
const handleTaskClick = (task) => {
  setSelectedTask(task);
  setEditingTask({ ...task });
};
```
- Triggered by: clicking task row or task bar
- Creates deep copy of task for editing (allows discard functionality)
- Opens modal

#### 2. `toggleExpand(taskId)` (lines 102-107)
```javascript
const toggleExpand = (taskId) => {
  setExpandedTasks(prev => ({
    ...prev,
    [taskId]: !prev[taskId]
  }));
};
```
- Triggered by: clicking chevron icon
- Toggles stage visibility for that task
- Only appears if task has stages

#### 3. `handleBarDragStart(e, task, edge)` (lines 110-117)
```javascript
const handleBarDragStart = (e, task, edge) => {
  e.preventDefault();
  setDragging({
    task: task,
    edge: edge, // 'start' or 'end'
    startX: e.clientX
  });
};
```
- Triggered by: mousedown on left/right drag handle
- Prevents text selection with `e.preventDefault()`
- Sets initial drag state
- Drag movement handled by Effect 3

#### 4. Month Filter Update (inline, lines 190-210)
```javascript
onChange={(e) => {
  setDateFilter(prev => ({ ...prev, startMonth: parseInt(e.target.value) }));
}}
```
- Triggered by: changing dropdown in header
- Updates date filter state
- Re-renders filtered tasks

---

## Render Structure (lines 163-629)

### Layout Hierarchy

```
<div> - Main container (bg-gray-50, min-h-screen)
├─ Header Section (blue gradient, sticky)
│  ├─ Title
│  ├─ Search Bar
│  └─ Date Filter Dropdowns
│
├─ Gantt Chart Container (flexbox, h-[calc(100vh-200px)])
│  ├─ Sidebar (resizable, 300-800px)
│  │  ├─ Header ("Project Name")
│  │  ├─ Task Rows (scrollable)
│  │  │  ├─ Main Task Row (h-50)
│  │  │  │  ├─ Chevron Button (if has stages)
│  │  │  │  └─ Task Name + Progress %
│  │  │  └─ Stage Rows (if expanded, h-40)
│  │  └─ Resize Handle (1px vertical bar)
│  │
│  └─ Timeline Section (flex-1, scrollable)
│     ├─ Month Headers (sticky, 12 columns)
│     ├─ Vertical Grid Lines
│     └─ Task Grid
│        ├─ Main Task Bars (colored by progress)
│        │  └─ Drag Handles (left/right edges)
│        └─ Stage Bars (light blue, if expanded)
│
└─ Edit Modal (conditional, fixed overlay)
   ├─ Header + Close Button
   └─ Form
      ├─ Project Name Input
      ├─ Start Month Select
      ├─ Duration Input
      ├─ Progress Range Slider
      ├─ Stages Section
      │  ├─ Add Stage Button
      │  └─ Stage Cards (delete button per stage)
      └─ Save/Cancel Buttons
```

---

### Detailed Component Sections

#### Header (lines 165-214)
- **Gradient background**: `from-blue-600 via-blue-700 to-blue-800`
- **Search input**: Real-time filtering, icon from Lucide
- **Month filter**: Two dropdowns (start/end month)
- **Styling**: Uses Tailwind's backdrop blur, semi-transparent overlays

#### Sidebar (lines 219-280)
```javascript
<div ref={sidebarRef} style={{ width: sidebarWidth }}>
  {/* Header */}
  <div className="h-20 bg-gray-100">Project Name</div>

  {/* Task Rows */}
  <div className="overflow-y-auto sidebar-scroll">
    {filteredTasks.map(task => (
      <div>
        {/* Main Task */}
        <div className="h-50" onClick={() => handleTaskClick(task)}>
          {/* Chevron if has stages */}
          {/* Task name + progress % */}
        </div>

        {/* Stage Rows (conditional) */}
        {expandedTasks[task.id] && task.stages.map(stage => (
          <div className="h-40">Stage Name</div>
        ))}
      </div>
    ))}
  </div>

  {/* Resize Handle */}
  <div className="absolute right-0 w-1" onMouseDown={...} />
</div>
```

**Key Features**:
- Chevron button with `stopPropagation()` to prevent modal opening
- Hover effect: gradient background
- Stage rows indented with `pl-12` padding
- Resize handle: blue highlight on hover

#### Timeline (lines 282-407)
```javascript
<div className="flex-1 overflow-x-auto">
  <div style={{ width: totalMonthsCount * cellWidth }}>
    {/* Month Headers */}
    <div className="sticky top-0">
      {months.map(month => (
        <div style={{ width: cellWidth }}>
          {month}
          <div className="text-xs">2026</div>
        </div>
      ))}
    </div>

    {/* Task Grid */}
    <div ref={timelineRef} className="overflow-y-auto">
      {/* Vertical Grid Lines */}
      {months.map((month, i) => (
        <div className="absolute border-r-2"
             style={{ left: i * cellWidth }} />
      ))}

      {/* Task Rows */}
      {filteredTasks.map(task => (
        <div>
          {/* Main Task Bar */}
          <div style={{
            left: task.startMonth * cellWidth + 4,
            width: task.duration * cellWidth - 8,
            height: 32,
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            {/* Progress Overlay */}
            {/* Progress Text */}
            {/* Drag Handles */}
          </div>

          {/* Stage Bars (conditional) */}
          {expandedTasks[task.id] && task.stages.map(stage => (
            <div style={{
              left: stage.startMonth * cellWidth + 4,
              width: stage.duration * cellWidth - 8,
              height: 24
            }}>
              Stage Name
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
</div>
```

**Positioning Logic**:
```
left = startMonth * 120 + 4        // Center within month cell
width = duration * 120 - 8         // Full duration minus padding
height = 32 (main) or 24 (stage)
top = 50%, transform: translateY(-50%) // Vertical center in row
```

**Colors**: Applied via `getProgressColor(progress)` class

#### Edit Modal (lines 411-627)
```javascript
{selectedTask && editingTask && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b">
        <h2>Edit Project</h2>
        <button onClick={() => setSelectedTask(null)}>
          <X /> {/* Close button */}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Project Name */}
        <input value={editingTask.name} onChange={...} />

        {/* Start Month */}
        <select value={editingTask.startMonth} onChange={...}>
          {months.map((m, i) => <option value={i}>{m}</option>)}
        </select>

        {/* Duration */}
        <input type="number" min="1" max="12" value={editingTask.duration} />

        {/* Progress Slider */}
        <input type="range" min="0" max="100" value={editingTask.progress} />
        <div>{editingTask.progress}%</div>

        {/* Stages */}
        <div>
          <button onClick={() => {
            const newStage = {
              id: Date.now(),
              name: `New Stage ${editingTask.stages.length + 1}`,
              startMonth: editingTask.startMonth,
              duration: 1
            };
            setEditingTask({
              ...editingTask,
              stages: [...editingTask.stages, newStage]
            });
          }}>
            <Plus /> Add Stage
          </button>

          {editingTask.stages.map(stage => (
            <div className="p-4 bg-gray-50">
              <input value={stage.name} onChange={...} />
              <select value={stage.startMonth} onChange={...}>
                {monthsShort.map((m, i) => <option value={i}>{m}</option>)}
              </select>
              <input type="number" value={stage.duration} onChange={...} />
              <button onClick={() => setEditingTask({
                ...editingTask,
                stages: editingTask.stages.filter(s => s.id !== stage.id)
              })}>
                <X /> Delete
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <button onClick={() => {
          setTasks(tasks.map(t =>
            t.id === editingTask.id ? editingTask : t
          ));
          setSelectedTask(null);
        }}>Save Changes</button>
        <button onClick={() => setSelectedTask(null)}>Cancel</button>
      </div>
    </div>
  </div>
)}
```

**Key Patterns**:
- Nested spread operators for immutable updates
- Form state via `editingTask` (allows discard)
- Stage management: add (Date.now() for ID), delete (filter)
- Save: map over tasks, update matching by ID
- Cancel: just close (discard editingTask)

---

## Data Flow Diagrams

### User Search Flow
```
User types in search box
  ↓
onChange event → setSearchTerm(value)
  ↓
searchTerm state changes
  ↓
filteredTasks recomputed:
  - Filter by task.name.includes(searchTerm)
  - Filter by date overlap
  ↓
Component re-renders with only matching tasks
```

### Task Bar Dragging Flow
```
User mousedown on drag handle
  ↓
handleBarDragStart() → setDragging({ task, edge, startX })
  ↓
dragging state changes
  ↓
Effect 3 activates, adds global mousemove/mouseup listeners
  ↓
User moves mouse → handleMouseMove()
  - Calculate deltaMonths from mouse position
  - Update task.startMonth or task.duration
  - setTasks(prevTasks => map and update matching task)
  ↓
Component re-renders, task bar position changes in real-time
  ↓
User releases mouse → handleMouseUp() → setDragging(null)
  ↓
Effect 3 detects dragging = null, removes listeners
```

### Modal Edit Flow
```
User clicks task (row or bar)
  ↓
handleTaskClick(task)
  - setSelectedTask(task)
  - setEditingTask({ ...task }) ← deep copy
  ↓
Modal renders (conditional on selectedTask && editingTask)
  ↓
User modifies form
  - onChange → setEditingTask({...editingTask, field: value})
  ↓
User clicks Save
  ↓
setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t))
  - Updates master tasks array
  ↓
setSelectedTask(null) → Modal closes
  ↓
Component re-renders with new task data
```

### Sidebar Resize Flow
```
User mousedown on resize handle
  ↓
setResizingSidebar(true)
  ↓
Effect 1 detects change, adds global mousemove/mouseup listeners
  ↓
User moves mouse → handleMouseMove()
  - e.clientX → calculate new width
  - Clamp to 300-800px range
  - setSidebarWidth(newWidth)
  ↓
Component re-renders, sidebar width updates in real-time
  ↓
User releases mouse → setResizingSidebar(false)
  ↓
Effect 1 cleans up listeners
```

---

## Key Implementation Insights

### 1. Immutable State Updates
All state updates follow React best practices:

```javascript
// ❌ Wrong - mutates state directly
dragging.task.startMonth = 5;

// ✓ Correct - creates new object
setTasks(prevTasks =>
  prevTasks.map(t =>
    t.id === dragging.task.id
      ? { ...t, startMonth: 5 }  // Shallow copy
      : t
  )
);

// Shallow copies are sufficient because:
// - Strings, numbers are immutable
// - Arrays/objects within task are not modified, replaced
```

### 2. Synchronized Scrolling Pattern
The `isScrolling` flag is key:

```
User scrolls sidebar
  → sidebarRef.isScrolling = true
  → Update timelineRef.scrollTop
  → timelineRef scroll event fires
  → But isScrolling is true, so handler does nothing
  → After 10ms timeout, sidebarRef.isScrolling = false
  → Now manual scrolls are possible again
```

This prevents infinite: sidebar scroll → update timeline → timeline scroll event → update sidebar → infinity.

### 3. Global Event Listeners with Cleanup
Proper pattern for dragging/resizing:

```javascript
useEffect(() => {
  const handler = (e) => { /* ... */ };

  if (someCondition) {
    document.addEventListener('event', handler);
  }

  return () => {
    document.removeEventListener('event', handler); // Cleanup
  };
}, [dependencies]);
```

This ensures:
- Listeners only added when needed
- No memory leaks from orphaned listeners
- Cleanup runs before next effect or unmount

### 4. Drag Calculation with Snapping
Drag calculations snap to month boundaries:

```javascript
const deltaMonths = Math.round((e.clientX - dragging.startX) / cellWidth);
```

Instead of: `const deltaPixels = e.clientX - dragging.startX`

This means:
- 0-60px movement = 0 months (no change)
- 60-180px = 1 month movement
- Snapping to grid makes UI feel responsive

### 5. Conditional Stage Rendering
Stages only render when expanded:

```javascript
{expandedTasks[task.id] && task.stages.map(stage => (...))}
```

Benefits:
- Cleaner UI for most tasks (no stages)
- Minimal DOM elements
- User controls visibility

### 6. Deep Copy for Modal Editing
Critical pattern for cancel functionality:

```javascript
const handleTaskClick = (task) => {
  setSelectedTask(task);           // Reference to original
  setEditingTask({ ...task });     // Shallow copy
};
```

But problem: if task has nested stages:
```javascript
{ ...task }  // Shallow copy - stages array is still shared!
```

**Better approach** (current code is vulnerable):
```javascript
setEditingTask({
  ...task,
  stages: [...task.stages]  // Also copy the array
});
```

This is a potential bug if user modifies a stage, then cancels - the original might be affected.

---

## Performance Characteristics

### Rendering Performance
- **1-26 tasks rendered** each with potential expanded stages
- **O(n)** complexity for filtered tasks
- No memoization (React.memo) used
- Entire component re-renders on any state change

**When does re-render happen?**
- Typing in search → searchTerm changes
- Changing month filter → dateFilter changes
- Dragging task → tasks array changes
- Expanding stage → expandedTasks changes
- Any effect hook running

**Potential bottleneck**: Dragging causes setTasks on every mousemove (many times/second), triggering full re-render. With 100+ tasks, this could lag.

### Memory Usage
- `initialTasks` array: ~1-2KB (JSON data)
- Event listeners: 2-3 global listeners when needed
- Refs: minimal overhead
- No memory leaks (proper cleanup)

### Bundle Size Impact
- React 18: ~40KB gzip
- Tailwind CSS: generated, typically 10-30KB gzip (depends on usage)
- Lucide icons: tree-shaken, only used icons included
- App code: ~15KB total (unminified)

---

## Testing Scenarios

### 1. Search Functionality
```javascript
// Test case: Search for "Arcuda"
searchTerm = "Arcuda"
// Expected: Tasks 1-7 visible (all contain "Uzina Arcuda")

// Test case: Search "xyz"
// Expected: No tasks visible, empty grid
```

### 2. Date Filtering
```javascript
// Test case: Filter Jan-Mar
dateFilter = { startMonth: 0, endMonth: 2 }
// Expected: Tasks starting/ending in Jan, Feb, Mar visible

// Test case: Task at month 10 (Nov), duration 2 (ends Dec)
// Filter Jan-Mar
// taskEnd = 10 + 2 - 1 = 11
// 11 < 0? No, 10 > 2? Yes ← No overlap, hidden ✓
```

### 3. Drag Left Edge
```javascript
// Task: startMonth=3, duration=2 (ends month 4)
// User drags left 120px (1 month)
// deltaMonths = -1
// newStart = Math.max(0, 3-1) = 2
// newDuration = 2 + (3-2) = 3
// Result: startMonth=2, duration=3, ends month 4 ✓
```

### 4. Modal Cancel
```javascript
// User opens task, changes name in form
// editingTask.name = "Modified"
// User clicks Cancel
// Modal closes, tasks state unchanged
// Task name still shows original in sidebar ✓
```

### 5. Stage Addition
```javascript
// User adds stage in modal
// New stage: { id: timestamp, name: "New Stage 1", startMonth: 0, duration: 1 }
// User saves
// Task.stages array now includes new stage ✓
// Sidebar shows chevron if not visible before ✓
```

---

## Potential Issues & Improvements

### Issue 1: Shallow Copy in Modal
**Location**: `App.jsx:98`
```javascript
setEditingTask({ ...task });
```

**Problem**: If user modifies a stage in the modal, then cancels, the original stage in tasks might be affected (shared reference).

**Fix**:
```javascript
setEditingTask({
  ...task,
  stages: task.stages.map(s => ({ ...s }))
});
```

### Issue 2: Dragging Performance
**Location**: `App.jsx:142-144`
```javascript
setTasks(prevTasks =>
  prevTasks.map(t => t.id === task.id ? updatedTask : t)
);
```

**Problem**: Every mousemove triggers full component re-render. With 1000+ tasks, would be slow.

**Fix**: Separate dragging state from tasks state, apply update only on mouseup.

### Issue 3: No Validation
**Location**: `App.jsx:466-473` (duration input)
```javascript
<input type="number" min="1" max="12" value={editingTask.duration} />
```

**Problem**: HTML5 validation doesn't prevent invalid values in JavaScript. If `onChange` directly sets invalid value, state could be inconsistent.

**Fix**:
```javascript
onChange={(e) => {
  const val = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
  setEditingTask({ ...editingTask, duration: val });
}}
```

### Issue 4: Stage ID Collision Risk
**Location**: `App.jsx:503`
```javascript
const newStage = {
  id: Date.now(),  // ← Could collide if two stages added same millisecond
  // ...
};
```

**Fix**: Use crypto.getRandomUUID() or UUID library, or use array index + timestamp.

### Issue 5: No Search Term Escaping
**Location**: `App.jsx:26`
```javascript
task.name.toLowerCase().includes(searchTerm.toLowerCase())
```

**Problem**: Special characters in search term might confuse users (e.g., no fuzzy matching). Minor issue for this use case.

### Issue 6: Accessibility
**Missing**:
- No `aria-label` on buttons
- No keyboard navigation (Tab, Enter, Escape)
- No focus management
- Chevron icons not labeled

**Fix**: Add ARIA attributes, keyboard event handlers, focus trap in modal.

---

## Summary

This is a well-structured, functional Gantt chart application with:

✓ **Strengths**:
- Clean separation of concerns (5 focused files)
- Proper React patterns (hooks, immutability, cleanup)
- Responsive UI with smooth interactions
- Synchronized scrolling between panels
- Drag-to-resize task bars and sidebar
- Stage management with expand/collapse

✗ **Weaknesses**:
- Single 632-line component (minor - no deep nesting)
- Shallow copy bug in modal
- No performance optimization for large datasets
- Limited validation
- No accessibility features
- No tests

**Overall Assessment**: Production-ready for 26-project use case, but would need refactoring for 1000+ projects.

