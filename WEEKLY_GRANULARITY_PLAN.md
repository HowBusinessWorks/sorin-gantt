# Weekly Granularity Implementation Plan

## Overview
Keep database in months, but display timeline as weeks for finer drag control.

---

## Key Changes

### 1. Update Constants (`src/data.js`)
```javascript
// OLD:
export const cellWidth = 120;  // 120px per month

// NEW:
export const cellWidth = 30;   // 30px per week (120px / 4 weeks)
export const weeksPerMonth = 4;
export const totalWeeks = 48;  // 12 months * 4 weeks
```

### 2. Month Headers → Week Headers
Display 48 week columns instead of 12 month columns:

```javascript
{/* Month Header Row with Week Divisions */}
{months.map((month, monthIndex) => (
  <div key={monthIndex} style={{ display: 'flex' }}>
    {/* Show month name spanning 4 weeks */}
    <div style={{ width: cellWidth * 4 }} className="border-r-2">
      {month}
    </div>
  </div>
))}

{/* Week Sub-Header Row */}
{Array.from({ length: 48 }).map((_, weekIndex) => (
  <div key={weekIndex} className="border-r" style={{ width: cellWidth }}>
    W{(weekIndex % 4) + 1}  {/* Week 1, 2, 3, 4 */}
  </div>
))}
```

### 3. Position Calculation
Convert month ranges to week ranges for positioning:

```javascript
// Helper function to convert month to week position
const monthToWeekStart = (startMonth) => startMonth * 4;
const monthDurationToWeeks = (duration) => duration * 4;

// Task bar positioning:
left = monthToWeekStart(task.startMonth) * cellWidth + 4,
width = monthDurationToWeeks(task.duration) * cellWidth - 8,

// Stage bar positioning:
left = monthToWeekStart(stage.startMonth) * cellWidth + 4,
width = monthDurationToWeeks(stage.duration) * cellWidth - 8,
```

### 4. Drag Calculation
Change delta calculation from months to weeks:

```javascript
// OLD:
const deltaMonths = Math.round((e.clientX - dragging.startX) / cellWidth);

// NEW:
const deltaWeeks = Math.round((e.clientX - dragging.startX) / cellWidth);
const deltaMonths = Math.floor(deltaWeeks / 4);  // Convert weeks to months for DB
const partialWeeks = deltaWeeks % 4;  // Remaining weeks

// On drag end, round to nearest month:
const finalMonthsAdjusted = deltaMonths + (partialWeeks >= 2 ? 1 : 0);
```

### 5. Snap to Month Boundaries (Optional)
You can choose to snap to:
- **Week boundaries** - drag by 30px (1 week)
- **Month boundaries** - only allow snapping when weeks align to month starts

**Recommended**: Week boundaries for now (more flexible)

### 6. Grid Lines
Update vertical grid lines to show 48 week columns:

```javascript
{Array.from({ length: 48 }).map((_, weekIndex) => (
  <div
    key={`week-line-${weekIndex}`}
    className="absolute top-0 h-full border-r border-gray-200"
    style={{ left: weekIndex * cellWidth }}
  />
))}
```

---

## Data Flow

### Dragging (UI to Local State)
```
User drags right edge 30px (1 week)
  ↓
deltaWeeks = 1
  ↓
Update local task.duration (stays in months, but represents more granular position)
  ↓
Task bar width updates immediately
```

**Wait, there's a problem here!** If we drag 1 week but store in months, we lose precision.

---

## Solution: Store Week Offsets During Drag

We need to track partial weeks during dragging:

```javascript
// In dragging state:
{
  task: originalTask,
  edge: 'end',
  startX: clientX,
  originalTask: { ...task },
  weekOffset: 0,  // NEW: track partial weeks
  monthOffset: 0   // NEW: track full months
}

// In handleMouseMove:
const deltaWeeks = Math.round((e.clientX - dragging.startX) / cellWidth);
const newMonths = Math.floor(deltaWeeks / 4);
const newWeekOffset = deltaWeeks % 4;

// Update UI with precise positioning:
updatedTask.duration = originalDuration + newMonths;
updatedTask._weekOffset = newWeekOffset;  // For visual positioning only
```

### On Save (Local State to Database)
Round the weeks to the nearest month:

```javascript
const saveDraggedTask = async (draggedTask) => {
  // Round partial weeks to nearest month for database
  const weekOffset = draggedTask._weekOffset || 0;
  const adjustedDuration = draggedTask.duration + (weekOffset >= 2 ? 1 : 0);

  // Save to DB (in months)
  await supabase.from('projects').update({
    duration: adjustedDuration,
    ...
  }).eq('id', draggedTask.id);
};
```

---

## Implementation Steps

### Step 1: Update Constants
- Change `cellWidth` from 120 to 30
- Add `weeksPerMonth = 4`
- Add `totalWeeks = 48`

### Step 2: Update Helper Functions
- Add `monthToWeekStart(month)` → month * 4
- Add `monthDurationToWeeks(duration)` → duration * 4

### Step 3: Update Timeline Headers
- Replace month header with month header + week sub-header
- Show "W1", "W2", "W3", "W4" under each month

### Step 4: Update Grid Lines
- Change from 12 lines to 48 lines
- Update `totalMonthsCount * cellWidth` to `totalWeeks * cellWidth`

### Step 5: Update Task Bar Positioning
- Use `monthToWeekStart()` and `monthDurationToWeeks()` for all bars
- Add `_weekOffset` tracking during drag

### Step 6: Update Drag Calculation
- Calculate `deltaWeeks` instead of `deltaMonths`
- Track week offsets during drag
- Round to nearest month on save

### Step 7: Update Vertical Grid Lines
- Show all 48 week dividers
- Maybe make month boundaries thicker (2px) and week boundaries thin (1px)

---

## Testing Checklist

- [ ] Timeline shows 48 weeks (4 per month)
- [ ] Month headers show full month names spanning 4 weeks
- [ ] Week sub-headers show "W1", "W2", "W3", "W4"
- [ ] Drag by 1 week (30px) moves task by ~1 week visually
- [ ] Drag by 2 weeks (60px) moves task by ~2 weeks
- [ ] Drag by 4 weeks (120px) moves task by 1 month
- [ ] Drag by 5 weeks rounds to 1 month on save
- [ ] All 26 projects still visible
- [ ] Stages still display correctly
- [ ] Save persists to database
- [ ] Refresh shows saved positions

---

## Code Changes Summary

| File | Changes |
|------|---------|
| `src/data.js` | cellWidth: 120→30, add weeksPerMonth, totalWeeks |
| `src/App.jsx` | Headers, grid lines, positioning, drag calculation, rounding logic |
| `src/utils.js` | Add monthToWeekStart(), monthDurationToWeeks() |

**Estimated effort**: 2-3 hours
**Complexity**: Medium (mostly positioning and calculation updates)
**Risk**: Low (database schema unchanged, data format same)

---

## Example: Task at Month 2, Duration 3

### Database
```
startMonth: 2
duration: 3
```

### UI Display
```
Weeks 8-19 (out of 48)
  - Month 2 starts at week 8
  - Spans 12 weeks (3 months * 4 weeks)
  - Position: left = 8 * 30px = 240px
  - Width: 12 * 30px = 360px
```

### Dragging Right Edge by 1 Week
```
deltaWeeks = 1
newMonths = 0
weekOffset = 1

Display width: 360px + 30px = 390px
On save: Round 1 week → no month added (< 2 weeks), save as duration: 3
```

### Dragging Right Edge by 2 Weeks
```
deltaWeeks = 2
newMonths = 0
weekOffset = 2

Display width: 360px + 60px = 420px
On save: Round 2 weeks → +1 month, save as duration: 4
```

