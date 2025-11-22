Construction Gantt Chart Dashboard - Product Requirements Document
1. Overview
1.1 Purpose
Create an interactive Gantt chart dashboard for managing 26 construction projects throughout 2026. The dashboard enables project timeline visualization, progress tracking, and detailed project management with stage-level granularity.
1.2 Target Users
Construction project managers and coordinators who need to track multiple simultaneous projects with detailed timelines and stages.

2. Core Features
2.1 Project List (Left Sidebar)

Width: Adjustable from 300px to 800px (default: 500px)
Resize Handle: Vertical bar on the right edge for dragging to adjust width
Header: Fixed header showing "Project Name" (height: 80px, gray background)
Task Rows:

Height: 50px per task
Display: Task name (truncated if too long), progress percentage
Hover effect: Light gray background
Click: Opens edit modal


Expandable Stages:

Chevron icon (right/down) for tasks with stages
Stage rows: 40px height, indented (pl-12), lighter background
Click chevron to expand/collapse stages



2.2 Timeline (Right Side - Scrollable)

Structure: Horizontal scroll to view entire year (365 days)
Cell Width: 30px per day
Headers (Fixed, height: 80px total):

Month Row: Full month names, spans multiple days based on month length
Day Row: Individual day numbers (1-31) under each month
Thicker borders (2px) between months, thin borders (1px) between days


Grid Lines:

Vertical lines every day (thin, gray-100)
Vertical lines between months (thick, gray-300)
Horizontal lines between task rows (gray-200)



2.3 Task Bars

Positioning:

Vertically centered in row (transform: translateY(-50%))
Left position: (startDay - 1) × cellWidth + 4px
Width: duration × cellWidth - 8px
Height: 32px


Visual Design:

Rounded corners
Color based on progress:

0%: Gray (bg-gray-400)
1-49%: Yellow (bg-yellow-500)
50-99%: Blue (bg-blue-500)
100%: Green (bg-green-500)


Progress indicator: White semi-transparent overlay showing percentage
Text: Centered white text showing progress percentage


Interaction:

Hover: Slight opacity change (hover:opacity-90)
Drag handles on left and right edges (2px width)
Cursor changes to ew-resize on handles
Click: Opens edit modal



2.4 Stage Bars (When Expanded)

Positioning: Same logic as task bars but in 40px rows
Visual: Light blue color (bg-blue-300), 24px height
Height: 24px (6 in h-6)
Non-interactive: Display only (no dragging in current version)


3. Interactive Features
3.1 Search and Filter

Search Bar:

Icon: Magnifying glass (left side)
Placeholder: "Search projects..."
Function: Real-time filtering by project name (case-insensitive)


Date Filter:

Icon: Calendar
Start Date: Month dropdown + day input (1-31, validates against month)
End Date: Month dropdown + day input
Function: Filters tasks where task timeline overlaps with selected date range
Default: January 1 to December 31 (full year)



3.2 Task Bar Dragging

Left Edge Drag:

Changes start date
Adjusts duration to maintain end date
Minimum: Day 1 of year
Snaps to day boundaries (30px increments)


Right Edge Drag:

Changes duration/end date
Keeps start date fixed
Minimum duration: 1 day
Snaps to day boundaries



3.3 Sidebar Resizing

Trigger: Mouse down on 1px wide resize handle (right edge of sidebar)
Constraints: Min width 300px, max width 800px
Visual: Hover shows blue highlight on resize handle
Cursor: Changes to col-resize

3.4 Expandable Stages

Trigger: Click chevron button (stops propagation to prevent modal)
State: Tracked per task ID in expandedTasks object
Animation: Smooth expand/collapse
Visual: Chevron rotates (right → down)


4. Edit Modal
4.1 Trigger

Click anywhere on task row (except chevron button)
Click on task bar in timeline

4.2 Modal Structure

Overlay: Black with 50% opacity, full screen, centered content
Container: White rounded card, max-width 2xl, max-height 90vh, scrollable
Header:

Title: "Edit Project" (text-2xl, bold)
Close button: X icon (top right)



4.3 Form Fields
Project Name

Type: Text input
Full width: With border, rounded, focus ring

Start Date

Month Dropdown: Full month names (January-December)
Day Input: Number input (1 to days in selected month)
Validation: Day automatically adjusts if exceeds month's days
Conversion: Uses getDayOfYear() function to convert month/day to day number (1-365)

Duration

Type: Number input
Label: "Duration (days)"
Range: 1-366 days
Default: Current task duration

Progress

Type: Range slider (0-100)
Display: Large centered percentage below slider
Visual: Updates task bar color in real-time on save

Stages Section

Header: "Stages" label + "Add Stage" button (blue, with Plus icon)
Stage Cards: Each stage displays:

Name Input: Full width text input
Start Date: Month dropdown (short names) + day input
Duration: Number input (days, 1-366)
Delete Button: Red X icon


Layout: Flex container with gap, gray background (bg-gray-50)

4.4 Actions

Save Changes: Blue button, updates tasks state, closes modal
Cancel: Gray outlined button, discards changes, closes modal


5. Data Structure
5.1 Task Object
javascript{
  id: number,              // Unique identifier
  name: string,            // Project name
  startDay: number,        // Day of year (1-365)
  duration: number,        // Duration in days
  progress: number,        // 0-100
  stages: Array<Stage>     // Array of stage objects
}
5.2 Stage Object
javascript{
  id: number,              // Unique identifier (timestamp)
  name: string,            // Stage name
  startDay: number,        // Day of year (1-365)
  duration: number         // Duration in days
}
5.3 Date Filter Object
javascript{
  startDay: number,        // Day of year (1-365)
  endDay: number           // Day of year (1-365)
}

6. Helper Functions
6.1 Date Conversion Functions
getDaysInMonth(month)
javascript// Returns number of days in given month (0-11)
// Uses daysInMonth array: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
getTotalDaysUpToMonth(month)
javascript// Returns cumulative days from Jan 1 to start of given month
// Used for positioning month boundaries
getDayOfYear(month, day)
javascript// Converts month (0-11) and day (1-31) to day of year (1-365)
// Returns: getTotalDaysUpToMonth(month) + day
getMonthAndDay(dayOfYear)
javascript// Converts day of year (1-365) to {month, day}
// Iterates through months subtracting days until finding correct month
6.2 Visual Helper Functions
getProgressColor(progress)
javascript// Returns Tailwind class based on progress:
// 0: 'bg-gray-400'
// 1-49: 'bg-yellow-500'
// 50-99: 'bg-blue-500'
// 100: 'bg-green-500'

7. State Management
7.1 React State Variables

tasks: Array of task objects (initial 26 tasks)
searchTerm: String for search filter
dateFilter: Object with startDay and endDay
selectedTask: Currently selected task (null when modal closed)
editingTask: Copy of selected task being edited
expandedTasks: Object mapping task IDs to boolean (expanded state)
dragging: Object with task, edge, and startX (null when not dragging)
sidebarWidth: Number (300-800, default 500)
resizingSidebar: Boolean for resize operation

7.2 Computed Values

filteredTasks: Derived from tasks, searchTerm, and dateFilter
totalDays: Sum of all daysInMonth (365)
cellWidth: Constant 30px
rowHeight: Constant 50px


8. Event Handlers
8.1 Task Bar Dragging

handleBarDragStart(e, task, edge):

Store dragging state with task, edge ('start' or 'end'), and startX
Prevent default to avoid text selection


handleBarDrag(e):

Calculate deltaDays from mouse movement
For 'start' edge: Update startDay and adjust duration
For 'end' edge: Update duration only
Update tasks array immediately for smooth feedback


handleBarDragEnd():

Clear dragging state
Automatically called on mouseup



8.2 Sidebar Resizing

handleSidebarResize(e):

If resizingSidebar true, calculate new width from e.clientX
Constrain between 300-800px


handleSidebarResizeEnd():

Set resizingSidebar to false



8.3 Modal Actions

handleTaskClick(task):

Set selectedTask and create copy in editingTask


handleSaveTask():

Update tasks array with editingTask
Clear selectedTask and editingTask


handleAddStage():

Add new stage to editingTask.stages with default values
Use Date.now() for unique stage ID


handleDeleteStage(stageId):

Filter out stage from editingTask.stages


toggleExpand(taskId):

Toggle boolean in expandedTasks object




9. Initial Data (26 Tasks)
javascript[
  { id: 1, name: "Uzina Arcuda - Reabilitare interioara cladiri filtre vechi si noi / IDEM 3", startDay: 1, duration: 90, progress: 0, stages: [] },
  { id: 2, name: "Uzina Arcuda - Reparatii si zugraveli exterioare cladiri filtre (acuitate vizuala)", startDay: 32, duration: 60, progress: 0, stages: [] },
  { id: 3, name: "Uzina Arcuda - Reabilitare filtre rapide vechi - FR 3, 4 IDEM 1", startDay: 60, duration: 120, progress: 0, stages: [] },
  { id: 4, name: "Uzina Arcuda - Reabilitare exterioara statia acid", startDay: 1, duration: 60, progress: 0, stages: [] },
  { id: 5, name: "Uzina Arcuda - Reabilitare exterioara statia clor", startDay: 32, duration: 60, progress: 0, stages: [] },
  { id: 6, name: "Uzina Arcuda - Reabilitare scara dispecerat", startDay: 91, duration: 60, progress: 0, stages: [] },
  { id: 7, name: "Uzina Arcuda - Reabilitare grup sanitar cladire administrativa", startDay: 60, duration: 30, progress: 0, stages: [] },
  { id: 8, name: "Uzina Crivina - Reabilitare acoperis statie Chimica", startDay: 121, duration: 90, progress: 0, stages: [] },
  { id: 9, name: "NH Ciorogarla - Reabilitare sifonare apa potabila", startDay: 91, duration: 60, progress: 0, stages: [] },
  { id: 10, name: "Baraj Crivina - Reparatii pile fuziforme desnisipatoare etapa 2", startDay: 152, duration: 90, progress: 0, stages: [] },
  { id: 11, name: "SP Sud - R3 (26000 mc) - reparatii atic deplasat, sistem pluvial cu protectii", startDay: 32, duration: 120, progress: 0, stages: [] },
  { id: 12, name: "SP Sud - R3 - reparatii grinzi - reabilitare totala", startDay: 121, duration: 150, progress: 0, stages: [] },
  { id: 13, name: "SP Sud - R4 - tencuieli exterioare", startDay: 60, duration: 60, progress: 0, stages: [] },
  { id: 14, name: "SP Nord - R1 - reparatii tencuieli exterioare si trotuarele de garda, scari si usi acces; statia de golire - reparatie trotuar de garda", startDay: 182, duration: 90, progress: 0, stages: [] },
  { id: 15, name: "SP Nord - Reparatii fatada intrare statie, reparatii zugraveli interioare casa scarilor (infiltratii)", startDay: 91, duration: 60, progress: 0, stages: [] },
  { id: 16, name: "SP Nord - Reparatii punctiforme in sala pompelor si reparatii rosturi dilatare a constructiei", startDay: 152, duration: 60, progress: 0, stages: [] },
  { id: 17, name: "SP Nord - Cabine foraje - termoizolatie - 7 buc. si acces pt prelevare probe (dale sau pietris)", startDay: 213, duration: 60, progress: 0, stages: [] },
  { id: 18, name: "SP Nord - Reparatii si zugraveli interior/exterior camere stavilar/vane", startDay: 121, duration: 90, progress: 0, stages: [] },
  { id: 19, name: "SP Grivita - R1 si R2 - refacere hidroizolatie rezervoare", startDay: 244, duration: 90, progress: 0, stages: [] },
  { id: 20, name: "SP Grivita - CS1 si CS2 - reparatie trotuare de garda", startDay: 182, duration: 60, progress: 0, stages: [] },
  { id: 21, name: "SP Drumul Taberei - Sistem drenaj apa pluviala rezervoare R1 si R2", startDay: 152, duration: 60, progress: 0, stages: [] },
  { id: 22, name: "SP Preciziei - Reparatii si zugraveli interioare in sala pompelor", startDay: 213, duration: 60, progress: 0, stages: [] },
  { id: 23, name: "SP Uverturii - Reparatii si zugraveli interioare in sala pompelor", startDay: 274, duration: 60, progress: 0, stages: [] },
  { id: 24, name: "SP Sud - Reparatii si zugraveli fatada statiei", startDay: 244, duration: 60, progress: 0, stages: [] },
  { id: 25, name: "Rezervoare Cotroceni - Reabilitare totala interioara R1C3", startDay: 305, duration: 60, progress: 0, stages: [] },
  { id: 26, name: "Refacere terasa exterioara", startDay: 274, duration: 90, progress: 0, stages: [] }
]

10. Styling Guidelines
10.1 Color Palette

Primary: Blue-500 (buttons, accents)
Background: Gray-50 (page), Gray-100 (headers), White (cards)
Borders: Gray-200 (thin), Gray-300 (thick)
Text: Gray-800 (headers), Gray-700 (body), Gray-600 (secondary)
Progress: Gray-400, Yellow-500, Blue-500, Green-500

10.2 Typography

Headers: text-3xl (page title), text-2xl (modal title)
Body: text-sm (task names), text-xs (day numbers, progress)
Weight: font-bold (titles), font-semibold (headers), font-medium (buttons)

10.3 Spacing

Padding: p-6 (containers), p-4 (rows), px-4 py-2 (inputs)
Gaps: gap-4 (main layouts), gap-2 (form fields)
Rounded: rounded-lg (cards, inputs, buttons)

10.4 Shadows

Cards: shadow-sm (normal), shadow-xl (modal)


11. Responsive Considerations
11.1 Minimum Widths

Search bar: min-w-[300px]
Sidebar: 300px minimum (adjustable)
Modal: max-w-2xl

11.2 Overflow Handling

Timeline: overflow-x-auto (horizontal scroll)
Modal content: max-h-[90vh] with overflow-y-auto
Task names: truncate with ellipsis


12. Dependencies
12.1 Required Libraries

React: useState, useEffect hooks
lucide-react: Icons (Calendar, Search, Plus, X, Edit2, ChevronDown, ChevronRight)

12.2 Styling

Tailwind CSS: All styling uses Tailwind utility classes


13. Performance Considerations
13.1 Rendering Optimization

Use inline styles for dynamic positioning (left, width, height)
Key all mapped elements (tasks, stages, days, months)
Prevent default on drag events to avoid browser behavior

13.2 Event Listeners

Add/remove global listeners in useEffect cleanup
Separate useEffect for dragging and sidebar resizing
Stop propagation on nested clickable elements


14. Future Enhancement Ideas

Drag entire task bar to change dates
Zoom in/out on timeline (adjust cellWidth)
Today marker line
Task dependencies with arrows
Export to PDF or Excel
Color coding by project type
Team member assignments
Comments and notes per task
Undo/redo functionality
Keyboard shortcuts


15. Technical Implementation Notes
15.1 Component Structure
GanttChart2026
├── Header Section (filters)
├── Gantt Chart Container
│   ├── Task List Sidebar (resizable)
│   │   ├── Header
│   │   ├── Task Rows
│   │   └── Resize Handle
│   └── Timeline Section (scrollable)
│       ├── Month Headers
│       ├── Day Headers
│       └── Task Bar Grid
└── Edit Modal (conditional render)
    ├── Project Name
    ├── Start Date
    ├── Duration
    ├── Progress
    └── Stages Section
15.2 Key Algorithms
Filter Tasks
javascriptfilteredTasks = tasks.filter(task => {
  const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
  const taskEnd = task.startDay + task.duration - 1;
  const matchesDate = !(taskEnd < dateFilter.startDay || task.startDay > dateFilter.endDay);
  return matchesSearch && matchesDate;
});
Drag Calculation
javascript// Calculate days moved
const deltaDays = Math.round((e.clientX - dragging.startX) / cellWidth);

// For start edge: adjust both startDay and duration
const newStart = Math.max(1, Math.min(totalDays, task.startDay + deltaDays));
const newDuration = task.duration + (task.startDay - newStart);

// For end edge: adjust duration only
const newDuration = Math.max(1, task.duration + deltaDays);

16. Accessibility Notes
16.1 Keyboard Navigation

Modal can be closed with X button
All interactive elements are clickable/focusable
Form inputs support keyboard entry

16.2 Visual Clarity

High contrast between text and backgrounds
Clear hover states on interactive elements
Progress indicated by both color and percentage text
Consistent spacing and alignment


17. Testing Checklist
17.1 Functional Tests

 Search filters tasks correctly
 Date filter shows only relevant tasks
 Dragging left edge changes start date
 Dragging right edge changes duration
 Sidebar resizes within constraints
 Modal opens on task click
 Modal saves changes correctly
 Stages can be added and deleted
 Expand/collapse works for tasks with stages
 Progress slider updates percentage

17.2 Visual Tests

 Task bars align with rows
 Day numbers align with grid
 Month boundaries are clear
 Colors match progress levels
 Text truncates appropriately
 Modal is centered and scrollable

17.3 Edge Cases

 Task with 1-day duration
 Task spanning full year
 Empty search results
 Invalid date inputs (handled with min/max)
 Resizing beyond constraints
 Multiple stages per task


18. Implementation Priority
Phase 1 (MVP)

Basic layout (sidebar + timeline)
Static task display
Month/day headers
Task bars with correct positioning

Phase 2 (Interactivity)

Search and date filters
Modal for editing
Progress slider
Save functionality

Phase 3 (Advanced)

Drag to resize task bars
Sidebar resizing
Stage management
Expand/collapse stages

Phase 4 (Polish)

Hover effects
Color coding by progress
Smooth transitions
Visual refinements


19. Code Organization
19.1 Constants
javascriptconst months = ['January', ...];
const monthsShort = ['Ian', ...];
const daysInMonth = [31, 29, ...];
const cellWidth = 30;
const rowHeight = 50;
19.2 State Initialization
javascriptconst [tasks, setTasks] = useState(initialTasks);
const [searchTerm, setSearchTerm] = useState('');
// ... other state variables
19.3 Helper Functions
javascriptconst getDaysInMonth = (month) => {...};
const getTotalDaysUpToMonth = (month) => {...};
// ... other helpers
19.4 Event Handlers
javascriptconst handleTaskClick = (task) => {...};
const handleBarDragStart = (e, task, edge) => {...};
// ... other handlers
19.5 Effects
javascriptReact.useEffect(() => {
  // Dragging listeners
}, [dragging]);

React.useEffect(() => {
  // Sidebar resize listeners
}, [resizingSidebar]);
19.6 Render
javascriptreturn (
  <div className="min-h-screen bg-gray-50 p-6">
    {/* Header */}
    {/* Gantt Chart */}
    {/* Edit Modal */}
  </div>
);

20. Maintenance Guidelines
20.1 Adding New Tasks
Add to initialTasks array with unique ID, name, startDay (1-365), duration (days), progress (0-100), and empty stages array.
20.2 Modifying Styles
All styling uses Tailwind classes. Update classes in JSX, not separate CSS files.
20.3 Changing Timeline Granularity
Adjust cellWidth constant to zoom in/out. Smaller = more detail, larger = less detail.
20.4 Adding New Months/Years
Update months, monthsShort, and daysInMonth arrays. Adjust leap year logic if needed.

End of Document
This PRD provides complete specifications for implementing the Construction Gantt Chart Dashboard. All features, interactions, and visual details are documented for precise recreation.