const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate random color
function getRandomColor() {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#D946EF', // fuchsia
    '#0EA5E9', // sky
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function resetProjects() {
  try {
    // Fetch all projects
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .order('id', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`Found ${projects.length} projects to reset`);

    // Update each project
    for (const project of projects) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          start_month: 0,
          duration: 1,
          progress: 0,
          start_week_offset: 0,
          week_offset: 0,
          color: getRandomColor(),
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (updateError) throw updateError;
      console.log(`✓ Reset project ${project.id}`);
    }

    console.log('✓ All projects reset successfully!');
  } catch (err) {
    console.error('Error resetting projects:', err);
    process.exit(1);
  }
}

resetProjects();
