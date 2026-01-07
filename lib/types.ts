export interface User {
  id: string
  name: string
  avatar?: string
  role?: string
  department?: string
}

export type FieldType = "Text" | "Number" | "Select" | "MultiSelect" | "Date" | "User" | "Progress" | "Rating" | "Checkbox" | "RichText" | "Image" | "Tag" | "Radio"

export interface FieldDefinition {
  id: string
  name: string
  type: FieldType
  width: number
  visible: boolean
  options?: string[] // For Select/MultiSelect
  regex?: string // For Text validation
  min?: number // For Number/Rating/Progress
  max?: number // For Number/Rating/Progress
  dateFormat?: string // For Date
  defaultValue?: any
  system?: boolean // If true, cannot be deleted (e.g., id, description)
}

export interface Task {
  id: string
  // Dynamic fields storage
  fields: Record<string, any>
  // Deprecated fields kept for migration compatibility (optional)
  description?: string
  summary?: string
  assignee?: User
  status?: string
  startDate?: string
  expectedEndDate?: string
  actualEndDate?: string
  isDelayed?: boolean
  completed?: boolean
  priority?: string
  dependencies?: string[] // 前置任务ID列表
  customFields?: Record<string, CustomFieldValue>
}

export interface PriorityGroup {
  id: string
  name: string
  tasks: Task[]
}

export interface TaskData {
  priorityGroups: PriorityGroup[]
  fields: FieldDefinition[] // Store field definitions here
}

// ... existing ViewConfig, FilterConfig, SortConfig ...
export interface ViewConfig {
  rowHeight: "低" | "中等" | "高" | "超高"
  editMode: boolean
  expandedGroups: Record<string, boolean>
  expandedTasks: Record<string, boolean>
  headerDraggable: boolean
}

export interface FilterConfig {
  status: string | null
  priority: string | null
  assignee: string | null
  dateRange: {
    start?: string
    end?: string
  } | null
  isActive: boolean
}

export interface SortConfig {
  field: string | null
  direction: "asc" | "desc"
  isActive: boolean
}

// Keep legacy types for backward compatibility where needed
export interface FieldConfig {
  id: string
  name: string
  visible: boolean
  width: number
  type: string
  options?: string[]
}

export interface CustomFieldValue {
  type: string
  value: any
}

export type TaskStatus = "待开始" | "进行中" | "已完成" | "已停滞"
export type TaskPriority = "重要紧急" | "紧急不重要" | "重要不紧急"

export type TimeScale = "day" | "week" | "month" | "quarter" | "year"

export interface GanttConfig {
  // 字段映射
  fieldMapping: {
    title: string // 任务标题字段 ID
    startDate: string // 开始日期字段 ID
    endDate: string // 结束日期字段 ID
    progress?: string // 进度字段 ID
    group?: string // 分组字段 ID
    color?: string // 颜色字段 ID
    dependencies?: string // 依赖关系字段 ID
  }
  // 视图设置
  viewSettings: {
    timeScale: TimeScale
    showWeekend: boolean
    showToday: boolean
    zoomLevel: number // 50 - 200 (percentage)
  }
}
