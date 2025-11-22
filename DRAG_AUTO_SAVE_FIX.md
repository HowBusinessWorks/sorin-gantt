# Drag Auto-Save Fix

## Problem
When dragging task bars, the changes were only saved locally. The modal didn't reliably open because:
- Drag and click events were conflicting
- No auto-save on drag end
- Sometimes modal would open, sometimes it wouldn't

## Solution Implemented

### 1. **Prevent Modal on Drag**
```javascript
// In handleBarDragStart:
e.stopPropagation(); // Stop click event from triggering
```

```javascript
// In task bar onClick:
onClick={(e) => {
  // Only open modal if not dragging
  if (!dragging) {
    handleTaskClick(task);
  }
}}
```

**Result**: Dragging no longer opens the modal. Modal only opens on direct click.

---

### 2. **Track Original Task State**
```javascript
setDragging({
  task: task,
  edge: edge,
  startX: e.clientX,
  originalTask: { ...task } // NEW: Save original for comparison
});
```

**Result**: We can detect if the task actually changed after dragging.

---

### 3. **Auto-Save on Drag End**
Created new function `saveDraggedTask()`:
```javascript
const saveDraggedTask = async (draggedTask) => {
  try {
    setSavingTask(true);
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        start_month: draggedTask.startMonth,
        duration: draggedTask.duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', draggedTask.id);

    if (projectError) throw projectError;
  } catch (err) {
    console.error('Error auto-saving dragged task:', err);
    setError(err.message || 'Failed to save drag changes');
  } finally {
    setSavingTask(false);
  }
};
```

In `handleMouseUp`:
```javascript
const handleMouseUp = async () => {
  if (dragging) {
    // Check if task was actually moved
    const hasChanged =
      dragging.task.startMonth !== dragging.originalTask.startMonth ||
      dragging.task.duration !== dragging.originalTask.duration;

    // Auto-save if changed
    if (hasChanged) {
      await saveDraggedTask(dragging.task);
    }
  }
  setDragging(null);
};
```

**Result**: When you release the drag, changes automatically save to Supabase. No modal needed!

---

### 4. **Real-Time UI Updates**
Updated dragging state during mousemove:
```javascript
// Update dragging state with the new task
setDragging(prev => ({ ...prev, task: updatedTask }));
```

**Result**: The task bar position updates smoothly in real-time as you drag.

---

## Behavior Changes

### Before
1. Drag a task bar → only local state updates
2. Click task bar → sometimes modal opens
3. Have to save via modal to persist to database
4. Unreliable interaction

### After
1. Drag a task bar → position updates in real-time ✓
2. Release mouse → automatically saves to Supabase ✓
3. Modal only opens on direct click (not during/after drag) ✓
4. Consistent, predictable interaction ✓

---

## Testing

Try these scenarios:

✅ **Drag left edge** - Should auto-save new start month
✅ **Drag right edge** - Should auto-save new duration
✅ **Drag slightly** - Should save (no minimum drag threshold)
✅ **Release without moving** - Should NOT save (no changes detected)
✅ **Click bar to edit** - Modal opens normally
✅ **Quick drag + click** - Modal won't open during drag
✅ **Error on save** - Red error banner appears

---

## Code Quality

✅ No breaking changes to existing functionality
✅ Proper error handling with user feedback
✅ Saves state comparison (only saves if changed)
✅ Loading state shows during save (visual feedback)
✅ Clean separation of concerns (drag logic separate from modal)

---

## Future Improvements

- [ ] Toast notification on successful drag-save
- [ ] Undo last drag change
- [ ] Debounce rapid drags
- [ ] Drag entire task (not just edges)
- [ ] Snap to today indicator
