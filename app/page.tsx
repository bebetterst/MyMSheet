// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import TaskManagementTable from '@/components/task-management-table';
import { SidebarNavigation } from '@/components/sidebar-navigation';
import { StatisticsView } from '@/components/views/statistics-view';
import { DocumentationView } from '@/components/views/documentation-view';
import { AssignmentView } from '@/components/views/assignment-view';
import { DeploymentView } from '@/components/views/deployment-view';
import { GanttView } from '@/components/views/gantt-view';
import { useTaskStore } from '@/lib/task-store';

import { WelcomeView } from '@/components/views/welcome-view';

export default function Home() {
  const [currentView, setCurrentView] = useState('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fetchData } = useTaskStore();

  useEffect(() => {
    fetchData();
  }, []);

  const handleNavigate = (view: string) => {
    console.log('Navigating to:', view);
    setCurrentView(view);
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex overflow-hidden">
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0 relative z-50 h-full overflow-y-auto">
          <SidebarNavigation
            onNavigate={handleNavigate}
            activeView={currentView}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      )}
      <div className="flex-1 bg-gray-50 relative z-0 h-full overflow-hidden">
        {currentView === 'welcome' && <WelcomeView onNavigate={handleNavigate} />}
        {currentView === 'tasks' && (
          <TaskManagementTable sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        )}
        {currentView === 'gantt' && (
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">甘特图视图</h2>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-white rounded-md border shadow-sm"
                >
                  打开侧边栏
                </button>
              )}
            </div>
            <GanttView />
          </div>
        )}
        {currentView === 'statistics' && <StatisticsView />}
        {currentView === 'documentation' && <DocumentationView />}
        {currentView === 'assignment' && <AssignmentView />}
        {currentView === 'deployment' && <DeploymentView />}
      </div>
    </div>
  );
}
