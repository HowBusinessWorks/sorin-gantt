import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Search, Plus, X, Edit2, ChevronDown, ChevronRight, AlertCircle, Loader, Camera, MoreVertical } from 'lucide-react';
import { months, monthsShort, cellWidth, rowHeight, totalMonths, weeksPerMonth, totalWeeks } from './data.js';
import { getProgressColor, getTotalMonths, getMonthName, getTotalWeeks, monthToWeekStart, monthDurationToWeeks, getWeekOfMonth, darkenColor } from './utils.js';
import { supabase } from './supabaseClient.js';
import html2canvas from 'html2canvas';
import { templates, defaultTemplate } from './templates.js';

function App() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Default to false (show login screen) for fresh sessions
    const saved = localStorage.getItem('ganttAuth');
    return saved === 'true';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

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

  // Contract and Year selection
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loadingContracts, setLoadingContracts] = useState(!isAuthenticated ? false : true);

  // Add/Delete modals
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractName, setNewContractName] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYear, setNewYear] = useState(2025);
  const [savingContract, setSavingContract] = useState(false);
  const [savingYear, setSavingYear] = useState(false);

  // Delete confirmation modals
  const [showDeleteContractModal, setShowDeleteContractModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [deleteContractConfirmName, setDeleteContractConfirmName] = useState('');
  const [showDeleteYearModal, setShowDeleteYearModal] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);
  const [deleteYearConfirmYear, setDeleteYearConfirmYear] = useState('');

  // Edit contract modal
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [contractToEdit, setContractToEdit] = useState(null);
  const [editContractName, setEditContractName] = useState('');
  const [savingEditContract, setSavingEditContract] = useState(false);

  // Menu visibility
  const [openMenuId, setOpenMenuId] = useState(null);

  // Google Drive link modal
  const [showGoogleDriveLinkModal, setShowGoogleDriveLinkModal] = useState(false);
  const [googleDriveLink, setGoogleDriveLink] = useState('');

  // Comments
  const [comments, setComments] = useState([]);
  const [showAddCommentModal, setShowAddCommentModal] = useState(false);
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'comments'

  const currentTemplate = templates[templateKey] || templates[defaultTemplate];

  // Refs for synchronized scrolling
  const sidebarRef = useRef(null);
  const timelineRef = useRef(null);
  const chartContainerRef = useRef(null);
  const isHeaderChangeRef = useRef(false);

  const totalMonthsCount = getTotalMonths();

  // Fetch contracts on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchContracts = async () => {
      try {
        setLoadingContracts(true);
        console.log('Fetching contracts...');
        const response = await supabase
          .from('contracts')
          .select('*');

        console.log('Full response:', response);
        const { data: contractsData, error: contractError } = response;

        console.log('Contracts response:', { contractsData, contractError });

        if (contractError) {
          console.error('Query error:', contractError);
          throw contractError;
        }

        console.log('Setting contracts:', contractsData);
        setContracts(contractsData || []);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        setError(`Error fetching contracts: ${err.message || JSON.stringify(err)}`);
      } finally {
        setLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [isAuthenticated]);

  // Fetch years when contract is selected
  useEffect(() => {
    const fetchYears = async () => {
      if (!selectedContract) {
        setYears([]);
        return;
      }

      try {
        const { data: yearsData, error: yearsError } = await supabase
          .from('years')
          .select('*')
          .eq('contract_id', selectedContract.id)
          .order('year', { ascending: true });

        if (yearsError) throw yearsError;
        setYears(yearsData || []);

        // Auto-select the first year only if switching contracts from the header
        if (isHeaderChangeRef.current && yearsData && yearsData.length > 0) {
          setSelectedYear(yearsData[0]);
          isHeaderChangeRef.current = false;
        } else {
          setSelectedYear(null);
        }
      } catch (err) {
        console.error('Error fetching years:', err);
      }
    };

    fetchYears();
  }, [selectedContract]);

  // Fetch projects from Supabase when contract and year are selected
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedContract || !selectedYear) {
        setTasks([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select(`
            *,
            stages(*)
          `)
          .eq('contract_id', selectedContract.id)
          .eq('year_id', selectedYear.id)
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
          show_progress: project.show_progress !== false,
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
  }, [selectedContract, selectedYear]);

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
  const handleTaskClick = async (task) => {
    setSelectedTask(task);
    setActiveTab('settings');

    // Fetch fresh project data from database to get latest google_drive_link and comments
    try {
      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', task.id)
        .single();

      if (error) throw error;

      // Fetch comments for this project
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', task.id)
        .order('created_at', { ascending: false });

      if (!commentsError) {
        setComments(commentsData || []);
      }

      // Deep copy task including stages array
      const editTask = {
        ...task,
        google_drive_link: projectData.google_drive_link,
        show_progress: projectData.show_progress !== false,
        stages: task.stages.map(s => ({ ...s }))
      };

      setEditingTask(editTask);
    } catch (err) {
      console.error('Error fetching project details:', err);
      // Fallback to local task if fetch fails
      setEditingTask({
        ...task,
        stages: task.stages.map(s => ({ ...s }))
      });
      setComments([]);
    }
  };

  // Expand/collapse handler
  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Contract handlers
  const handleAddContract = async () => {
    if (!newContractName.trim()) return;

    try {
      setSavingContract(true);
      const { data, error } = await supabase
        .from('contracts')
        .insert([{ name: newContractName }])
        .select();

      if (error) throw error;

      setContracts([...contracts, data[0]]);
      setNewContractName('');
      setShowAddContractModal(false);
    } catch (err) {
      console.error('Error adding contract:', err);
      setError('Eroare la adăugarea contractului');
    } finally {
      setSavingContract(false);
    }
  };

  const handleDeleteContractClick = (contract) => {
    setContractToDelete(contract);
    setDeleteContractConfirmName('');
    setShowDeleteContractModal(true);
  };

  const handleConfirmDeleteContract = async () => {
    if (deleteContractConfirmName !== 'delete') {
      return;
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete.id);

      if (error) throw error;

      setContracts(contracts.filter(c => c.id !== contractToDelete.id));
      if (selectedContract?.id === contractToDelete.id) {
        setSelectedContract(null);
        setSelectedYear(null);
      }
      setShowDeleteContractModal(false);
      setContractToDelete(null);
      setDeleteContractConfirmName('');
    } catch (err) {
      console.error('Error deleting contract:', err);
      setError('Eroare la ștergerea contractului');
    }
  };

  const handleEditContractClick = (contract) => {
    setContractToEdit(contract);
    setEditContractName(contract.name);
    setShowEditContractModal(true);
    setOpenMenuId(null);
  };

  const handleSaveEditContract = async () => {
    if (!editContractName.trim()) {
      setError('Numele contractului nu poate fi gol');
      return;
    }

    try {
      setSavingEditContract(true);
      const { error } = await supabase
        .from('contracts')
        .update({ name: editContractName })
        .eq('id', contractToEdit.id);

      if (error) throw error;

      const updatedContracts = contracts.map(c =>
        c.id === contractToEdit.id ? { ...c, name: editContractName } : c
      );
      setContracts(updatedContracts);

      if (selectedContract?.id === contractToEdit.id) {
        setSelectedContract({ ...selectedContract, name: editContractName });
      }

      setShowEditContractModal(false);
      setContractToEdit(null);
      setEditContractName('');
    } catch (err) {
      console.error('Error updating contract:', err);
      setError('Eroare la actualizarea contractului');
    } finally {
      setSavingEditContract(false);
    }
  };

  // Year handlers
  const handleAddYear = async () => {
    if (!selectedContract) return;

    try {
      setSavingYear(true);
      const { data, error } = await supabase
        .from('years')
        .insert([{ contract_id: selectedContract.id, year: newYear }])
        .select();

      if (error) throw error;

      setYears([...years, data[0]]);
      setShowAddYearModal(false);
    } catch (err) {
      console.error('Error adding year:', err);
      setError('Eroare la adăugarea anului');
    } finally {
      setSavingYear(false);
    }
  };

  const handleDeleteYearClick = (year) => {
    setYearToDelete(year);
    setDeleteYearConfirmYear('');
    setShowDeleteYearModal(true);
  };

  const handleConfirmDeleteYear = async () => {
    if (deleteYearConfirmYear !== 'delete') {
      return;
    }

    try {
      const { error } = await supabase
        .from('years')
        .delete()
        .eq('id', yearToDelete.id);

      if (error) throw error;

      setYears(years.filter(y => y.id !== yearToDelete.id));
      if (selectedYear?.id === yearToDelete.id) {
        setSelectedYear(null);
      }
      setShowDeleteYearModal(false);
      setYearToDelete(null);
      setDeleteYearConfirmYear('');
    } catch (err) {
      console.error('Error deleting year:', err);
      setError('Eroare la ștergerea anului');
    }
  };

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(null);

    if (password === 'lucrari123') {
      setIsAuthenticated(true);
      localStorage.setItem('ganttAuth', 'true');
      setPassword('');
    } else {
      setLoginError('Password incorrect');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ganttAuth');
    setPassword('');
  };

  // Add project handler
  const handleAddProject = async (projectName) => {
    try {
      setSavingTask(true);
      setError(null);

      // Check if contract and year are selected
      if (!selectedContract || !selectedYear) {
        setError('Please select a contract and year first');
        setSavingTask(false);
        return;
      }

      const newProjectData = {
        name: projectName,
        contract_id: selectedContract.id,
        year_id: selectedYear.id,
        start_month: 0,
        duration: 1,
        duration_weeks: 4,
        progress: 0,
        show_progress: true,
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
          show_progress: data[0].show_progress !== false,
          stages: [],
          contract_id: data[0].contract_id,
          year_id: data[0].year_id
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

  // Add comment handler
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!editingTask || !commentAuthorName.trim() || !commentText.trim()) return;

    try {
      setSavingComment(true);
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            project_id: editingTask.id,
            author_name: commentAuthorName.trim(),
            content: commentText.trim()
          }
        ])
        .select();

      if (error) throw error;

      // Add the new comment to local state
      if (data && data.length > 0) {
        setComments([data[0], ...comments]);
      }

      // Clear form
      setCommentAuthorName('');
      setCommentText('');
      setShowAddCommentModal(false);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi acest comentariu?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Remove from local state
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

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
          show_progress: editingTask.show_progress !== false,
          color: editingTask.color || '#3B82F6',
          google_drive_link: editingTask.google_drive_link || null,
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

      // Get the actual dimensions needed for full content
      const sidebarElement = sidebarRef.current;
      const timelineElement = timelineRef.current;

      // Calculate dimensions accounting for sidebar and timeline
      const sidebarWidth = sidebarElement ? sidebarElement.scrollWidth : 500;
      const timelineWidth = timelineElement ? timelineElement.scrollWidth : element.scrollWidth - sidebarWidth;
      const totalWidth = sidebarWidth + timelineWidth;
      const height = Math.max(
        element.scrollHeight,
        sidebarElement?.scrollHeight || 0,
        timelineElement?.scrollHeight || 0
      );

      // Save original styles
      const originalStyle = element.getAttribute('style');
      const originalSidebarStyle = sidebarElement?.getAttribute('style');
      const originalTimelineStyle = timelineElement?.getAttribute('style');

      // Temporarily set to show all content without overflow
      element.style.width = totalWidth + 'px';
      element.style.height = height + 'px';
      element.style.overflow = 'visible';
      element.style.position = 'relative';
      element.style.display = 'flex';

      if (sidebarElement) {
        sidebarElement.style.overflow = 'visible';
        sidebarElement.style.width = sidebarWidth + 'px';
        sidebarElement.style.minWidth = sidebarWidth + 'px';

        // Remove truncate class from all project names in sidebar
        const truncateElements = sidebarElement.querySelectorAll('.truncate');
        truncateElements.forEach(el => {
          el.style.whiteSpace = 'normal';
          el.style.wordBreak = 'break-word';
          el.classList.remove('truncate');
        });
      }

      if (timelineElement) {
        timelineElement.style.overflow = 'visible';
        timelineElement.style.width = timelineWidth + 'px';
      }

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use html2canvas with increased timeout and proper settings
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#f9fafb',
        scale: 2, // Higher scale for better quality
        logging: false,
        windowWidth: totalWidth,
        windowHeight: height
      });

      // Restore original styles
      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }

      if (sidebarElement) {
        if (originalSidebarStyle) {
          sidebarElement.setAttribute('style', originalSidebarStyle);
        } else {
          sidebarElement.removeAttribute('style');
        }
      }

      if (timelineElement) {
        if (originalTimelineStyle) {
          timelineElement.setAttribute('style', originalTimelineStyle);
        } else {
          timelineElement.removeAttribute('style');
        }
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Gantt Chart</h1>
          <p className="text-gray-600 text-center mb-6">Diagrama de Gantt pentru Lucrări</p>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduceți parola"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show contract selection screen if no contract or year is selected
  if (!selectedContract || !selectedYear) {
    return (
      <>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className={`bg-gradient-to-r ${currentTemplate.colors.headerGradient} shadow-lg p-6 flex-shrink-0`}>
          <h1 className="text-3xl font-bold text-white">Gantt Chart - Selectare Contract și An</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {loadingContracts ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center text-gray-500 h-64 flex items-center justify-center flex-col gap-4">
                <p>Nu sunt contracte disponibile</p>
                <button
                  onClick={() => {
                    localStorage.removeItem('ganttAuth');
                    setIsAuthenticated(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Selectează Contract</h2>
                  <button
                    onClick={() => setShowAddContractModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adaugă Contract
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contracts.map(contract => (
                    <div
                      key={contract.id}
                      onClick={() => {
                        setSelectedContract(contract);
                        setSelectedYear(null);
                      }}
                      className="group relative p-6 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200"
                    >
                      <h3 className="text-lg font-bold text-gray-800">{contract.name}</h3>
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === contract.id ? null : contract.id);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                          title="Menu"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>

                        {openMenuId === contract.id && (
                          <div
                            className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContractClick(contract);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 flex items-center gap-2 border-b border-gray-200"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editează
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContractClick(contract);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Șterge
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedContract && (
                  <div className="mt-12 pt-8 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Selectează An pentru {selectedContract.name}</h2>
                      <button
                        onClick={() => setShowAddYearModal(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adaugă An
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {years.map(year => (
                        <div
                          key={year.id}
                          onClick={() => setSelectedYear(year)}
                          className="group relative p-6 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:shadow-lg hover:border-green-500 transition-all duration-200"
                        >
                          <h3 className="text-xl font-bold text-gray-800">Anul {year.year}</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteYearClick(year);
                            }}
                            className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                            title="Delete year"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Contract Modal */}
      {showAddContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Adaugă Contract Nou</h2>
              <button
                onClick={() => setShowAddContractModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Nume contract"
              value={newContractName}
              onChange={(e) => setNewContractName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddContract()}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddContractModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleAddContract}
                disabled={!newContractName.trim() || savingContract}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingContract && <Loader className="h-4 w-4 animate-spin" />}
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Adaugă An Nou</h2>
              <button
                onClick={() => setShowAddYearModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">An</label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddYear()}
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddYearModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleAddYear}
                disabled={savingYear}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingYear && <Loader className="h-4 w-4 animate-spin" />}
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {showEditContractModal && contractToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Editează Contract</h2>
              <button
                onClick={() => {
                  setShowEditContractModal(false);
                  setContractToEdit(null);
                  setEditContractName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Nume contract"
              value={editContractName}
              onChange={(e) => setEditContractName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveEditContract()}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditContractModal(false);
                  setContractToEdit(null);
                  setEditContractName('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveEditContract}
                disabled={!editContractName.trim() || savingEditContract}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingEditContract && <Loader className="h-4 w-4 animate-spin" />}
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contract Modal */}
      {showDeleteContractModal && contractToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600">Ștergere Contract</h2>
              <button
                onClick={() => {
                  setShowDeleteContractModal(false);
                  setContractToDelete(null);
                  setDeleteContractConfirmName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                Sunteți sigur că doriți să ștergeți contractul <strong>{contractToDelete.name}</strong>?
                <br /><br />
                <span className="text-red-600 font-semibold">ATENȚIE: Aceasta va șterge toți anii și proiectele asociate. Această acțiune nu poate fi anulată.</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">Pentru a confirma, tastați <strong>delete</strong>:</p>
              <input
                type="text"
                placeholder="delete"
                value={deleteContractConfirmName}
                onChange={(e) => setDeleteContractConfirmName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && deleteContractConfirmName === 'delete' && handleConfirmDeleteContract()}
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteContractModal(false);
                  setContractToDelete(null);
                  setDeleteContractConfirmName('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmDeleteContract}
                disabled={deleteContractConfirmName !== 'delete'}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Șterge Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Year Modal */}
      {showDeleteYearModal && yearToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600">Ștergere An</h2>
              <button
                onClick={() => {
                  setShowDeleteYearModal(false);
                  setYearToDelete(null);
                  setDeleteYearConfirmYear('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                Sunteți sigur că doriți să ștergeți anul <strong>{yearToDelete.year}</strong>?
                <br /><br />
                <span className="text-red-600 font-semibold">ATENȚIE: Aceasta va șterge toate proiectele din acest an. Această acțiune nu poate fi anulată.</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">Pentru a confirma, tastați <strong>delete</strong>:</p>
              <input
                type="text"
                placeholder="delete"
                value={deleteYearConfirmYear}
                onChange={(e) => setDeleteYearConfirmYear(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && deleteYearConfirmYear === 'delete' && handleConfirmDeleteYear()}
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteYearModal(false);
                  setYearToDelete(null);
                  setDeleteYearConfirmYear('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmDeleteYear}
                disabled={deleteYearConfirmYear !== 'delete'}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Șterge An
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

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
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedContract(null);
                setSelectedYear(null);
              }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors"
            >
              ← Înapoi
            </button>

            {/* Contract and Year Selectors */}
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <select
                value={selectedContract?.id || ''}
                onChange={(e) => {
                  const contract = contracts.find(c => c.id === parseInt(e.target.value));
                  isHeaderChangeRef.current = true;
                  setSelectedContract(contract);
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 w-40 truncate"
                title={selectedContract?.name}
              >
                <option value="">Contract...</option>
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.name}
                  </option>
                ))}
              </select>

              <span className="text-white/40">•</span>

              <select
                value={selectedYear?.id || ''}
                onChange={(e) => {
                  const year = years.find(y => y.id === parseInt(e.target.value));
                  setSelectedYear(year);
                }}
                disabled={!selectedContract}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed w-28"
              >
                <option value="">Year...</option>
                {years.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>

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
            {/* Screenshot Button */}
            <button
              onClick={handleScreenshot}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1"
              title="Take screenshot"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors flex-shrink-0"
              title="Logout"
            >
              Logout
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
          <div className="overflow-y-auto sidebar-scroll flex-1 px-0">
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
                    className={`group flex items-center px-3 border rounded hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-move transition-all duration-200 hover:shadow-sm ${
                      dragOverProjectId === task.id ? 'bg-blue-100' : ''
                    } ${draggedProjectId === task.id ? 'opacity-50' : ''}`}
                    onClick={() => handleTaskClick(task)}
                    style={{
                      height: rowHeight,
                      borderColor: task.color || currentTemplate.colors.taskBarDefault,
                      borderWidth: '1.5px'
                    }}
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
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">{task.name}</div>
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
              <div className={`sticky top-0 bg-white relative z-10 border-b ${currentTemplate.colors.gridLine}`} style={{ height: 48 }}>
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
                        className="border-b border-gray-200 relative flex items-center"
                        style={{ height: rowHeight, paddingTop: '8px', paddingBottom: '8px' }}
                      >
                        {/* Colorful Task Bar - Only show if progress is enabled */}
                        {task.show_progress !== false && (
                        <div
                          className={`absolute ${currentTemplate.styles.borderRadius} ${currentTemplate.styles.shadow} hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 hover:z-20`}
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
                          {task.show_progress !== false && (
                            <>
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
                            </>
                          )}

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
                        )}
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
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
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

              {/* Tabs */}
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Setări
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Comentarii ({comments.length})
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Settings Tab */}
              {activeTab === 'settings' && (
              <>
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

              {/* Google Drive Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Drive Link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {editingTask.google_drive_link ? (
                      <div className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <a
                          href={editingTask.google_drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate"
                        >
                          Deschide Link
                        </a>
                      </div>
                    ) : (
                      <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                        Niciun link adăugat
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setGoogleDriveLink(editingTask.google_drive_link || '');
                      setShowGoogleDriveLinkModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editează
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Progres
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editingTask.progress}
                      onChange={(e) => setEditingTask({ ...editingTask, progress: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!editingTask.show_progress}
                    />
                    <div className="text-center min-w-12">
                      <span className="text-lg font-bold text-gray-800">{editingTask.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <input
                      type="checkbox"
                      id="show-progress"
                      checked={editingTask.show_progress !== false}
                      onChange={(e) => setEditingTask({ ...editingTask, show_progress: e.target.checked })}
                      className="h-4 w-4 text-blue-500 rounded cursor-pointer"
                    />
                    <label htmlFor="show-progress" className="text-sm text-gray-700 cursor-pointer">
                      Afișează bara de progres pe calendar
                    </label>
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
              </>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
              <div className="space-y-4 flex flex-col flex-1">
                {/* Comments List */}
                <div className="flex-1 overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nu există comentarii</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{comment.author_name}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(comment.created_at).toLocaleString('ro-RO')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Șterge comentariu"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Comment Button */}
                <div className="pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setShowAddCommentModal(true)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Adaugă comentariu"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              )}

              {/* Action Buttons - Only on Settings Tab */}
              {activeTab === 'settings' && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Link Modal */}
      {showGoogleDriveLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Google Drive Link</h2>
              <button
                onClick={() => {
                  setShowGoogleDriveLinkModal(false);
                  setGoogleDriveLink('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lipește linkul Google Drive
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowGoogleDriveLinkModal(false);
                  setGoogleDriveLink('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={async () => {
                  try {
                    // Save directly to database
                    const { error } = await supabase
                      .from('projects')
                      .update({ google_drive_link: googleDriveLink || null })
                      .eq('id', editingTask.id);

                    if (error) throw error;

                    // Update local state
                    const updatedTask = { ...editingTask, google_drive_link: googleDriveLink || null };
                    setEditingTask(updatedTask);
                    setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));

                    setShowGoogleDriveLinkModal(false);
                    setGoogleDriveLink('');
                  } catch (err) {
                    console.error('Error saving Google Drive link:', err);
                    setError('Failed to save Google Drive link');
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Comment Modal */}
      {showAddCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Adaugă Comentariu</h2>
              <button
                onClick={() => {
                  setShowAddCommentModal(false);
                  setCommentAuthorName('');
                  setCommentText('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume
                </label>
                <input
                  type="text"
                  value={commentAuthorName}
                  onChange={(e) => setCommentAuthorName(e.target.value)}
                  placeholder="Introduceti numele"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentariu
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Introduceti comentariul"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCommentModal(false);
                    setCommentAuthorName('');
                    setCommentText('');
                  }}
                  disabled={savingComment}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingComment || !commentAuthorName.trim() || !commentText.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingComment ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    'Salvează'
                  )}
                </button>
              </div>
            </form>
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
