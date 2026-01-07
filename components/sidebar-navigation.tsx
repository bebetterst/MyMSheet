"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Database, BarChart2, FileText, PanelLeftClose, Home, GanttChart } from "lucide-react"

interface SidebarItemProps {
  icon: React.ReactNode
  children: React.ReactNode
  isActive?: boolean
  badge?: React.ReactNode
  onClick: () => void
}

export function SidebarItem({ icon, children, isActive, badge, onClick }: SidebarItemProps) {
  return (
      <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log("SidebarItem clicked:", children)
            onClick()
          }}
          className={cn(
              "flex items-center p-2 rounded-md hover:bg-gray-100 text-sm w-full text-left transition-colors duration-200 cursor-pointer select-none",
              isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700",
          )}
          role="button"
          tabIndex={0}
      >
        <span className={cn("mr-2", isActive ? "text-blue-600" : "text-gray-500")}>{icon}</span>
        <span>{children}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
  )
}

export function SidebarNavigation({
                                    onNavigate,
                                    activeView,
                                    onToggleSidebar,
                                  }: { 
                                    onNavigate: (view: string) => void; 
                                    activeView: string;
                                    onToggleSidebar?: () => void;
                                  }) {
  return (
      <div className="p-4 flex flex-col h-full">
        <div className="mb-6 cursor-pointer group" onClick={() => onNavigate("welcome")}>
          <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">pxcharts 多维表格开源版</h2>
          <p className="text-xs text-gray-500">pxcharts多维表格引擎 v1.0</p>
        </div>

        <div className="space-y-1 flex-1">
          <SidebarItem
              icon={<Home className="h-4 w-4" />}
              isActive={activeView === "welcome"}
              onClick={() => onNavigate("welcome")}
          >
            欢迎页
          </SidebarItem>
          <SidebarItem
              icon={<Database className="h-4 w-4" />}
              isActive={activeView === "tasks"}
              onClick={() => onNavigate("tasks")}
          >
            任务管理
          </SidebarItem>
          <SidebarItem
              icon={<GanttChart className="h-4 w-4" />}
              isActive={activeView === "gantt"}
              onClick={() => onNavigate("gantt")}
          >
            甘特图视图
          </SidebarItem>
          <SidebarItem
              icon={<BarChart2 className="h-4 w-4" />}
              isActive={activeView === "statistics"}
              onClick={() => onNavigate("statistics")}
          >
            任务统计看板
          </SidebarItem>
          <SidebarItem
              icon={<FileText className="h-4 w-4" />}
              isActive={activeView === "documentation"}
              onClick={() => onNavigate("documentation")}
          >
            使用说明文档
          </SidebarItem>
        </div>

        {/* 底部收起按钮 */}
        <div className="pt-4 mt-auto border-t border-gray-200">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex items-center p-2 rounded-md hover:bg-gray-100 text-sm w-full text-left text-gray-700 transition-colors duration-200"
          >
            <PanelLeftClose className="h-4 w-4 mr-2 text-gray-500" />
            <span>收起菜单</span>
          </button>
        </div>
      </div>
  )
}
