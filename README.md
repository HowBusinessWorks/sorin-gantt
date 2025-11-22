# 🏗️ Construction Gantt Chart Dashboard 2026

A vibrant, interactive monthly-based Gantt chart dashboard for managing 26 construction projects throughout 2026.

## Features

- **Monthly Timeline**: Clean 12-month view with beautiful gradient headers
- **Synchronized Scrolling**: Sidebar and timeline scroll together for perfect alignment
- **Colorful Progress Visualization**: Task bars change color based on progress (gray→yellow→blue→green)
- **Drag to Resize**: Drag task bar edges to adjust start months and durations  
- **Resizable Sidebar**: Adjustable project list (300-800px width)
- **Advanced Filtering**: Real-time search and month range filtering
- **Project Management**: Comprehensive edit modal with stage management
- **Expandable Stages**: Light blue stage bars that can be expanded/collapsed
- **Modern UI**: Gradient headers, hover effects, and smooth animations

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Usage

- **Search Projects**: Use the search bar in the header to filter by project name
- **Filter by Month**: Set start and end months to view projects in specific timeframes
- **Edit Projects**: Click on any task row or task bar to open the edit modal
- **Drag to Resize**: Hover over task bar edges and drag to adjust monthly timelines
- **Expand Stages**: Click the chevron icons to expand projects with stages
- **Resize Sidebar**: Drag the right edge of the sidebar to adjust width
- **Synchronized Scrolling**: Scroll up/down in either sidebar or timeline - they move together!

## Technology Stack

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first styling with gradients and animations
- **Lucide React** - Beautiful, consistent icons
- **Vite** - Fast development and build tooling

## Project Structure

```
src/
├── App.jsx          # Main dashboard component
├── data.js          # Initial project data and constants
├── utils.js         # Helper functions for dates and colors
├── main.jsx         # React entry point
└── index.css        # Tailwind imports
```

## Progress Colors

- **Gray (0%)** - Not started
- **Yellow (1-49%)** - In progress (early)
- **Blue (50-99%)** - In progress (advanced)
- **Green (100%)** - Completed

## Responsive Design

The dashboard is optimized for desktop viewing with:
- Minimum sidebar width: 300px
- Maximum sidebar width: 800px
- Monthly timeline view (12 months x 120px each)
- Synchronized scrolling between sidebar and timeline
- Sticky headers for easy navigation

## Monthly View Benefits

- **Cleaner Interface**: Focus on monthly planning instead of daily micromanagement
- **Better Overview**: See the entire year at once with clear monthly divisions
- **Synchronized Navigation**: Scroll through projects with perfect timeline alignment
- **Simplified Editing**: Work with months and durations in monthly increments

Enjoy managing your construction projects! 🚧