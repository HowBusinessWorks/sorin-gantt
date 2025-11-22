# Weekly Drag Test Guide

## Issue Fixed
The drag calculation was using `Math.floor(deltaWeeks / weeksPerMonth)` which was converting weeks to whole months immediately, causing the visual drag to snap in month-sized increments.

## Solution Applied
Both start edge and end edge now use **proportional calculations**:
- Drag 1 week (30px): moves by 0.25 months
- Drag 2 weeks (60px): moves by 0.5 months
- Drag 4 weeks (120px): moves by 1 full month
- Final value is rounded when saved to database

### Code Changes Made

**End Edge (Duration)** - Line 227:
```javascript
const newDurationMonths = originalTask.duration + deltaWeeks / weeksPerMonth;
const newDuration = Math.max(1, Math.round(newDurationMonths));
```

**Start Edge (Position)** - Line 219-220:
```javascript
const newStartMonthFloat = originalTask.startMonth + deltaWeeks / weeksPerMonth;
const newStartMonth = Math.max(0, Math.min(11, Math.round(newStartMonthFloat)));
```

Both now:
1. Calculate fractional month change (deltaWeeks / 4)
2. Round the result for display
3. Save rounded value to database

---

## How to Test

### Prerequisites
- Dev server running: `npm run dev` (should already be running)
- Open app in browser at `http://localhost:5173` or `http://localhost:5174`

### Test Case 1: Right Edge Drag (Duration)
1. Find any task with duration 3+ months
2. **Drag the right edge slowly to the right**
   - Drag by ~30px (1 week): Task should visually expand by 1 week (≈7.5% wider), but save as duration 3
   - Drag by ~60px (2 weeks): Task should expand by 2 weeks (≈15% wider), then round up to duration 4 on save
   - Drag by ~90px (3 weeks): Task should expand, then round to duration 4
   - Drag by ~120px (4 weeks): Task should expand by 1 full month, save as duration 4

**Visual Feedback Should Be**: Smooth, incremental growth with no jumps

**Expected Behavior**:
- Dragging shows real-time visual feedback
- Small drags (< 2 weeks) don't change saved duration
- 2+ week drags round up to next month on save
- After drag release, if no month change, modal shouldn't open (auto-save in background)

### Test Case 2: Left Edge Drag (Start Month)
1. Find any task starting in month 2 or later
2. **Drag the left edge slowly to the right**
   - Drag by ~30px: Task should move slightly right but stay in same month on save
   - Drag by ~60px: Task should move, then round to next month
   - Drag by ~120px: Task moves by 1 full month

**Visual Feedback Should Be**: Smooth leftward movement of task start position

### Test Case 3: Edge Case - Task at End of Year
1. Find a task starting in month 10 (November)
2. **Drag right edge**: Should stop expanding at month 11 (December), respecting the year boundary
3. **Drag left edge**: Can move backward through months without issue

### Test Case 4: Refresh Persistence
1. Drag any task's right edge by 2 weeks (should round to +1 month duration)
2. **Refresh the page** (F5 or Ctrl+R)
3. **Expected**: Task should still show the new duration from database
4. The 48-week grid should load correctly with all tasks positioned

---

## What NOT to Expect

❌ **Do NOT expect month-sized jumps** - this was the bug
❌ **Do NOT expect tasks to snap to month boundaries during drag** - it should be smooth
❌ **Do NOT expect modal to always open** - only opens if drag actually changes saved value
❌ **Do NOT expect the task bar width to stay the same** - it should visually respond to every pixel dragged

---

## What To Expect

✅ **Smooth visual feedback** - task bar grows/shrinks as you drag
✅ **Week-granular movement** - every 30px changes visual feedback
✅ **Smart rounding on save** - fractional weeks round to nearest month
✅ **Auto-save on drag release** - no modal needed for drag operations
✅ **Correct grid display** - 48 weeks with month/week headers visible
✅ **All 26 tasks positioned correctly** - in their respective month ranges

---

## Debugging Steps (If Issues Persist)

1. **Open browser console** (F12 → Console tab)
2. **Look for errors**: Should be none (or only CSS warnings)
3. **Check network tab**: Watch for failed requests when dragging
4. **Monitor variables**:
   - `deltaWeeks` should increment smoothly (0, 1, 2, 3, ...)
   - `newDurationMonths` should be fractional (3.25, 3.5, 3.75, 4.0)
   - Final `newDuration` should be whole number after rounding (3, 4, 5, ...)

---

## Expected Math Examples

### Task: ID=1, startMonth=0, duration=3 (3 months = 12 weeks)

**Drag right edge 30px (1 week)**:
- deltaWeeks = 1
- newDurationMonths = 3 + 1/4 = 3.25
- newDuration = Round(3.25) = 3
- Saved as: duration = 3 ✓

**Drag right edge 60px (2 weeks)**:
- deltaWeeks = 2
- newDurationMonths = 3 + 2/4 = 3.5
- newDuration = Round(3.5) = 4 (≥2 weeks rounds up)
- Saved as: duration = 4 ✓

**Drag right edge 90px (3 weeks)**:
- deltaWeeks = 3
- newDurationMonths = 3 + 3/4 = 3.75
- newDuration = Round(3.75) = 4
- Saved as: duration = 4 ✓

**Drag right edge 120px (4 weeks = 1 month)**:
- deltaWeeks = 4
- newDurationMonths = 3 + 4/4 = 4.0
- newDuration = Round(4.0) = 4
- Saved as: duration = 4 ✓

---

## Files Modified

- `src/App.jsx` - Lines 216-223 (start edge logic updated to proportional)
- `src/App.jsx` - Lines 224-230 (end edge logic already proportional)

Both now use: `position/duration + deltaWeeks / weeksPerMonth` for smooth week-based dragging.

---

## Next Steps After Testing

If all tests pass:
1. ✅ Weekly drag granularity is working
2. ✅ Database persistence is working
3. ✅ Rounding logic is correct

Then you can:
- [ ] Test keyboard shortcuts (if any exist)
- [ ] Test search/filter with weekly grid
- [ ] Test modal editing with the new grid
- [ ] Test stage dragging
- [ ] Test on different screen sizes
- [ ] Test performance with multiple drags

---

## Success Criteria

✅ The app successfully implements weekly-granular dragging while maintaining monthly database storage
✅ Visual feedback is smooth without jumps or snapping to month boundaries
✅ Dragging 2+ weeks rounds to the next month when saved
✅ All 48 weeks display correctly with headers and grid lines
✅ Changes persist after page refresh
✅ No console errors during drag operations
