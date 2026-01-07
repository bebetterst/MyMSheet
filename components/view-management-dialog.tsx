"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useTaskStore } from "@/lib/task-store"

interface ViewManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 视图管理对话框
 * 职责：集中管理命名视图，包括保存、应用、重命名、删除、设为默认
 */
export function ViewManagementDialog({ open, onOpenChange }: ViewManagementDialogProps) {
  const { toast } = useToast()
  const {
    views,
    defaultViewId,
    saveCurrentView,
    applySavedView,
    renameView,
    deleteView,
    setDefaultView,
  } = useTaskStore()

  const [viewName, setViewName] = useState("")
  const [selectedViewId, setSelectedViewId] = useState<string>("")
  const [renameId, setRenameId] = useState<string>("")
  const [renameText, setRenameText] = useState<string>("")

  /**
   * 保存当前视图为命名视图
   */
  const handleSaveView = () => {
    const name = viewName.trim()
    if (!name) {
      toast({ title: "请输入视图名称" })
      return
    }
    const id = saveCurrentView(name)
    setViewName("")
    setSelectedViewId(id)
    toast({ title: "视图已保存" })
  }

  /**
   * 应用选中的命名视图
   */
  const handleApplySelectedView = () => {
    if (!selectedViewId) {
      toast({ title: "请选择要应用的视图" })
      return
    }
    applySavedView(selectedViewId)
    toast({ title: "已应用命名视图" })
  }

  /**
   * 将选中的视图设置为默认
   */
  const handleSetDefaultView = () => {
    if (!selectedViewId) {
      toast({ title: "请先选择视图" })
      return
    }
    setDefaultView(selectedViewId)
    toast({ title: "默认视图已设置" })
  }

  /**
   * 重命名指定视图
   */
  const handleRenameView = (id: string) => {
    if (renameId !== id || !renameText.trim()) return
    renameView(id, renameText.trim())
    setRenameId("")
    setRenameText("")
    toast({ title: "视图已重命名" })
  }

  /**
   * 删除指定视图
   */
  const handleDeleteView = (id: string) => {
    deleteView(id)
    if (selectedViewId === id) setSelectedViewId("")
    toast({ title: "视图已删除" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>视图管理</DialogTitle>
          <DialogDescription>保存、应用和维护命名视图，快速切换表格配置。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="text-sm font-medium">保存当前视图</div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input placeholder="输入视图名称" value={viewName} onChange={(e) => setViewName(e.target.value)} />
              </div>
              <Button onClick={handleSaveView}>保存</Button>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium">应用/默认视图</div>
            <div className="flex items-center gap-3">
              <Select value={selectedViewId || "none"} onValueChange={(val) => setSelectedViewId(val === "none" ? "" : val)}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="选择命名视图" />
                </SelectTrigger>
                <SelectContent>
                  {views.length === 0 && <SelectItem value="none">暂无视图</SelectItem>}
                  {views.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleApplySelectedView}>应用视图</Button>
              <Button variant="outline" onClick={handleSetDefaultView}>设为默认</Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium mb-2">命名视图列表</div>
            <ScrollArea className="h-[32vh] pr-4">
              <div className="space-y-2">
                {views.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border rounded-md p-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{v.name}</span>
                      {defaultViewId === v.id && <span className="text-xs text-blue-600">默认</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        className="h-8 w-44"
                        placeholder="重命名"
                        value={renameId === v.id ? renameText : ""}
                        onChange={(e) => {
                          setRenameId(v.id)
                          setRenameText(e.target.value)
                        }}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleRenameView(v.id)}>重命名</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteView(v.id)}>删除</Button>
                      <Button variant="outline" size="sm" onClick={() => applySavedView(v.id)}>应用</Button>
                    </div>
                  </div>
                ))}
                {views.length === 0 && <div className="text-xs text-gray-500">暂无命名视图，先保存一个吧。</div>}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
