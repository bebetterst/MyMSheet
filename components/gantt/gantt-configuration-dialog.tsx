"use client"

import { useState, useMemo } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface GanttConfigurationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GanttConfigurationDialog({ open, onOpenChange }: GanttConfigurationDialogProps) {
  const { data, visibleFields, ganttConfig, updateGanttFieldMapping } = useTaskStore()
  
  // 获取所有可用字段（包括系统字段和自定义字段）
  // 优先使用 data.fields 中的系统字段定义（类型准确），并补充 visibleFields 中的自定义字段
  const allFields = useMemo(() => {
    const systemFields = data.fields || []
    const systemFieldIds = new Set(systemFields.map(f => f.id))
    const customFields = (visibleFields || []).filter(f => !systemFieldIds.has(f.id))
    return [...systemFields, ...customFields]
  }, [data.fields, visibleFields])
  
  // 临时状态，用于在保存前存储修改
  const [mapping, setMapping] = useState(ganttConfig.fieldMapping)

  const handleSave = () => {
    updateGanttFieldMapping(mapping)
    onOpenChange(false)
  }

  const handleChange = (key: keyof typeof mapping, value: string) => {
    setMapping(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            甘特图配置
          </DialogTitle>
          <DialogDescription className="sr-only">
            配置甘特图的字段映射、显示选项和其他设置。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 必填字段 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-xs">📅</span>
              必填字段
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>任务标题字段 *</Label>
                <Select value={mapping.title} onValueChange={(v) => handleChange("title", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFields.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">显示在甘特图中的任务名称</p>
              </div>

              <div className="space-y-2">
                <Label>开始日期字段 *</Label>
                <Select value={mapping.startDate} onValueChange={(v) => handleChange("startDate", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFields.filter(f => f.type === "Date" || f.id === "startDate" || f.id === "created_at").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">用于确定任务开始时间</p>
              </div>

              <div className="space-y-2">
                <Label>结束日期字段 *</Label>
                <Select value={mapping.endDate} onValueChange={(v) => handleChange("endDate", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFields.filter(f => f.type === "Date" || f.id === "expectedEndDate" || f.id === "actualEndDate").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">用于确定任务结束时间</p>
              </div>
            </div>
          </div>

          {/* 可选字段 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-green-100 text-xs">#</span>
              可选字段
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>进度字段</Label>
                <Select value={mapping.progress || ""} onValueChange={(v) => handleChange("progress", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择进度字段 (可选)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不显示进度</SelectItem>
                    {allFields.filter(f => f.type === "Number" || f.type === "Progress" || f.id === "progress").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>分组字段</Label>
                <Select value={mapping.group || ""} onValueChange={(v) => handleChange("group", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分组字段 (可选)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不分组</SelectItem>
                    {allFields.filter(f => f.type === "Select" || f.type === "User" || f.id === "priority" || f.id === "status" || f.id === "assignee").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>颜色字段</Label>
                <Select value={mapping.color || ""} onValueChange={(v) => handleChange("color", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择颜色字段 (可选)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">默认颜色</SelectItem>
                    {allFields.filter(f => f.type === "Select" || f.id === "priority" || f.id === "status").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>依赖关系字段</Label>
                <Select value={mapping.dependencies || ""} onValueChange={(v) => handleChange("dependencies", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择依赖关系字段 (可选)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无依赖关系</SelectItem>
                    {allFields.filter(f => f.id === "dependencies").map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
            <h4 className="font-medium text-gray-900">配置说明</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>任务标题：显示在甘特图中的任务名称</li>
              <li>开始/结束日期：必须是日期类型字段，用于确定任务时间范围</li>
              <li>进度：数字类型字段，表示任务完成百分比 (0-100)</li>
              <li>分组：选择类型字段，用于将任务按类别分组显示</li>
              <li>颜色：选择类型字段，用于设置任务条的颜色</li>
              <li>依赖关系：文本字段，用逗号分隔的任务ID列表</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
