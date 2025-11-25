import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Search, Plus, X, Edit2, ChevronDown, ChevronRight, AlertCircle, Loader, Camera, Palette } from 'lucide-react';
import { months, monthsShort, cellWidth, rowHeight, totalMonths, weeksPerMonth, totalWeeks } from './data.js';
import { getProgressColor, getTotalMonths, getMonthName, getTotalWeeks, monthToWeekStart, monthDurationToWeeks, getWeekOfMonth } from './utils.js';
import { supabase } from './supabaseClient.js';
import html2canvas from 'html2canvas';
import { templates, defaultTemplate } from './templates.js';

function App() {
  // State management
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ startMonth: 0, endMonth: 11 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [dragging, setDragging] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [draggedProjectId, setDraggedProjectId] = useState(null);
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [templateKey, setTemplateKey] = useState(() => {
    const saved = localStorage.getItem('ganttTemplate');
    return (saved && templates[saved]) ? saved : defaultTemplate;
  });

  const currentTemplate = templates[templateKey] || templates[defaultTemplate];

  // Refs for synchronized scrolling
  const sidebarRef = useRef(null);
  const timelineRef = useRef(null);
  const chartContainerRef = useRef(null);

  const totalMonthsCount = getTotalMonths();

  // Fetch projects from Supabase on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select(`
            *,
            stages(*)
          `)
          .order('sort_order', { ascending: true });

        if (projectError) throw projectError;

        // Transform Supabase data to match Task structure
        const formattedTasks = projects.map(project => ({
          id: project.id,
          name: project.name,
          startMonth: project.start_month,
          duration: project.duration,
          durationWeeks: project.duration_weeks || project.duration * weeksPerMonth, // Duration in weeks
          startWeekOffset: project.start_week_offset || 0, // 0-3 weeks offset at the start
          weekOffset: project.week_offset || 0, // 0-3 weeks offset at the end
          color: project.color || '#3B82F6', // Default blue
          progress: project.progress,
          sortOrder: project.sort_order,
          stages: (project.stages || []).map(stage => ({
            id: stage.id,
            name: stage.name,
            startMonth: stage.start_month,
            duration: stage.duration,
            durationWeeks: stage.duration_weeks || stage.duration * weeksPerMonth,
            startWeekOffset: stage.start_week_offset || 0,
            weekOffset: stage.week_offset || 0
          }))
        }));

        setTasks(formattedTasks);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Computed values
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
    const taskEnd = task.startMonth + task.duration - 1;
    const matchesDate = !(taskEnd < dateFilter.startMonth || task.startMonth > dateFilter.endMonth);
    return matchesSearch && matchesDate;
  });

  // Event handlers for sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (resizingSidebar) {
        const newWidth = Math.max(300, Math.min(800, e.clientX));
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setResizingSidebar(false);
    };

    if (resizingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingSidebar]);

  // Synchronized scrolling
  useEffect(() => {
    const handleSidebarScroll = (e) => {
      if (timelineRef.current && !timelineRef.current.isScrolling) {
        sidebarRef.current.isScrolling = true;
        timelineRef.current.scrollTop = e.target.scrollTop;
        setTimeout(() => {
          sidebarRef.current.isScrolling = false;
        }, 10);
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
        }, 10);
      }
    };

    const sidebarScrollElement = sidebarRef.current?.querySelector('.sidebar-scroll');
    const timelineScrollElement = timelineRef.current;

    if (sidebarScrollElement && timelineScrollElement) {
      sidebarScrollElement.addEventListener('scroll', handleSidebarScroll);
      timelineScrollElement.addEventListener('scroll', handleTimelineScroll);

      return () => {
        sidebarScrollElement.removeEventListener('scroll', handleSidebarScroll);
        timelineScrollElement.removeEventListener('scroll', handleTimelineScroll);
      };
    }
  }, [filteredTasks]);

  // Task click handler
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    // Deep copy task including stages array
    setEditingTask({
      ...task,
      stages: task.stages.map(s => ({ ...s }))
    });
  };

  // Expand/collapse handler
  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Template handler
  const handleTemplateChange = (newTemplateKey) => {
    setTemplateKey(newTemplateKey);
    localStorage.setItem('ganttTemplate', newTemplateKey);
  };

  // Add project handler
  const handleAddProject = async (projectName) => {
    try {
      setSavingTask(true);
      setError(null);

      const newProjectData = {
        name: projectName,
        start_month: 0,
        duration: 1,
        duration_weeks: 4,
        progress: 0,
        color: currentTemplate.colors.taskBarDefault,
        start_week_offset: 0,
        week_offset: 0
      };

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([newProjectData])
        .select();

      if (insertError) throw insertError;

      // Add the new project to local state
      if (data && data.length > 0) {
        const newProject = {
          id: data[0].id,
          name: data[0].name,
          startMonth: data[0].start_month,
          duration: data[0].duration,
          durationWeeks: data[0].duration_weeks,
          startWeekOffset: data[0].start_week_offset || 0,
          weekOffset: data[0].week_offset || 0,
          color: data[0].color || currentTemplate.colors.taskBarDefault,
          progress: data[0].progress,
          stages: []
        };
        setTasks([...tasks, newProject]);
      }
    } catch (err) {
      console.error('Error adding project:', err);
      setError(err.message || 'Failed to add project');
    } finally {
      setSavingTask(false);
    }
  };

  // Delete project handler
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    try {
      setSavingTask(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setTasks(tasks.filter(t => t.id !== projectId));
      setSelectedTask(null);
      setEditingTask(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err.message || 'Failed to delete project');
    } finally {
      setSavingTask(false);
    }
  };

  // Reorder projects handler
  const handleReorderProjects = async (draggedId, droppedOnId) => {
    if (draggedId === droppedOnId) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedId);
    const droppedIndex = tasks.findIndex(t => t.id === droppedOnId);

    if (draggedIndex === -1 || droppedIndex === -1) return;

    // Create new array with reordered tasks
    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(droppedIndex, 0, removed);

    // Update local state immediately for smooth UI
    setTasks(newTasks);

    // Update sort_order values and save to database
    try {
      setSavingTask(true);
      for (let i = 0; i < newTasks.length; i++) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ sort_order: i })
          .eq('id', newTasks[i].id);

        if (updateError) throw updateError;
      }
    } catch (err) {
      console.error('Error reordering projects:', err);
      setError(err.message || 'Failed to reorder projects');
      // Revert to original order on error
      setTasks(tasks);
    } finally {
      setSavingTask(false);
    }
  };

  // Drag handlers for task bars
  const handleBarDragStart = (e, task, edge) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent click from triggering modal
    setDragging({
      task: task,
      edge: edge, // 'start' or 'end'
      startX: e.clientX,
      originalTask: { ...task } // Save original for comparison
    });
  };

  // Auto-save dragged task to Supabase
  const saveDraggedTask = async (draggedTask) => {
    try {
      setSavingTask(true);

      // Use already-rounded values from drag calculation
      let finalStart = draggedTask.startMonth;
      let finalDurationWeeks = draggedTask.durationWeeks || draggedTask.duration * weeksPerMonth;
      let finalStartWeekOffset = draggedTask.startWeekOffset || 0;

      // Ensure valid values
      finalStart = Math.max(0, Math.min(11, finalStart));
      finalDurationWeeks = Math.max(1, Math.min(48, finalDurationWeeks));
      finalStartWeekOffset = Math.max(0, Math.min(3, Math.round(finalStartWeekOffset)));

      const { error: projectError } = await supabase
        .from('projects')
        .update({
          start_month: finalStart,
          duration_weeks: finalDurationWeeks,
          start_week_offset: finalStartWeekOffset,
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

  // Effect for dragging task bars
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        // Calculate pixels moved and snap to week boundaries (cellWidth = 30px per week)
        const deltaPixels = e.clientX - dragging.startX;
        const deltaWeeks = Math.round(deltaPixels / cellWidth);

        // IMPORTANT: Always calculate from originalTask, not dragging.task (which updates each move)
        const originalTask = dragging.originalTask;

        let updatedTask = { ...originalTask };

        if (dragging.edge === 'start') {
          // Dragging left edge: move start position by weeks, including fractional weeks
          const totalWeeksOffset = deltaPixels / cellWidth;
          const weeksRounded = Math.round(totalWeeksOffset);

          // Calculate new start position including week offset
          const currentStartWeekOffset = originalTask.startWeekOffset || 0;
          const newStartWeeks = (originalTask.startMonth * weeksPerMonth) + currentStartWeekOffset + weeksRounded;

          const newStartMonthInt = Math.floor(newStartWeeks / weeksPerMonth);
          const newStartMonth = Math.max(0, Math.min(11, newStartMonthInt));
          const newStartWeekOffsetInt = newStartWeeks % weeksPerMonth;

          // Keep duration exactly the same - we're not changing it
          const newDuration = originalTask.duration;

          updatedTask.startMonth = newStartMonth;
          updatedTask.duration = newDuration;
          updatedTask.startWeekOffset = Math.max(0, Math.min(3, newStartWeekOffsetInt));
          updatedTask.weekOffset = originalTask.weekOffset || 0;
        } else if (dragging.edge === 'end') {
          // Dragging right edge: adjust durationWeeks only (don't move start)
          const totalWeeksOffset = deltaPixels / cellWidth;
          const weeksRounded = Math.round(totalWeeksOffset);

          // Get current duration in weeks
          const currentDurationWeeks = originalTask.durationWeeks || originalTask.duration * weeksPerMonth;
          const newDurationWeeks = currentDurationWeeks + weeksRounded;

          // Maximum weeks from start to end of year
          const startWeekPosition = (originalTask.startMonth * weeksPerMonth) + (originalTask.startWeekOffset || 0);
          const maxWeeks = (12 * weeksPerMonth) - startWeekPosition;

          updatedTask.durationWeeks = Math.max(1, Math.min(newDurationWeeks, maxWeeks));
          updatedTask.startMonth = originalTask.startMonth; // Keep start fixed
          updatedTask.startWeekOffset = originalTask.startWeekOffset || 0;
        }

        // Store edge info for debugging
        updatedTask._dragEdge = dragging.edge;

        // Update tasks immediately for smooth feedback
        setTasks(prevTasks =>
          prevTasks.map(t => t.id === originalTask.id ? updatedTask : t)
        );

        // Update dragging state with the new task
        setDragging(prev => ({ ...prev, task: updatedTask }));
      }
    };

    const handleMouseUp = async () => {
      if (dragging) {
        // Check if task was actually moved
        const hasChanged =
          dragging.task.startMonth !== dragging.originalTask.startMonth ||
          (dragging.task.durationWeeks || dragging.task.duration * weeksPerMonth) !== (dragging.originalTask.durationWeeks || dragging.originalTask.duration * weeksPerMonth) ||
          (dragging.task.startWeekOffset || 0) !== (dragging.originalTask.startWeekOffset || 0);

        // Auto-save if changed
        if (hasChanged) {
          // Pass edge info for rounding logic
          const taskToSave = { ...dragging.task, edge: dragging.edge };
          await saveDraggedTask(taskToSave);
        }
      }
      setDragging(null);
    };

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, cellWidth, totalMonthsCount]);

  // Save task to Supabase
  const handleSaveTask = async () => {
    if (!editingTask) return;

    try {
      setSavingTask(true);
      setError(null);

      // Update project
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          name: editingTask.name,
          start_month: editingTask.startMonth,
          duration: editingTask.duration,
          duration_weeks: editingTask.durationWeeks || editingTask.duration * weeksPerMonth,
          start_week_offset: editingTask.startWeekOffset || 0,
          week_offset: editingTask.weekOffset || 0,
          progress: editingTask.progress,
          color: editingTask.color || '#3B82F6',
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id);

      if (projectError) throw projectError;

      // Separate new and existing stages
      // New stages have temporary IDs from Date.now()
      const newStages = editingTask.stages.filter(s => typeof s.id === 'number' && s.id > 10000000000);
      const existingStages = editingTask.stages.filter(s => typeof s.id === 'number' && s.id <= 10000000000);

      // Delete stages that were removed
      const { data: currentStages } = await supabase
        .from('stages')
        .select('id')
        .eq('project_id', editingTask.id);

      const stagesToDelete = currentStages.filter(
        cs => !existingStages.find(es => es.id === cs.id)
      );

      for (const stage of stagesToDelete) {
        const { error: deleteError } = await supabase
          .from('stages')
          .delete()
          .eq('id', stage.id);

        if (deleteError) throw deleteError;
      }

      // Insert new stages
      if (newStages.length > 0) {
        const { error: stageError } = await supabase
          .from('stages')
          .insert(
            newStages.map(s => ({
              project_id: editingTask.id,
              name: s.name,
              start_month: s.startMonth,
              duration: s.duration,
              duration_weeks: s.durationWeeks || s.duration * weeksPerMonth,
              start_week_offset: s.startWeekOffset || 0,
              week_offset: s.weekOffset || 0
            }))
          );

        if (stageError) throw stageError;
      }

      // Update existing stages with week offsets
      for (const stage of existingStages) {
        const { error: updateError } = await supabase
          .from('stages')
          .update({
            name: stage.name,
            start_month: stage.startMonth,
            duration: stage.duration,
            duration_weeks: stage.durationWeeks || stage.duration * weeksPerMonth,
            start_week_offset: stage.startWeekOffset || 0,
            week_offset: stage.weekOffset || 0
          })
          .eq('id', stage.id);

        if (updateError) throw updateError;
      }

      // Update local state with the saved task
      setTasks(tasks.map(task =>
        task.id === editingTask.id
          ? {
              ...editingTask,
              stages: existingStages.map(s => ({
                ...s,
                // Stages are unchanged, just filter out new ones temporarily
              }))
            }
          : task
      ));

      setSelectedTask(null);
      setEditingTask(null);
    } catch (err) {
      console.error('Error saving task:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSavingTask(false);
    }
  };

  // Screenshot function - uses print to PDF which captures full content
  const handleScreenshot = async () => {
    if (!chartContainerRef.current) return;

    try {
      const element = chartContainerRef.current;
      const width = element.scrollWidth;
      const height = element.scrollHeight;

      // Save original styles
      const originalStyle = element.getAttribute('style');

      // Temporarily set to show all content
      element.style.width = width + 'px';
      element.style.height = height + 'px';
      element.style.overflow = 'visible';
      element.style.position = 'relative';

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use html2canvas with increased timeout and proper settings
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#f9fafb',
        scale: 2, // Higher scale for better quality
        logging: false,
        windowWidth: width,
        windowHeight: height,
        onclone: (clonedDocument) => {
          // Modify the cloned document to show all content
          const clonedElement = clonedDocument.querySelector('[style*="overflow"]') || clonedDocument.body.firstChild;
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = height + 'px';
            clonedElement.style.width = width + 'px';
          }
        }
      });

      // Restore original style
      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (err) {
      console.error('Error taking screenshot:', err);
      setError('Failed to take screenshot');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Scrollable container with header and content */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Header */}
        {showHeader && (
        <div className={`bg-gradient-to-r ${currentTemplate.colors.headerGradient} shadow-lg p-3 flex-shrink-0`}>
        <div className="max-w-full mx-auto flex items-start justify-between">
          <div className="flex-1">
          {/* Error Banner */}
          {error && (
            <div className="mb-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-700 hover:text-red-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Loading Banner */}
          {loading && (
            <div className="mb-2 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
              <Loader className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>Se încarcă proiectele...</span>
            </div>
          )}

          {/* Header Row: Title + Search + Filters */}
          <div className="flex items-center gap-3">
            {/* Title */}
            <h1 className="text-xl font-bold text-white drop-shadow-lg whitespace-nowrap">🏗️ Diagrama Gantt 2026</h1>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
              <input
                type="text"
                placeholder="Căutare..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-transparent shadow-sm placeholder-gray-500 text-sm"
              />
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/20">
              <Calendar className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
              <span className="text-white/80 font-medium text-xs">De la:</span>
              <select
                value={dateFilter.startMonth}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, startMonth: parseInt(e.target.value) }));
                }}
                className="px-2 py-1 bg-white/90 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 shadow-sm text-xs"
              >
                {months.map((month, idx) => (
                  <option key={idx} value={idx}>{monthsShort[idx]}</option>
                ))}
              </select>
              <span className="text-white/80 font-medium text-xs">până la</span>
              <select
                value={dateFilter.endMonth}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, endMonth: parseInt(e.target.value) }));
                }}
                className="px-2 py-1 bg-white/90 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 shadow-sm text-xs"
              >
                {months.map((month, idx) => (
                  <option key={idx} value={idx}>{monthsShort[idx]}</option>
                ))}
              </select>
            </div>
          </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <div className="relative group">
              <button
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1"
                title="Change template"
              >
                <Palette className="h-4 w-4" />
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateChange(key)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      templateKey === key ? 'bg-gray-50 font-semibold text-blue-600' : 'text-gray-700'
                    } ${key === 'modern' ? 'rounded-t-lg' : ''} ${key === 'minimal' ? 'rounded-b-lg' : ''}`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Screenshot Button */}
            <button
              onClick={handleScreenshot}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1"
              title="Take screenshot"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
        )}

      {/* Show Header Button - only visible when header is hidden */}
      {!showHeader && (
        <button
          onClick={() => setShowHeader(true)}
          className="absolute top-0 left-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-br z-30"
        >
          ☰ Meniu
        </button>
      )}

      {/* Gantt Chart Container - scrollable with header */}
      <div className="flex flex-1 overflow-auto" ref={chartContainerRef}>
        {/* Task List Sidebar */}
        <div
          ref={sidebarRef}
          className="bg-white shadow-sm border-r border-gray-200 flex-shrink-0 relative flex flex-col"
          style={{ width: sidebarWidth }}
        >
          {/* Sidebar Header */}
          <div className="h-12 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
            <h3 className="font-semibold text-gray-800 text-sm">Nume Proiect</h3>
            <button
              onClick={() => {
                setShowAddProjectModal(true);
                setNewProjectName('');
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Add new project"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Task Rows */}
          <div className="overflow-y-auto sidebar-scroll flex-1">
            {!loading && filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm || dateFilter.startMonth !== 0 || dateFilter.endMonth !== 11
                  ? 'No projects match your filters'
                  : 'No projects available'}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id}>
                  {/* Main Task Row */}
                  <div
                    draggable
                    onDragStart={() => setDraggedProjectId(task.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverProjectId(task.id);
                    }}
                    onDragLeave={() => setDragOverProjectId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedProjectId && draggedProjectId !== task.id) {
                        handleReorderProjects(draggedProjectId, task.id);
                      }
                      setDraggedProjectId(null);
                      setDragOverProjectId(null);
                    }}
                    className={`group flex items-center px-3 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-move transition-all duration-200 hover:shadow-sm ${
                      dragOverProjectId === task.id ? 'bg-blue-100 border-blue-300' : ''
                    } ${draggedProjectId === task.id ? 'opacity-50' : ''}`}
                    onClick={() => handleTaskClick(task)}
                    style={{ height: rowHeight }}
                  >
                    {task.stages.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(task.id);
                        }}
                        className="mr-1 p-0 hover:bg-gray-200 rounded flex-shrink-0"
                      >
                        {expandedTasks[task.id] ?
                          <ChevronDown className="h-3 w-3" /> :
                          <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                    )}
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-800 break-words">{task.name}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(task.id);
                      }}
                      className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                      title="Delete project"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>

                  {/* Stage Rows */}
                  {expandedTasks[task.id] && task.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center pl-8 pr-3 border-b border-gray-50 bg-gray-25"
                      style={{ height: 24 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700 truncate">{stage.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full bg-gray-300 hover:bg-blue-500 cursor-col-resize"
            onMouseDown={() => setResizingSidebar(true)}
          />
        </div>

        {/* Timeline Section */}
        {!loading && (
          <div className="flex-1 bg-white overflow-auto" ref={timelineRef}>
            <div style={{ width: totalWeeks * cellWidth }}>
              {/* Timeline Headers */}
              <div className={`bg-white relative z-10 border-b ${currentTemplate.colors.gridLine}`} style={{ height: 48 }}>
                {/* Month Header Row - positioned absolutely to match grid lines */}
                <div className="relative" style={{ width: totalWeeks * cellWidth, height: 48 }}>
                  {months.map((month, monthIndex) => (
                    <div
                      key={`month-${monthIndex}`}
                      className={`absolute flex items-center justify-center font-bold text-gray-700 text-xs bg-gradient-to-b ${currentTemplate.colors.monthHeaderGradient} hover:${currentTemplate.colors.monthHeaderHover} transition-colors ${monthIndex < months.length - 1 ? `border-r-2 ${currentTemplate.colors.borderColor}` : ''}`}
                      style={{
                        left: monthIndex * cellWidth * weeksPerMonth + 2 + 'px',
                        width: cellWidth * weeksPerMonth + 'px',
                        height: 48 + 'px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div className="font-bold">{month}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Grid */}
              <div
                className="relative"
              >
                {/* Vertical Grid Lines - extend to include header height */}
                <div className="absolute pointer-events-none" style={{ top: '-48px', bottom: 0, left: 0, right: 0 }}>
                  {/* Week lines (thin) and Month separators (thick) */}
                  {Array.from({ length: totalWeeks + 1 }).map((_, weekIndex) => {
                    const isMonthStart = weekIndex % weeksPerMonth === 0;
                    // Skip the first line (weekIndex 0)
                    if (weekIndex === 0) return null;
                    return (
                      <div
                        key={`week-line-${weekIndex}`}
                        className={`absolute top-0 h-full ${
                          isMonthStart ? `border-r-2 ${currentTemplate.colors.borderColor}` : `border-r ${currentTemplate.colors.gridLineLight}`
                        }`}
                        style={{ left: weekIndex * cellWidth }}
                      />
                    );
                  })}
                </div>

                {/* Task Rows Container */}
                <div className="relative" style={{ minHeight: filteredTasks.length * rowHeight + filteredTasks.reduce((acc, task) => acc + (expandedTasks[task.id] ? task.stages.length * 40 : 0), 0) }}>
                  {/* Task Rows */}
                  {filteredTasks.map((task, taskIndex) => (
                    <div key={task.id}>
                      {/* Main Task Row */}
                      <div
                        className="border-b border-gray-200 relative"
                        style={{ height: rowHeight }}
                      >
                        {/* Colorful Task Bar */}
                        <div
                          className={`absolute ${currentTemplate.styles.borderRadius} ${currentTemplate.styles.shadow} hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 hover:z-20 border-2 border-gray-700`}
                          style={{
                            backgroundColor: task.color || currentTemplate.colors.taskBarDefault,
                            left: monthToWeekStart(task.startMonth) * cellWidth + (task.startWeekOffset || 0) * cellWidth + 4,
                            width: (task.durationWeeks || task.duration * weeksPerMonth) * cellWidth - 8,
                            height: 32,
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}
                        >
                          {/* Progress Overlay - Darker overlay */}
                          <div
                            className={`absolute left-0 top-0 h-full ${currentTemplate.styles.borderRadius}`}
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: 'rgba(0, 0, 0, 0.3)'
                            }}
                          />

                          {/* Progress Text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-medium text-[10px] drop-shadow-sm">
                              {task.progress}%
                            </span>
                          </div>

                          {/* Drag Handles */}
                          <div
                            className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white hover:bg-opacity-30 rounded-l-lg z-10"
                            onMouseDown={(e) => handleBarDragStart(e, task, 'start')}
                          />
                          <div
                            className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white hover:bg-opacity-30 rounded-r-lg z-10"
                            onMouseDown={(e) => handleBarDragStart(e, task, 'end')}
                          />
                        </div>
                      </div>

                      {/* Stage Rows */}
                      {expandedTasks[task.id] && task.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="border-b border-gray-100 relative bg-gray-25"
                          style={{ height: 24 }}
                        >
                          {/* Light Blue Stage Bar */}
                          <div
                            className={`absolute ${currentTemplate.styles.borderRadius} bg-gradient-to-r from-blue-300 to-blue-400 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105`}
                            style={{
                              left: monthToWeekStart(stage.startMonth) * cellWidth + (stage.startWeekOffset || 0) * cellWidth + 4,
                              width: (stage.durationWeeks || stage.duration * weeksPerMonth) * cellWidth - 8,
                              height: 16,
                              top: '50%',
                              transform: 'translateY(-50%)'
                            }}
                          >
                            {/* Stage Name */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-medium text-[9px] truncate px-2">
                                {stage.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Edit Modal */}
      {selectedTask && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Modifică Proiect</h2>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setEditingTask(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume Proiect
                </label>
                <input
                  type="text"
                  value={editingTask.name}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progres
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editingTask.progress}
                    onChange={(e) => setEditingTask({ ...editingTask, progress: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-bold text-gray-800">{editingTask.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Culoare
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editingTask.color || '#3B82F6'}
                    onChange={(e) => setEditingTask({ ...editingTask, color: e.target.value })}
                    className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{editingTask.color || '#3B82F6'}</span>
                </div>
              </div>

              {/* Stages Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">Etape</label>
                  <button
                    onClick={() => {
                      const newStage = {
                        id: Date.now(),
                        name: `Etapa Nouă ${editingTask.stages.length + 1}`,
                        startMonth: editingTask.startMonth,
                        duration: 1
                      };
                      setEditingTask({
                        ...editingTask,
                        stages: [...editingTask.stages, newStage]
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Adaugă Etapă
                  </button>
                </div>

                <div className="space-y-4">
                  {editingTask.stages.map((stage, index) => (
                    <div key={stage.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Stage {index + 1}</span>
                        <button
                          onClick={() => {
                            setEditingTask({
                              ...editingTask,
                              stages: editingTask.stages.filter(s => s.id !== stage.id)
                            });
                          }}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nume Etapă</label>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => {
                            setEditingTask({
                              ...editingTask,
                              stages: editingTask.stages.map(s =>
                                s.id === stage.id ? { ...s, name: e.target.value } : s
                              )
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm text-gray-600 mb-1">Luna de Inceput</label>
                          <select
                            value={stage.startMonth}
                            onChange={(e) => {
                              setEditingTask({
                                ...editingTask,
                                stages: editingTask.stages.map(s =>
                                  s.id === stage.id ? { ...s, startMonth: parseInt(e.target.value) } : s
                                )
                              });
                            }}
                            className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {monthsShort.map((month, idx) => (
                              <option key={idx} value={idx}>{month}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Durată (săptămâni)</label>
                          <input
                            type="number"
                            min="1"
                            max="48"
                            value={stage.durationWeeks || stage.duration * weeksPerMonth}
                            onChange={(e) => {
                              setEditingTask({
                                ...editingTask,
                                stages: editingTask.stages.map(s =>
                                  s.id === stage.id ? { ...s, durationWeeks: parseInt(e.target.value) || 1 } : s
                                )
                              });
                            }}
                            className="w-24 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Săptămâna de Inceput (0-3)</label>
                          <input
                            type="number"
                            min="0"
                            max="3"
                            value={stage.startWeekOffset || 0}
                            onChange={(e) => {
                              setEditingTask({
                                ...editingTask,
                                stages: editingTask.stages.map(s =>
                                  s.id === stage.id ? { ...s, startWeekOffset: parseInt(e.target.value) || 0 } : s
                                )
                              });
                            }}
                            className="w-24 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Săptămâna de Sfârșit (0-3)</label>
                          <input
                            type="number"
                            min="0"
                            max="3"
                            value={stage.weekOffset || 0}
                            onChange={(e) => {
                              setEditingTask({
                                ...editingTask,
                                stages: editingTask.stages.map(s =>
                                  s.id === stage.id ? { ...s, weekOffset: parseInt(e.target.value) || 0 } : s
                                )
                              });
                            }}
                            className="w-24 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveTask}
                  disabled={savingTask}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingTask ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    'Salvează Modificările'
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setEditingTask(null);
                  }}
                  disabled={savingTask}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anulează
                </button>
                <button
                  onClick={() => {
                    handleDeleteProject(editingTask.id);
                  }}
                  disabled={savingTask}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Delete project"
                >
                  <X className="h-4 w-4" />
                  Șterge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Adaugă Proiect Nou</h2>
                <button
                  onClick={() => {
                    setShowAddProjectModal(false);
                    setNewProjectName('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume Proiect
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      handleAddProject(newProjectName.trim());
                      setShowAddProjectModal(false);
                      setNewProjectName('');
                    }
                  }}
                  placeholder="Introduceți numele proiectului..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (newProjectName.trim()) {
                    handleAddProject(newProjectName.trim());
                    setShowAddProjectModal(false);
                    setNewProjectName('');
                  }
                }}
                disabled={savingTask || !newProjectName.trim()}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingTask ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Se adaugă...
                  </>
                ) : (
                  'Adaugă'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddProjectModal(false);
                  setNewProjectName('');
                }}
                disabled={savingTask}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
