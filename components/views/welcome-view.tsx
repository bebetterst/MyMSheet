"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, BarChart3, Clock, ArrowRight, LayoutGrid } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"

export function WelcomeView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { data } = useTaskStore()
  const taskCount = data.priorityGroups.reduce((acc, group) => acc + group.tasks.length, 0)

  // Mock recent files data
  const recentFiles = [
    { id: 1, name: "2024年度财务报告", date: "2024-01-04 14:30", type: "财务" },
    { id: 2, name: "Q1 产品研发计划", date: "2024-01-03 09:15", type: "研发" },
    { id: 3, name: "市场营销活动清单", date: "2023-12-29 16:45", type: "市场" },
  ]

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">欢迎回来</h1>
          <p className="text-gray-500">
            今天是 {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}。
            您当前共有 <span className="font-bold text-blue-600">{taskCount}</span> 个任务正在进行中。
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate("tasks")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">任务管理</CardTitle>
              <LayoutGrid className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">进入工作台</div>
              <p className="text-xs text-gray-500 mt-1">查看并管理所有任务进度</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate("statistics")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">数据分析</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">查看报表</div>
              <p className="text-xs text-gray-500 mt-1">多维度分析项目数据</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate("documentation")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">使用文档</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">帮助中心</div>
              <p className="text-xs text-gray-500 mt-1">了解如何使用高级功能</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Files Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">最近打开</h2>
            <Button variant="ghost" className="text-sm text-blue-600 hover:text-blue-700">
              查看全部 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recentFiles.map((file) => (
              <Card key={file.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {file.name}
                      </h3>
                      <p className="text-sm text-gray-500">{file.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {file.date}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
