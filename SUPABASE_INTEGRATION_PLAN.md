# Supabase Integration Plan

## Project Context
- **Supabase Project**: Sorin-Gantt (vxtfqgcybzsntegtvwfk)
- **Region**: EU-West-1
- **Status**: ACTIVE_HEALTHY
- **Current Architecture**: React + Vite + Tailwind (hardcoded data)
- **Target**: Public access (no authentication), no history tracking

---

## Phase 1: Database Schema Design

### Tables to Create

#### 1. `projects` (Main table for tasks)
```sql
CREATE TABLE projects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 0 AND start_month <= 11),
  duration INTEGER NOT NULL CHECK (duration >= 1 AND duration <= 12),
  progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Why BIGINT**: Sequentially numbered, matches React components (id: 1-26)
**Why these fields**: Match the Task object structure exactly

#### 2. `stages` (Sub-tasks within projects)
```sql
CREATE TABLE stages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 0 AND start_month <= 11),
  duration INTEGER NOT NULL CHECK (duration >= 1 AND duration <= 12),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Why CASCADE**: Deleting a project automatically deletes its stages

### Indexes
```sql
CREATE INDEX idx_stages_project_id ON stages(project_id);
```

### Row Level Security (RLS)
Since public (no auth):
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON projects
  FOR DELETE USING (true);

-- Same for stages table
```

---

## Phase 2: Data Migration

### Step 1: Seed Initial Data
Use Supabase SQL editor to insert the 26 projects from `data.js`:

```sql
INSERT INTO projects (id, name, start_month, duration, progress) VALUES
(1, 'Uzina Arcuda - Reabilitare interioara cladiri filtre vechi si noi / IDEM 3', 0, 3, 15),
(2, 'Uzina Arcuda - Reparatii si zugraveli exterioare cladiri filtre (acuitate vizuala)', 1, 2, 0),
-- ... (repeat for all 26 projects)
(26, 'Refacere terasa exterioara', 9, 3, 15);

INSERT INTO stages (project_id, name, start_month, duration) VALUES
(1, 'Demolare si pregatire', 0, 1),
(1, 'Instalatii noi', 1, 1),
(1, 'Finisaje interioare', 2, 1),
(3, 'Evaluare si diagnoza', 2, 1),
-- ... (repeat for all stages)
```

---

## Phase 3: Frontend Changes

### 3.1 Add Supabase Client Package
```bash
npm install @supabase/supabase-js
```

### 3.2 Create Supabase Client Module
**File**: `src/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxtfqgcybzsntegtvwfk.supabase.co';
const SUPABASE_ANON_KEY = '<WILL_PROVIDE>';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3.3 Modify App.jsx State Management

**Before** (lines 8-16):
```javascript
const [tasks, setTasks] = useState(initialTasks);
```

**After**:
```javascript
const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Fetch projects from Supabase on mount
useEffect(() => {
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          stages:stages(*)
        `)
        .order('id', { ascending: true });

      if (projectError) throw projectError;

      // Transform Supabase data to match Task structure
      const formattedTasks = projects.map(project => ({
        id: project.id,
        name: project.name,
        startMonth: project.start_month,
        duration: project.duration,
        progress: project.progress,
        stages: project.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          startMonth: stage.start_month,
          duration: stage.duration
        }))
      }));

      setTasks(formattedTasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchProjects();
}, []);
```

### 3.4 Update Task Save Handler

**Current** (lines 604-609):
```javascript
setTasks(tasks.map(task =>
  task.id === editingTask.id ? editingTask : task
));
```

**New**:
```javascript
const handleSaveTask = async (editedTask) => {
  try {
    // Update project
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        name: editedTask.name,
        start_month: editedTask.startMonth,
        duration: editedTask.duration,
        progress: editedTask.progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', editedTask.id);

    if (projectError) throw projectError;

    // Handle stages
    const newStages = editedTask.stages.filter(s => !s.id || s.id > Date.now() - 10000);
    const existingStages = editedTask.stages.filter(s => s.id && s.id < Date.now() - 10000);

    // Delete old stages not in editedTask
    const { data: currentStages } = await supabase
      .from('stages')
      .select('id')
      .eq('project_id', editedTask.id);

    const stagesToDelete = currentStages.filter(
      s => !existingStages.find(es => es.id === s.id)
    );

    for (const stage of stagesToDelete) {
      await supabase
        .from('stages')
        .delete()
        .eq('id', stage.id);
    }

    // Insert new stages
    if (newStages.length > 0) {
      const { error: stageError } = await supabase
        .from('stages')
        .insert(newStages.map(s => ({
          project_id: editedTask.id,
          name: s.name,
          start_month: s.startMonth,
          duration: s.duration
        })));

      if (stageError) throw stageError;
    }

    // Update local state
    setTasks(tasks.map(task =>
      task.id === editedTask.id ? editedTask : task
    ));

    setSelectedTask(null);
    setEditingTask(null);
  } catch (err) {
    console.error('Error saving task:', err);
    setError(err.message);
  }
};
```

Update the Save button to call this:
```javascript
<button onClick={() => handleSaveTask(editingTask)}>
  Save Changes
</button>
```

### 3.5 Handle Loading & Error States

Add to header:
```javascript
{loading && (
  <div className="text-white text-center mt-4">Loading projects...</div>
)}

{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    Error: {error}
  </div>
)}
```

### 3.6 Update Add Stage Handler

**Current** (lines 501-511):
```javascript
const newStage = {
  id: Date.now(),
  name: `New Stage ${editingTask.stages.length + 1}`,
  startMonth: editingTask.startMonth,
  duration: 1
};
```

**Note**: Keep using `Date.now()` for new stages (will be converted to real IDs on save).

---

## Phase 4: Optional Enhancements

### 4.1 Real-time Updates
Replace static fetch with subscription:

```javascript
useEffect(() => {
  const subscription = supabase
    .from('projects')
    .on('*', payload => {
      // Re-fetch all projects when any change happens
      fetchProjects();
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

### 4.2 Optimistic Updates
Update UI immediately, sync with DB in background:

```javascript
// Show update immediately
setTasks(tasks.map(t => t.id === editedTask.id ? editedTask : t));

// Sync to DB in background
handleSaveTask(editedTask).catch(err => {
  // Revert on error
  setTasks(tasks); // Reload from server
  setError(err.message);
});
```

### 4.3 Drag to Update
Instead of requiring modal save, update on drag end:

```javascript
const handleBarDragEnd = async (updatedTask) => {
  try {
    await supabase
      .from('projects')
      .update({
        start_month: updatedTask.startMonth,
        duration: updatedTask.duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedTask.id);

    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  } catch (err) {
    setError(err.message);
    // Revert on error
    setTasks(tasks);
  }
};
```

---

## Phase 5: Testing Checklist

- [ ] Projects load on app mount
- [ ] All 26 projects visible in sidebar
- [ ] Search filters work with fetched data
- [ ] Stages expand/collapse correctly
- [ ] Edit modal saves changes to Supabase
- [ ] New stages are inserted
- [ ] Deleted stages are removed
- [ ] Progress slider updates progress column
- [ ] Drag-to-resize works (if implemented)
- [ ] Error messages display on network failure
- [ ] Loading state shows while fetching
- [ ] No console errors

---

## Phase 6: Deployment

### 6.1 Environment Variables
Create `.env.local`:
```
VITE_SUPABASE_URL=https://vxtfqgcybzsntegtvwfk.supabase.co
VITE_SUPABASE_ANON_KEY=<KEY>
```

Update `supabaseClient.js`:
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 6.2 Build & Deploy
```bash
npm run build
# Deploy dist/ folder to hosting (Vercel, Netlify, etc.)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React App (Vite)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ App.jsx                                              │  │
│  │ - State: tasks, loading, error                       │  │
│  │ - Effects: fetch projects on mount                   │  │
│  │ - Handlers: save task, update progress, etc.         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ supabaseClient.js                                    │  │
│  │ - Initializes Supabase client                        │  │
│  │ - Exports for use in effects/handlers                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              ↕ (HTTPS Queries)
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Backend                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   projects   │  │   stages     │  │   RLS       │      │
│  │   (26 rows)  │  │   (many rows)│  │  (policies) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  PostgreSQL 17.6.1 (EU-West-1)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### Data Transformation
Supabase uses snake_case, React uses camelCase:
- DB: `start_month` → App: `startMonth`
- DB: `start_month` → App: `startMonth`

Always transform when fetching and saving.

### ID Strategy
- **Existing projects**: Keep IDs 1-26 (provided in migration)
- **New stages**: Use `Date.now()` temporarily, convert to real BIGINT on save
- **New projects**: Auto-increment from Supabase sequence

### Error Handling
Wrap all Supabase calls in try-catch:
```javascript
try {
  // Supabase call
} catch (err) {
  console.error('Error:', err);
  setError(err.message);
  // Optionally revert optimistic updates
}
```

### Performance Notes
- Single `.select()` with joined stages: 1 query (good)
- Stage operations: multiple queries per save (acceptable for 26 projects)
- No pagination needed (max 26 projects)

---

## Summary of Changes

| File | Changes | LOC |
|------|---------|-----|
| `src/supabaseClient.js` | New file | ~10 |
| `src/App.jsx` | Add fetch effect, handlers, loading/error states | +~100 |
| `package.json` | Add @supabase/supabase-js | +1 |
| `.env.local` | Add Supabase credentials | ~2 |
| Database | Create projects & stages tables, RLS policies | ~50 |
| Data migration | Insert 26 projects + stages | ~100 |

**Total Lines Added**: ~260 (mostly in App.jsx)
**Complexity**: Moderate (state management + async operations)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Network latency | Loading state, error messages, timeout handling |
| Data inconsistency | Transaction-like behavior, re-fetch on error |
| Large stage arrays | Pagination (if >100 stages per project) |
| Deleted projects | Cascade delete in DB, no orphaned stages |
| Concurrent edits | Last-write-wins (acceptable for small team) |

