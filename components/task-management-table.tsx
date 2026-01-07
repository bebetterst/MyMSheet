"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import EditableCell from "@/components/editable-cell"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskDetail } from "@/components/task-detail"
import { KanbanBoard } from "@/components/kanban-board"
import { AssignmentBoard } from "@/components/assignment-board"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useToast } from "@/hooks/use-toast"
import { useTaskStore } from "@/lib/task-store"
import type { Task, FieldDefinition } from "@/lib/types"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  CheckCircle,
  GripVertical,
  AlertCircle,
  Search,
  Plus,
  Filter,
  ArrowDownUp,
  LayoutGrid,
  Table2,
  UserRound,
  Check,
  ChevronLeft,
  Menu,
  X,
  SlidersHorizontal,
  Columns,
  Expand,
  Pencil,
  Download,
  Upload,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable"

// 导入对话框组件
import { FilterDialog } from "@/components/filter-dialog"
import { SortDialog } from "@/components/sort-dialog"
import { GroupByDialog } from "@/components/group-by-dialog"
import { FieldManagementDialog } from "@/components/field-management-dialog"
import { ViewManagementDialog } from "@/components/view-management-dialog"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { AddUserDialog } from "@/components/add-user-dialog"
import { ImportTasksDialog } from "@/components/import-tasks-dialog"
// 在 import 部分添加新组件
import { CustomFieldCell } from "@/components/custom-field-cell"

// 行高类型定义
type RowHeight = "低" | "中等" | "高" | "超高"

// 行高映射到具体的像素值
const rowHeightMap: Record<RowHeight, string> = {
  低: "py-1",
  中等: "py-2",
  高: "py-3",
  超高: "py-4",
}

// 辅助函数：处理列宽调整
const handleColumnResizeStart = (
    e: React.MouseEvent,
    field: FieldDefinition,
    onResize: (width: number) => void
) => {
  e.preventDefault()
  e.stopPropagation()

  // 设置拖拽状态
  const startX = e.clientX
  const startWidth = field.width

  // 创建辅助线
  const resizeLine = document.createElement("div")
  resizeLine.className = "resize-line"
  resizeLine.style.position = "fixed"
  resizeLine.style.top = "0"
  resizeLine.style.bottom = "0"
  resizeLine.style.width = "2px"
  resizeLine.style.backgroundColor = "#3b82f6"
  resizeLine.style.zIndex = "9999"
  resizeLine.style.left = `${e.clientX}px`
  document.body.appendChild(resizeLine)

  // 设置全局样式
  document.body.style.cursor = "col-resize"
  document.body.style.userSelect = "none"
  document.body.classList.add("column-resizing")

  // 找到所有相同字段ID的单元格
  const allCells = document.querySelectorAll(`[data-field-id="${field.id}"]`) as NodeListOf<HTMLElement>

  const handleMouseMove = (moveEvent: MouseEvent) => {
    // 更新辅助线位置
    resizeLine.style.left = `${moveEvent.clientX}px`

    // 计算新宽度
    const deltaX = moveEvent.clientX - startX
    const newWidth = Math.max(80, startWidth + deltaX)

    // 实时更新所有相同字段的单元格宽度
    allCells.forEach((cell) => {
      cell.style.width = `${newWidth}px`
      cell.style.minWidth = `${newWidth}px`
      cell.style.maxWidth = `${newWidth}px`
    })
  }

  const handleMouseUp = (upEvent: MouseEvent) => {
    // 计算最终宽度
    const deltaX = upEvent.clientX - startX
    const newWidth = Math.max(80, startWidth + deltaX)

    // 更新状态
    onResize(newWidth)

    // 清理
    if (resizeLine.parentNode) {
      resizeLine.parentNode.removeChild(resizeLine)
    }

    // 移除全局事件监听
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)

    // 恢复全局样式
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    document.body.classList.remove("column-resizing")
  }

  document.addEventListener("mousemove", handleMouseMove)
  document.addEventListener("mouseup", handleMouseUp)
}

// 可排序的表头单元格组件
const SortableHeaderCell = ({
                              field,
                              onResize,
                            }: {
  field: FieldDefinition
  onResize: (width: number) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    width: `${field.width}px`,
    minWidth: `${field.width}px`,
    maxWidth: `${field.width}px`, // 添加最大宽度限制
  }

  return (
      <div
          ref={setNodeRef}
          style={style}
          className={`relative flex items-center ${field.id === "description" ? "pl-10" : ""} group table-cell`}
      >
        <div className="flex-shrink-0 mr-2 cursor-move touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-4">{field.name}</div>
        <div
            className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onMouseDown={(e) => handleColumnResizeStart(e, field, onResize)}
        >
          <div className="h-full w-1 bg-blue-300 hover:bg-blue-500" />
        </div>
      </div>
  )
}

// 可排序的任务行组件
function SortableTaskRow({
                           task,
                           index,
                           expandedTasks,
                           toggleTaskExpand,
                           handleTaskUpdate,
                           handleTaskClick,
                           rowHeight,
                           visibleFields,
                           editMode,
                           users,
                         }: {
  task: Task
  index: number
  expandedTasks: Record<string, boolean>
  toggleTaskExpand: (taskId: string) => void
  handleTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  handleTaskClick: (task: Task) => void
  rowHeight: RowHeight
  visibleFields: FieldDefinition[]
  editMode: boolean
  users: { id: string; name: string }[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 100 : 1,
  }

  return (
      <div ref={setNodeRef} style={style}>
        <div
            className={`flex items-center px-4 ${rowHeightMap[rowHeight]} border-b border-gray-200 hover:bg-gray-50 cursor-pointer pl-12 table-data-row`}
            onClick={() => toggleTaskExpand(task.id)}
        >
          <div className="w-10 flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => handleTaskUpdate(task.id, { completed: !!checked })}
            />
          </div>
          <div className="w-10 text-gray-500">{index + 1}</div>

          {visibleFields
              .filter((field) => field.visible)
              .map((field) => (
                  <div
                      key={field.id}
                      style={{
                        width: `${field.width}px`,
                        minWidth: `${field.width}px`,
                        maxWidth: `${field.width}px`, // 添加最大宽度限制
                      }}
                      className={`${field.id === "description" ? "flex items-center" : ""} table-cell`}
                  >
                    {field.id === "description" && (
                        <div className="flex items-center w-full min-w-0 overflow-hidden">
                          <div
                              className="flex-shrink-0 mr-2 cursor-move touch-none"
                              {...attributes}
                              {...listeners}
                              onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </div>
                          <ChevronDown
                              className={`flex-shrink-0 h-3.5 w-3.5 mr-1.5 transition-transform ${
                                  expandedTasks[task.id] ? "transform rotate-0" : "transform -rotate-90"
                              }`}
                          />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <EditableCell
                                value={task.description}
                                onSave={(value) => handleTaskUpdate(task.id, { description: value })}
                                className="w-full"
                            />
                          </div>
                        </div>
                    )}

                    {field.id === "summary" && (
                        <EditableCell
                            value={(task.summary || "").split("\n")[0]}
                            onSave={(value) => {
                              const newSummary = (task.summary || "")
                                  .split("\n")
                                  .map((line, i) => (i === 0 ? value : line))
                                  .join("\n")
                              handleTaskUpdate(task.id, { summary: newSummary })
                            }}
                        />
                    )}

                    {field.id === "assignee" &&
                        (editMode ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                  value={task.assignee?.id || ""}
                                  onValueChange={(value) => {
                                    const selectedUser = users.find((user) => user.id === value)
                                    if (selectedUser) {
                                      handleTaskUpdate(task.id, { assignee: selectedUser })
                                    }
                                  }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                        ) : (
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback
                                    className={`
                    ${
                                        task.assignee?.id === "zhoubeihe"
                                            ? "bg-purple-500"
                                            : task.assignee?.id === "huangpaopu"
                                                ? "bg-teal-500"
                                                : "bg-orange-500"
                                    } text-white text-xs
                  `}
                                >
                                  {task.assignee?.name?.slice(0, 2) || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.assignee?.name || "未分配"}</span>
                            </div>
                        ))}

                    {field.id === "status" &&
                        (editMode ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                  value={task.status}
                                  onValueChange={(value) => handleTaskUpdate(task.id, { status: value as Task["status"] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="待开始">待开始</SelectItem>
                                  <SelectItem value="进行中">进行中</SelectItem>
                                  <SelectItem value="已完成">已完成</SelectItem>
                                  <SelectItem value="已暂停">已暂停</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                        ) : (
                            <Badge
                                className={
                                  task.status === "进行中"
                                      ? "badge badge-status-in-progress"
                                      : task.status === "已完成"
                                          ? "badge badge-status-completed"
                                          : task.status === "待开始"
                                              ? "badge badge-status-pending"
                                              : "badge badge-status-stalled"
                                }
                            >
                              {task.status}
                            </Badge>
                        ))}

                    {field.id === "priority" &&
                        (editMode ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                  value={task.priority}
                                  onValueChange={(value) => handleTaskUpdate(task.id, { priority: value as Task["priority"] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="重要紧急">重要紧急</SelectItem>
                                  <SelectItem value="紧急不重要">紧急不重要</SelectItem>
                                  <SelectItem value="重要不紧急">重要不紧急</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                        ) : (
                            <Badge
                                className={
                                  task.priority === "重要紧急"
                                      ? "badge badge-priority-urgent"
                                      : task.priority === "紧急不重要"
                                          ? "badge badge-priority-important"
                                          : "badge badge-priority-normal"
                                }
                            >
                              {task.priority}
                            </Badge>
                        ))}

                    {field.id === "startDate" && (
                        <EditableCell
                            value={task.startDate}
                            onSave={(value) => handleTaskUpdate(task.id, { startDate: value })}
                            type="date"
                        />
                    )}

                    {field.id === "expectedEndDate" && (
                        <EditableCell
                            value={task.expectedEndDate || ""}
                            onSave={(value) => handleTaskUpdate(task.id, { expectedEndDate: value })}
                            type="date"
                        />
                    )}

                    {field.id === "isDelayed" && (
                        <div className="flex justify-center">
                          {task.isDelayed ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                    )}

                    {field.id === "actualEndDate" && (
                        <EditableCell
                            value={task.actualEndDate || ""}
                            onSave={(value) => handleTaskUpdate(task.id, { actualEndDate: value })}
                            type="date"
                        />
                    )}

                    {field.id === "completed" && (
                        <div className="text-gray-600">{task.completed ? "已经完成" : "进行中"}</div>
                    )}

                    {/* 渲染自定义字段 */}
                    {field.id.startsWith("custom_") && (
                        <CustomFieldCell
                            fieldId={field.id}
                            fieldType={field.type}
                            value={task.customFields?.[field.id]}
                            options={field.options}
                            onSave={(value) => {
                              // 调用更新自定义字段的方法
                              useTaskStore.getState().updateTaskCustomField(task.id, field.id, value)
                            }}
                            editMode={editMode}
                        />
                    )}
                  </div>
              ))}
        </div>
        {expandedTasks[task.id] && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 pl-12 relative">
              <div
                className="absolute left-[3.25rem] top-1/2 -translate-y-1/2 transform flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 h-7 px-2 text-xs"
                  onClick={() => handleTaskClick(task)}
                >
                  详情
                </Button>
              </div>
              <div className="ml-20 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">任务情况总结</div>
                  <div className="text-sm whitespace-pre-line max-h-40 overflow-y-auto">
                    <EditableCell value={task.summary} onSave={(value) => handleTaskUpdate(task.id, { summary: value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">重要紧急程度</div>
                  <Badge
                      className={
                        task.priority === "重要紧急"
                            ? "badge badge-priority-urgent"
                            : task.priority === "紧急不重要"
                                ? "badge badge-priority-important"
                                : "badge badge-priority-normal"
                      }
                  >
                    {task.priority}
                 </Badge>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}

// 更新 TaskManagementTable 组件接收 sidebarOpen 和 setSidebarOpen 属性
export default function TaskManagementTable({
                                              sidebarOpen = true,
                                              setSidebarOpen = () => {},
                                            }: {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}) {
  const { toast } = useToast()
  const {
    data,
    filteredData,
    searchQuery,
    setSearchQuery,
    addTask,
    updateTask,
    viewConfig,
    updateViewConfig,
    visibleFields,
    filterConfig,
    sortConfig,
    reorderTasks,
    addUser,
    updateFieldWidth,
    headerOrder,
    reorderHeaders,
    applyTemplateDefaults,
    applySavedView,
    defaultViewId,
  } = useTaskStore()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false)
  const [isGroupByDialogOpen, setIsGroupByDialogOpen] = useState(false)
  const [isFieldManagementDialogOpen, setIsFieldManagementDialogOpen] = useState(false)
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isImportTasksDialogOpen, setIsImportTasksDialogOpen] = useState(false)
  const [isViewManagementOpen, setIsViewManagementOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("table")
  const isMobile = useMediaQuery("(max-width: 768px)")
  // 在 TaskManagementTable 组件中添加新的状态

  // 在 TaskManagementTable 组件中添加新的状态
  const [isClient, setIsClient] = useState(false)

  // 从所有任务中提取唯一的用户
  const users = Array.from(
    new Map(
      data.priorityGroups
        .flatMap((group) => group.tasks)
        .flatMap((task) => (task.assignee ? [[task.assignee.id, task.assignee] as const] : [])),
    ).values(),
  )

  /**
   * 应用示例模板默认视图
   * 函数职责：调用 store 的 applyTemplateDefaults，将分组/排序/行高/表头拖拽等配置注入
   */
  const applyDemoTemplateDefaults = () => {
    applyTemplateDefaults({
      visibleFields,
      headerOrder,
      table: {
        groupBy: "priority",
        sortBy: "status",
        rowHeight: viewConfig.rowHeight,
        headerDraggable: viewConfig.headerDraggable,
      },
    })
    toast({ title: "已应用模板默认视图" })
  }

  // 自动应用默认视图
  useEffect(() => {
    if (defaultViewId) {
      applySavedView(defaultViewId)
    }
  }, [defaultViewId, applySavedView])

  const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor),
  )

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 处理拖拽开始
  const handleDragStart = () => {
    // const { active } = event
    // setActiveId(active.id as string)
  }

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // 找到任务和它所在的优先级组
    let sourceGroupId: string | undefined
    let activeIndex = -1
    let overIndex = -1
    let overGroupId: string | undefined

    for (const group of filteredData.priorityGroups) {
      const srcTaskIndex = group.tasks.findIndex((task) => task.id === activeId)
      if (srcTaskIndex !== -1) {
        sourceGroupId = group.id
        activeIndex = srcTaskIndex
      }

      const destTaskIndex = group.tasks.findIndex((task) => task.id === overId)
      if (destTaskIndex !== -1) {
        overGroupId = group.id
        overIndex = destTaskIndex
      }

      // 如果已经找到了源和目标，就可以跳出循环了
      if (sourceGroupId && overGroupId) {
        break
      }
    }

    // 确保找到了源任务和目标位置
    if (sourceGroupId && activeIndex !== -1 && overGroupId && overIndex !== -1) {
      // 调用任务重排序函数，添加目标组ID参数
      reorderTasks(sourceGroupId, activeIndex, overIndex, overGroupId)

      // 提示用户
      const message = sourceGroupId === overGroupId ? "任务顺序已更新" : `任务已移动至"${overGroupId}"优先级组`

      toast({
        title: "任务已重新排序",
        description: message,
      })
    }
  }

  // 处理表头拖拽结束
  const handleHeaderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // 找到源和目标索引
    const oldIndex = headerOrder.indexOf(activeId)
    const newIndex = headerOrder.indexOf(overId)

    if (oldIndex !== -1 && newIndex !== -1) {
      // 调用重排序表头的方法
      reorderHeaders(oldIndex, newIndex)

      toast({
        title: "列顺序已更新",
        description: "表格列顺序已成功调整",
      })
    }
  }

  // 切换任务展开/折叠状态
  const toggleTaskExpand = (taskId: string) => {
    updateViewConfig({
      expandedTasks: {
        ...viewConfig.expandedTasks,
        [taskId]: !viewConfig.expandedTasks[taskId],
      },
    })
  }

  // 切换分组展开/折叠状态
  const toggleGroupExpand = (groupId: string) => {
    updateViewConfig({
      expandedGroups: {
        ...viewConfig.expandedGroups,
        [groupId]: !viewConfig.expandedGroups[groupId],
      },
    })
  }

  // 展开或折叠所有分组
  const toggleAllGroups = () => {
    const allExpanded = Object.values(viewConfig.expandedGroups).every((value) => value)
    const newExpandedGroups: Record<string, boolean> = {}

    filteredData.priorityGroups.forEach((group) => {
      newExpandedGroups[group.id] = !allExpanded
    })

    updateViewConfig({
      expandedGroups: newExpandedGroups,
    })
  }

  // 处理任务点击，打开详情对话框
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailOpen(true)
  }

  // 处理任务更新
  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates)
    toast({
      title: "任务已更新",
      description: "任务信息已成功更新",
    })
  }



  // 处理添加新任务
  const handleAddTask = (task: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      description: task.description || "新任务",
      summary: task.summary || "",
      assignee: task.assignee || {
        id: "zhoubeihe",
        name: "周北北",
      },
      status: task.status || "待开始",
      startDate: task.startDate || new Date().toISOString().split("T")[0].replace(/-/g, "/"),
      expectedEndDate: task.expectedEndDate,
      actualEndDate: task.actualEndDate,
      isDelayed: task.isDelayed || false,
      completed: task.completed || false,
      priority: task.priority || "重要紧急",
      customFields: task.customFields || {},
      fields: {},
    }

    addTask(newTask)
    toast({
      title: "任务已添加",
      description: `任务 "${newTask.description}" 已成功添加`,
    })
  }



  // 处理添加新用户
  const handleAddUser = (user: { id: string; name: string; avatar?: string; role?: string; department?: string }) => {
    addUser(user)
    toast({
      title: "用户已添加",
      description: `用户 "${user.name}" 已成功添加`,
    })
  }

  // 切换编辑模式
  const toggleEditMode = () => {
    updateViewConfig({ editMode: !viewConfig.editMode })
  }

  // 导出任务数据
  const exportTaskData = () => {
    const tasks = data.priorityGroups.flatMap((group) => group.tasks)
    const jsonData = JSON.stringify(tasks, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tasks-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "导出成功",
      description: "任务数据已成功导出为JSON文件",
    })
  }

  // 使用useCallback优化列宽调整函数
  const handleColumnResizeCallback = useCallback(
      (fieldId: string, width: number) => {
        updateFieldWidth(fieldId, width)

        // 更新后重新计算表格总宽度
        setTimeout(() => {
          // 基础宽度（复选框和序号列）
          let totalWidth = 20 // 初始宽度

          // 添加所有可见列的宽度
          visibleFields
              .filter((field) => field.visible)
              .forEach((field) => {
                if (field.id === fieldId) {
                  totalWidth += width
                } else {
                  totalWidth += field.width
                }
              })

          // 设置表格内容区域的宽度
          const tableContent = document.querySelector(".task-product-content")
          if (tableContent) {
            (tableContent as HTMLElement).style.minWidth = `${totalWidth}px`
          }
        }, 0)
      },
      [updateFieldWidth, visibleFields],
  )

  // 添加切换表头拖拽的函数
  const toggleHeaderDraggable = () => {
    updateViewConfig({ headerDraggable: !viewConfig.headerDraggable })
  }

  // 在 return 语句前添加以下样式
  // 在 return 语句前添加条件渲染之前添加这段代码
  useEffect(() => {
    // 添加全局样式，确保表格容器有足够的宽度
    const style = document.createElement("style")
    style.innerHTML = `
    .task-table-container {
      min-width: 100%;
      overflow-x: auto;
    }
    .task-table-content {
      min-width: 100%;
      width: max-content; /* 确保表格内容可以扩展 */
    }
    .column-resizing * {
      cursor: col-resize !important;
      user-select: none !important;
      user-select: none !important;
    }
    .table-cell {
      flex: 0 0 auto;
      overflow: hidden;
    }
  `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // 在 TaskManagementTable 组件中添加以下 useEffect 钩子，确保表格宽度计算正确
  useEffect(() => {
    // 计算表格总宽度
    const calculateTableWidthCallback = () => {
      // 基础宽度（复选框和序号列）
      let totalWidth = 20 // 初始宽度

      // 添加所有可见列的宽度
      const orderedVisibleFields = headerOrder
          .map((id) => visibleFields.find((field) => field.id === id))
          .filter(Boolean)
          .concat(visibleFields.filter((field) => !headerOrder.includes(field.id)))

      orderedVisibleFields
          .filter((field) => field && field.visible)
          .forEach((field) => {
            if (field) totalWidth += field.width
          })

      // 设置表格内容区域的宽度
      const tableContent = document.querySelector(".task-product-content")
      if (tableContent) {
        (tableContent as HTMLElement).style.minWidth = `${totalWidth}px`
      }
    }

    // 初始计算和窗口大小变化时重新计算
    calculateTableWidthCallback()
    window.addEventListener("resize", calculateTableWidthCallback)

    return () => {
      window.removeEventListener("resize", calculateTableWidthCallback)
    }
  }, [visibleFields, headerOrder])

  // 在 TaskManagementTable 组件中添加条件渲染
  if (!isClient) {
    return <div className="p-8 flex justify-center items-center">加载中...</div>
  }

  // 根据 headerOrder 排序可见字段
  const orderedVisibleFieldsCallback = headerOrder
      .map((id) => visibleFields.find((field) => field.id === id))
      .filter(Boolean)
      .concat(visibleFields.filter((field) => !headerOrder.includes(field.id))) as FieldDefinition[]

  return (
      <div className="flex flex-col h-screen max-h-screen">
        {/* 顶部导航栏 */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0 relative">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-1">
              {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button size="sm" onClick={() => setIsAddTaskDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              添加记录
            </Button>
            {!isMobile && (
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                      placeholder="搜索任务..."
                      className="pl-8 h-9 w-56"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                      <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7"
                          onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                  )}
                </div>
            )}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                任务管理
              </Badge>
              {!isMobile && (
                  <span className="text-sm text-gray-500">
                {data.priorityGroups.reduce((acc, group) => acc + group.tasks.length, 0)} 个任务
              </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 fixed right-4 top-2 z-20 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            {/* 外部按钮已移除 */}
          </div>
        </header>

        {/* 主体内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 主内容区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 工具栏 */}
            <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="table" className="flex items-center">
                      <Table2 className="h-4 w-4 mr-1" />
                      表格视图
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="flex items-center">
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      看板
                    </TabsTrigger>
                    <TabsTrigger value="assignment" className="flex items-center">
                      <UserRound className="h-4 w-4 mr-1" />
                      人员分配
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center ${filterConfig.isActive ? "bg-blue-50 text-blue-600" : ""}`}
                    onClick={() => setIsFilterDialogOpen(true)}
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  筛选
                  {filterConfig.isActive && (
                      <Badge className="ml-1 bg-blue-100 text-blue-800 border-blue-200 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                        <Check className="h-3 w-3" />
                      </Badge>
                  )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center ${sortConfig.isActive ? "bg-blue-50 text-blue-600" : ""}`}
                    onClick={() => setIsSortDialogOpen(true)}
                >
                  <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                  排序
                  {sortConfig.isActive && (
                      <Badge className="ml-1 bg-blue-100 text-blue-800 border-blue-200 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                        <Check className="h-3 w-3" />
                      </Badge>
                  )}
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsGroupByDialogOpen(true)}>
                  <Columns className="h-3.5 w-3.5 mr-1" />
                  分组
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsFieldManagementDialogOpen(true)}>
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                  字段管理
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleHeaderDraggable}
                    className={viewConfig.headerDraggable ? "bg-blue-50 text-blue-600" : ""}
                >
                  <GripVertical className="h-3.5 w-3.5 mr-1" />
                  {viewConfig.headerDraggable ? "禁用列拖拽" : "启用列拖拽"}
                </Button>

                <Button variant="outline" size="sm" onClick={toggleEditMode}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {viewConfig.editMode ? "退出编辑" : "编辑模式"}
                </Button>

                <Button variant="outline" size="sm" onClick={toggleAllGroups}>
                  <Expand className="h-3.5 w-3.5 mr-1" />
                  展开/折叠
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsAddUserDialogOpen(true)}>
                  <UserRound className="h-3.5 w-3.5 mr-1" />
                  添加人员
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsImportTasksDialogOpen(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  导入任务
                </Button>

                <Button variant="outline" size="sm" onClick={exportTaskData}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  导出数据
                </Button>

                <Button variant="outline" size="sm" onClick={applyDemoTemplateDefaults}>
                  <Columns className="h-3.5 w-3.5 mr-1" />
                  应用模板
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsViewManagementOpen(true)}>
                  视图管理
                </Button>
              </div>
            </div>

            {/* 内容显示区域 */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} className="h-full">
                <TabsContent value="table" className="h-full m-0">
                  <div className="flex flex-col h-full task-table-container">
                    <div className="task-table-content h-full">
                      <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                      >
                        <ScrollArea className="h-full" orientation="both">
                          <div className="p-2">
                            {/* 表头 - 支持拖拽 */}
                            <div className="flex items-center px-4 py-2 bg-gray-50 border-y border-gray-200 font-medium text-sm text-gray-600 pl-12 sticky top-0 z-10 table-header-row">
                              <div className="w-10 flex justify-center">
                                <Checkbox />
                              </div>
                              <div className="w-10">#</div>

                              {viewConfig.headerDraggable ? (
                                  <DndContext
                                      sensors={sensors}
                                      collisionDetection={closestCenter}
                                      onDragEnd={handleHeaderDragEnd}
                                  >
                                    <SortableContext items={headerOrder} strategy={horizontalListSortingStrategy}>
                                      {headerOrder.map((fieldId) => {
                                        const field = visibleFields.find((f) => f.id === fieldId && f.visible)
                                        if (!field) return null

                                        return (
                                            <SortableHeaderCell
                                                key={field.id}
                                                field={field}
                                                onResize={(width) => handleColumnResizeCallback(field.id, width)}
                                            />
                                        )
                                      })}
                                    </SortableContext>
                                  </DndContext>
                              ) : (
                                  // 非拖拽模式下的表头渲染
                                  orderedVisibleFieldsCallback
                                      .filter((field) => field && field.visible)
                                      .map((field) => (
                                          <div
                                              key={field.id}
                                              data-field-id={field.id}
                                              className={`relative flex items-center ${field.id === "description" ? "pl-10" : ""} group table-cell`}
                                              style={{
                                                width: `${field.width}px`,
                                                minWidth: `${field.width}px`,
                                                maxWidth: `${field.width}px`, // 添加最大宽度限制
                                              }}
                                          >
                                            <div className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-4">
                                              {field.name}
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                onMouseDown={(e) => handleColumnResizeStart(e, field, (width) => handleColumnResizeCallback(field.id, width))}
                                            >
                                              <div className="h-full w-1 bg-blue-300 hover:bg-blue-500" />
                                            </div>
                                          </div>
                                      ))
                              )}
                            </div>

                            {/* 任务分组 */}
                            {filteredData.priorityGroups.map((group) => (
                                <div key={group.id} className="mb-2">
                                  {/* 分组标题 */}
                                  <div
                                      className="flex items-center px-4 py-2 bg-blue-50 border-y border-blue-100 cursor-pointer"
                                      onClick={() => toggleGroupExpand(group.id)}
                                  >
                                    <ChevronDown
                                        className={`h-4 w-4 mr-2 transition-transform ${
                                            viewConfig.expandedGroups[group.id] ? "transform rotate-0" : "transform -rotate-90"
                                        }`}
                                    />
                                    <Badge
                                        className={
                                          group.id === "重要紧急"
                                              ? "badge badge-priority-urgent"
                                              : group.id === "紧急不重要"
                                                  ? "badge badge-priority-important"
                                                  : "badge badge-priority-normal"
                                        }
                                    >
                                      {group.name}
                                    </Badge>
                                    <span className="ml-2 text-sm text-gray-500">{group.tasks.length} 个任务</span>
                                  </div>

                                  {/* 分组内容 */}
                                  {viewConfig.expandedGroups[group.id] && (
                                      <SortableContext
                                          items={group.tasks.map((task) => task.id)}
                                          strategy={verticalListSortingStrategy}
                                      >
                                        {group.tasks.map((task, index) => (
                                            <SortableTaskRow
                                                key={task.id}
                                                task={task}
                                                index={index}
                                                expandedTasks={viewConfig.expandedTasks}
                                                toggleTaskExpand={toggleTaskExpand}
                                                handleTaskUpdate={handleTaskUpdate}
                                                handleTaskClick={handleTaskClick}
                                                rowHeight={viewConfig.rowHeight}
                                                visibleFields={orderedVisibleFieldsCallback}
                                                editMode={viewConfig.editMode}
                                                users={users}
                                            />
                                        ))}
                                      </SortableContext>
                                  )}
                                </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </DndContext>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="kanban" className="h-full m-0">
                  <KanbanBoard
                      data={filteredData}
                      onTaskClick={handleTaskClick}
                      onTaskUpdate={handleTaskUpdate}
                      onAddTask={handleAddTask}
                  />
                </TabsContent>

                <TabsContent value="assignment" className="h-full m-0">
                  <AssignmentBoard data={filteredData} onTaskClick={handleTaskClick} onAddUser={handleAddUser} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* 弹出框 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <DialogTitle className="sr-only">任务详情</DialogTitle>
                <DialogDescription className="sr-only">
                  查看和编辑任务详情，包括执行人、状态、日期和评论等。
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 min-h-0 w-full">
              {selectedTask && <TaskDetail task={selectedTask} />}
            </div>
          </DialogContent>
        </Dialog>

        {/* 使用导入的对话框组件 */}
        <FilterDialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen} />
        <SortDialog open={isSortDialogOpen} onOpenChange={setIsSortDialogOpen} />
        <GroupByDialog open={isGroupByDialogOpen} onOpenChange={setIsGroupByDialogOpen} />
        <FieldManagementDialog open={isFieldManagementDialogOpen} onOpenChange={setIsFieldManagementDialogOpen} />
        <AddTaskDialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen} onAddTask={handleAddTask} />
        <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} onAddUser={handleAddUser} />
        <ImportTasksDialog open={isImportTasksDialogOpen} onOpenChange={setIsImportTasksDialogOpen} />
        <ViewManagementDialog open={isViewManagementOpen} onOpenChange={setIsViewManagementOpen} />
      </div>
  )
}
