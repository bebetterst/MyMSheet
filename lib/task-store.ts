'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TaskData,
  Task,
  User,
  PriorityGroup,
  FilterConfig,
  SortConfig,
  ViewConfig,
  FieldType,
  FieldDefinition,
  GanttConfig,
} from '@/lib/types';
import { initialData } from '@/lib/data';

// 防抖保存函数
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSave = (data: any) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      console.log('Data synced to server');
    } catch (error) {
      console.error('Failed to sync data:', error);
    }
  }, 1000); // 1秒防抖
};

interface TaskStore {
  isLoading: boolean;
  fetchData: () => Promise<void>;

  data: TaskData;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredData: TaskData;
  addTask: (task: Task) => void;
  addMultipleTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addUser: (user: User) => void;
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  reorderTasks: (
    priorityGroupId: string,
    oldIndex: number,
    newIndex: number,
    targetGroupId?: string,
  ) => void;

  // 视图配置
  viewConfig: ViewConfig;
  updateViewConfig: (updates: Partial<ViewConfig>) => void;

  // 甘特图配置
  ganttConfig: GanttConfig;
  updateGanttConfig: (updates: Partial<GanttConfig>) => void;
  updateGanttFieldMapping: (updates: Partial<GanttConfig['fieldMapping']>) => void;
  updateGanttViewSettings: (updates: Partial<GanttConfig['viewSettings']>) => void;

  // 筛选配置
  filterConfig: FilterConfig;
  setFilterConfig: (config: FilterConfig) => void;
  applyFilters: () => void;

  // 排序配置
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  applySorting: () => void;

  // 分组配置
  groupBy: string;
  setGroupBy: (field: string) => void;
  regroupData: () => TaskData;

  // 字段配置
  visibleFields: FieldDefinition[]; // 使用 FieldDefinition 类型
  setVisibleFields: (fields: FieldDefinition[]) => void;
  updateFieldWidth: (fieldId: string, width: number) => void;

  // 字段管理
  addField: (field: FieldDefinition) => void;
  updateFieldType: (fieldId: string, type: FieldType) => void;
  updateField: (fieldId: string, updates: Partial<FieldDefinition>) => void;
  deleteField: (fieldId: string) => void;

  // 表头顺序
  headerOrder: string[];
  setHeaderOrder: (order: string[]) => void;
  reorderHeaders: (oldIndex: number, newIndex: number) => void;

  // 用户管理
  deleteUser: (userId: string) => void;
  reorderUsers: (oldIndex: number, newIndex: number) => void;
  getSortedUsers: () => User[];
  userOrder: string[];
  setUserOrder: (userIds: string[]) => void;

  // 自定义字段值
  updateTaskCustomField: (taskId: string, fieldId: string, value: any) => void;

  // 模板/视图注入方法
  applyTemplateDefaults: (defaults: {
    visibleFields?: FieldDefinition[];
    headerOrder?: string[];
    table?: {
      groupBy?: string;
      sortBy?: string;
      rowHeight?: ViewConfig['rowHeight'];
      headerDraggable?: boolean;
    };
    filter?: Partial<FilterConfig>;
  }) => void;
  applyViewConfigFromTemplate: (view: {
    groupBy?: string;
    sort?: { field?: string | null; direction?: 'asc' | 'desc'; isActive?: boolean };
    filter?: Partial<FilterConfig>;
    rowHeight?: ViewConfig['rowHeight'];
    headerDraggable?: boolean;
  }) => void;

  // 命名视图管理
  views: {
    id: string;
    name: string;
    config: {
      groupBy?: string;
      sort?: { field?: string | null; direction?: 'asc' | 'desc'; isActive?: boolean };
      filter?: Partial<FilterConfig>;
      rowHeight?: ViewConfig['rowHeight'];
      headerDraggable?: boolean;
    };
  }[];
  defaultViewId: string | null;
  saveCurrentView: (name: string) => string;
  applySavedView: (id: string) => void;
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
  setDefaultView: (id: string) => void;
}

const getStorageData = (state: TaskStore) => ({
  data: state.data,
  viewConfig: state.viewConfig,
  filterConfig: state.filterConfig,
  sortConfig: state.sortConfig,
  groupBy: state.groupBy,
  visibleFields: state.visibleFields,
  userOrder: state.userOrder,
  headerOrder: state.headerOrder,
  ganttConfig: state.ganttConfig,
  views: state.views,
  defaultViewId: state.defaultViewId,
});

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      isLoading: true,
      fetchData: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/storage');
          if (res.ok) {
            const serverData = await res.json();
            if (serverData.data) {
              // 合并服务器数据到本地状态
              set((state) => {
                const newState = { ...state, ...serverData };
                // 重新应用筛选和排序确保视图正确
                applyFiltersAndSort(newState);
                return newState;
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      data: initialData,
      searchQuery: '',
      views: [],
      defaultViewId: null,

      // 视图配置
      viewConfig: {
        rowHeight: '中等',
        editMode: false,
        expandedGroups: {
          重要紧急: true,
          紧急不重要: true,
          重要不紧急: true,
        },
        expandedTasks: {},
        headerDraggable: false,
      },

      updateViewConfig: (updates) => {
        set((state) => {
          const newConfig = { ...state.viewConfig, ...updates };
          const newState = { ...state, viewConfig: newConfig };
          debouncedSave(getStorageData(newState));
          return { viewConfig: newConfig };
        });
      },

      // 甘特图配置
      ganttConfig: {
        fieldMapping: {
          title: 'description',
          startDate: 'startDate',
          endDate: 'expectedEndDate',
          progress: 'progress',
          group: 'priority',
          color: 'priority',
          dependencies: 'dependencies',
        },
        viewSettings: {
          timeScale: 'day',
          showWeekend: true,
          showToday: true,
          zoomLevel: 100,
        },
      },

      updateGanttConfig: (updates) => {
        set((state) => {
          const newConfig = { ...state.ganttConfig, ...updates };
          const newState = { ...state, ganttConfig: newConfig };
          debouncedSave(getStorageData(newState));
          return { ganttConfig: newConfig };
        });
      },

      updateGanttFieldMapping: (updates) => {
        set((state) => {
          const newConfig = {
            ...state.ganttConfig,
            fieldMapping: { ...state.ganttConfig.fieldMapping, ...updates },
          };
          const newState = { ...state, ganttConfig: newConfig };
          debouncedSave(getStorageData(newState));
          return { ganttConfig: newConfig };
        });
      },

      updateGanttViewSettings: (updates) => {
        set((state) => {
          const newConfig = {
            ...state.ganttConfig,
            viewSettings: { ...state.ganttConfig.viewSettings, ...updates },
          };
          const newState = { ...state, ganttConfig: newConfig };
          debouncedSave(getStorageData(newState));
          return { ganttConfig: newConfig };
        });
      },

      // 筛选配置
      filterConfig: {
        status: null,
        priority: null,
        assignee: null,
        dateRange: null,
        isActive: false,
      },

      setFilterConfig: (config) => {
        set((state) => {
          const newState = { ...state, filterConfig: config };
          debouncedSave(getStorageData(newState));
          return { filterConfig: config };
        });
        get().applyFilters();
      },

      // 排序配置
      sortConfig: {
        field: null,
        direction: 'asc',
        isActive: false,
      },

      setSortConfig: (config) => {
        set((state) => {
          const newState = { ...state, sortConfig: config };
          debouncedSave(getStorageData(newState));
          return { sortConfig: config };
        });
        get().applySorting();
      },

      // 分组配置
      groupBy: 'priority',

      setGroupBy: (field) => {
        set((state) => {
          const newState = { ...state, groupBy: field };
          debouncedSave(getStorageData(newState));
          return { groupBy: field };
        });
        const regroupedData = get().regroupData();
        set({ filteredData: regroupedData });
      },

      // 可见字段 - 初始化为 initialData.fields
      visibleFields: initialData.fields,

      // 表头顺序
      headerOrder: initialData.fields.filter((f) => f.visible).map((f) => f.id),

      setHeaderOrder: (order) => {
        set((state) => {
          const newState = { ...state, headerOrder: order };
          debouncedSave(getStorageData(newState));
          return { headerOrder: order };
        });
      },

      reorderHeaders: (oldIndex, newIndex) => {
        set((state) => {
          const items = Array.from(state.headerOrder);
          const [reorderedItem] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, reorderedItem);

          const newState = { ...state, headerOrder: items };
          debouncedSave(getStorageData(newState));
          return { headerOrder: items };
        });
      },

      setVisibleFields: (fields) => {
        set((state) => {
          // 同时更新 data.fields
          const newData = { ...state.data, fields: fields };
          const newState = { ...state, visibleFields: fields, data: newData };
          debouncedSave(getStorageData(newState));
          return { visibleFields: fields, data: newData };
        });
      },

      setSearchQuery: (query: string) => {
        set((state) => {
          const filtered = filterData(state.data, query, state.filterConfig);
          return {
            searchQuery: query,
            filteredData: filtered,
          };
        });
      },

      filteredData: initialData,

      addTask: (task: Task) => {
        set((state) => {
          const newData = { ...state.data };
          const targetGroupId = task.priority;
          const groupIndex = newData.priorityGroups.findIndex(
            (group) => group.id === targetGroupId,
          );

          // 确保新任务有 fields 属性
          if (!task.fields) {
            task.fields = {};
          }

          if (groupIndex !== -1) {
            newData.priorityGroups[groupIndex].tasks = [
              ...newData.priorityGroups[groupIndex].tasks,
              task,
            ];
          } else if (newData.priorityGroups.length > 0) {
            newData.priorityGroups[0].tasks = [...newData.priorityGroups[0].tasks, task];
          }

          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          // 触发保存
          debouncedSave(getStorageData({ ...state, data: newData }));

          return {
            data: newData,
            filteredData: filtered,
          };
        });
      },

      addMultipleTasks: (tasks: Task[]) => {
        set((state) => {
          const newState = { ...state };
          // Clone data to avoid mutation
          newState.data = JSON.parse(JSON.stringify(state.data));

          tasks.forEach((task) => {
            const priorityGroup = newState.data.priorityGroups.find(
              (group) => group.id === task.priority,
            );

            if (priorityGroup) {
              if (
                !task.id ||
                newState.data.priorityGroups.some((g) => g.tasks.some((t) => t.id === task.id))
              ) {
                task.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              }
              // 确保 fields 存在
              if (!task.fields) {
                task.fields = {};
              }

              priorityGroup.tasks.push(task);
            }
          });

          applyFiltersAndSort(newState);

          // 触发保存
          debouncedSave(getStorageData(newState));

          return newState;
        });
      },

      updateTask: (taskId: string, updates: Partial<Task>) => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data));

          for (const group of newData.priorityGroups) {
            const taskIndex = group.tasks.findIndex((task: Task) => task.id === taskId);
            if (taskIndex !== -1) {
              group.tasks[taskIndex] = { ...group.tasks[taskIndex], ...updates };
              break;
            }
          }

          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          // 触发保存
          debouncedSave(getStorageData({ ...state, data: newData }));

          return {
            data: newData,
            filteredData: filtered,
          };
        });
      },

      userOrder: [],
      setUserOrder: (userIds: string[]) => {
        set((state) => {
          const newState = { ...state, userOrder: userIds };
          debouncedSave(getStorageData(newState));
          return { userOrder: userIds };
        });
      },

      deleteUser: (userId: string) => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data));

          for (const group of newData.priorityGroups) {
            group.tasks = group.tasks.filter((task: Task) => task.assignee?.id !== userId);
          }

          const newUserOrder = state.userOrder.filter((id) => id !== userId);
          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          const newState = { ...state, data: newData, userOrder: newUserOrder };
          debouncedSave(getStorageData(newState));

          return {
            data: newData,
            filteredData: filtered,
            userOrder: newUserOrder,
          };
        });
      },

      reorderUsers: (oldIndex: number, newIndex: number) => {
        set((state) => {
          const newUserOrder = [...state.userOrder];
          const [removed] = newUserOrder.splice(oldIndex, 1);
          newUserOrder.splice(newIndex, 0, removed);

          const newState = { ...state, userOrder: newUserOrder };
          debouncedSave(getStorageData(newState));

          return { userOrder: newUserOrder };
        });
      },

      getSortedUsers: () => {
        const state = get();
        const allUsers = Array.from(
          new Map(
            state.data.priorityGroups
              .flatMap((group) => group.tasks)
              .filter((task) => task.assignee)
              .map((task) => [task.assignee!.id, task.assignee!]),
          ).values(),
        );

        if (state.userOrder.length > 0) {
          const userMap = new Map(allUsers.map((user) => [user.id, user]));
          const orderedUsers = [
            ...state.userOrder.filter((id) => userMap.has(id)).map((id) => userMap.get(id)!),
            ...allUsers.filter((user) => !state.userOrder.includes(user.id)),
          ];
          return orderedUsers;
        }
        return allUsers;
      },

      addUser: (user: User) => {
        set((state) => {
          const existingUsers = state.data.priorityGroups
            .flatMap((group) => group.tasks)
            .map((task) => task.assignee?.id)
            .filter(Boolean) as string[];

          if (existingUsers.includes(user.id)) {
            return state;
          }

          const emptyTask: Task = {
            id: `empty-task-${Date.now()}-${user.id}`,
            fields: {},
            description: '欢迎使用任务管理系统',
            summary: '这是一个示例任务，您可以添加更多任务或删除此任务。',
            assignee: user,
            status: '待开始',
            startDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
            expectedEndDate: undefined,
            actualEndDate: undefined,
            isDelayed: false,
            completed: false,
            priority: '重要紧急',
          };

          const newData = { ...state.data };
          const groupIndex = newData.priorityGroups.findIndex((group) => group.id === '重要紧急');

          if (groupIndex !== -1) {
            newData.priorityGroups[groupIndex].tasks = [
              ...newData.priorityGroups[groupIndex].tasks,
              emptyTask,
            ];
          } else if (newData.priorityGroups.length > 0) {
            newData.priorityGroups[0].tasks = [...newData.priorityGroups[0].tasks, emptyTask];
          }

          const newUserOrder = [...state.userOrder, user.id];
          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          const newState = { ...state, data: newData, userOrder: newUserOrder };
          debouncedSave(getStorageData(newState));

          return {
            data: newData,
            filteredData: filtered,
            userOrder: newUserOrder,
          };
        });
      },

      moveTask: (taskId: string, newStatus: Task['status']) => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data));
          let taskToUpdate: Task | null = null;
          let taskGroup: PriorityGroup | null = null;
          let taskIndex = -1;

          for (const group of newData.priorityGroups) {
            const index = group.tasks.findIndex((task: Task) => task.id === taskId);
            if (index !== -1) {
              taskToUpdate = { ...group.tasks[index] };
              taskGroup = group;
              taskIndex = index;
              break;
            }
          }

          if (taskToUpdate && taskGroup) {
            taskToUpdate.status = newStatus;
            if (newStatus === '已完成') {
              taskToUpdate.completed = true;
              taskToUpdate.actualEndDate = new Date()
                .toISOString()
                .split('T')[0]
                .replace(/-/g, '/');
            } else if (taskToUpdate.status === '已完成') {
              taskToUpdate.completed = false;
              taskToUpdate.actualEndDate = undefined;
            }
            taskGroup.tasks[taskIndex] = taskToUpdate;
          }

          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          // 触发保存
          debouncedSave(getStorageData({ ...state, data: newData }));

          return {
            data: newData,
            filteredData: filtered,
          };
        });
      },

      reorderTasks: (
        priorityGroupId: string,
        oldIndex: number,
        newIndex: number,
        targetGroupId?: string,
      ) => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data));
          const sourceGroupIndex = newData.priorityGroups.findIndex(
            (group: PriorityGroup) => group.id === priorityGroupId,
          );
          if (sourceGroupIndex === -1) return state;

          const [taskToMove] = newData.priorityGroups[sourceGroupIndex].tasks.splice(oldIndex, 1);

          if (targetGroupId && targetGroupId !== priorityGroupId) {
            taskToMove.priority = targetGroupId;
            const targetGroupIndex = newData.priorityGroups.findIndex(
              (group: PriorityGroup) => group.id === targetGroupId,
            );

            if (targetGroupIndex !== -1) {
              const insertAt = Math.min(
                newIndex,
                newData.priorityGroups[targetGroupIndex].tasks.length,
              );
              newData.priorityGroups[targetGroupIndex].tasks.splice(insertAt, 0, taskToMove);
            } else {
              newData.priorityGroups[sourceGroupIndex].tasks.splice(oldIndex, 0, taskToMove);
            }
          } else {
            newData.priorityGroups[sourceGroupIndex].tasks.splice(newIndex, 0, taskToMove);
          }

          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          debouncedSave(getStorageData({ ...state, data: newData }));

          return {
            data: newData,
            filteredData: filtered,
          };
        });
      },

      applyFilters: () => {
        set((state) => {
          const filteredData = filterData(state.data, state.searchQuery, state.filterConfig);
          return { filteredData };
        });
      },

      applySorting: () => {
        set((state) => {
          const sortedData = JSON.parse(JSON.stringify(state.filteredData));
          if (state.sortConfig.isActive && state.sortConfig.field) {
            for (const group of sortedData.priorityGroups) {
              group.tasks = sortTasks(
                group.tasks,
                state.sortConfig.field!,
                state.sortConfig.direction,
              );
            }
          }
          return { filteredData: sortedData };
        });
      },

      regroupData: () => {
        const { data, groupBy, searchQuery, filterConfig } = get();
        if (groupBy === 'priority') {
          return filterData(data, searchQuery, filterConfig);
        }

        const allTasks = data.priorityGroups.flatMap((group) => group.tasks);
        const groupedTasks: Record<string, Task[]> = {};

        allTasks.forEach((task) => {
          let groupKey = '';
          switch (groupBy) {
            case 'status':
              groupKey = task.status || '';
              break;
            case 'assignee':
              groupKey = task.assignee?.name || '';
              break;
            case 'completed':
              groupKey = task.completed ? '已完成' : '进行中';
              break;
            default:
              groupKey = task.priority || '';
          }

          if (!groupedTasks[groupKey]) {
            groupedTasks[groupKey] = [];
          }
          groupedTasks[groupKey].push(task);
        });

        const newGroups: PriorityGroup[] = Object.keys(groupedTasks).map((key) => ({
          id: key,
          name: key,
          tasks: groupedTasks[key],
        }));

        const newData: TaskData = {
          ...data,
          priorityGroups: newGroups,
        };
        return filterData(newData, searchQuery, filterConfig);
      },

      updateFieldWidth: (fieldId: string, width: number) => {
        set((state) => {
          const safeWidth = Math.max(80, width);
          // 更新 visibleFields
          const updatedFields = state.visibleFields.map((field) =>
            field.id === fieldId ? { ...field, width: safeWidth } : field,
          );

          // 同时更新 data.fields
          const currentFields = state.data.fields || state.visibleFields || [];
          const newData = {
            ...state.data,
            fields: currentFields.map((f) => (f.id === fieldId ? { ...f, width: safeWidth } : f)),
          };

          const newState = { ...state, visibleFields: updatedFields, data: newData };
          debouncedSave(getStorageData(newState));

          return { visibleFields: updatedFields, data: newData };
        });
      },

      addField: (field) => {
        set((state) => {
          if (state.visibleFields.some((f) => f.id === field.id)) {
            return state;
          }

          const newField: FieldDefinition = {
            ...field,
            visible: true,
            width: field.width || 150,
            system: false,
          };

          const updatedFields = [...state.visibleFields, newField];
          const updatedHeaderOrder = [...state.headerOrder, field.id];

          // 更新 data.fields
          const currentFields = state.data.fields || state.visibleFields || [];
          const newData = {
            ...state.data,
            fields: [...currentFields, newField],
          };

          const newState = {
            ...state,
            visibleFields: updatedFields,
            headerOrder: updatedHeaderOrder,
            data: newData,
          };
          debouncedSave(getStorageData(newState));

          return {
            visibleFields: updatedFields,
            headerOrder: updatedHeaderOrder,
            data: newData,
          };
        });
      },

      updateFieldType: (fieldId, type) => {
        set((state) => {
          const updatedFields = state.visibleFields.map((field) =>
            field.id === fieldId ? { ...field, type } : field,
          );

          // 更新 data.fields
          const currentFields = state.data.fields || state.visibleFields || [];
          const newData = {
            ...state.data,
            fields: currentFields.map((f) => (f.id === fieldId ? { ...f, type } : f)),
          };

          const newState = { ...state, visibleFields: updatedFields, data: newData };
          debouncedSave(getStorageData(newState));

          return { visibleFields: updatedFields, data: newData };
        });
      },

      updateField: (fieldId, updates) => {
        set((state) => {
          const updatedFields = state.visibleFields.map((field) =>
            field.id === fieldId ? { ...field, ...updates } : field,
          );

          // 更新 data.fields
          const currentFields = state.data.fields || state.visibleFields || [];
          const newData = {
            ...state.data,
            fields: currentFields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
          };

          const newState = { ...state, visibleFields: updatedFields, data: newData };
          debouncedSave(getStorageData(newState));

          return { visibleFields: updatedFields, data: newData };
        });
      },

      deleteField: (fieldId) => {
        set((state) => {
          // 不能删除系统字段
          const field = state.visibleFields.find((f) => f.id === fieldId);
          if (field && field.system) {
            return state;
          }

          const updatedFields = state.visibleFields.filter((f) => f.id !== fieldId);
          const updatedHeaderOrder = state.headerOrder.filter((id) => id !== fieldId);

          const currentFields = state.data.fields || state.visibleFields || [];
          const newData = {
            ...state.data,
            fields: currentFields.filter((f) => f.id !== fieldId),
          };

          const newState = {
            ...state,
            visibleFields: updatedFields,
            headerOrder: updatedHeaderOrder,
            data: newData,
          };
          debouncedSave(getStorageData(newState));

          return {
            visibleFields: updatedFields,
            headerOrder: updatedHeaderOrder,
            data: newData,
          };
        });
      },

      updateTaskCustomField: (taskId, fieldId, value) => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data));

          for (const group of newData.priorityGroups) {
            const taskIndex = group.tasks.findIndex((task: Task) => task.id === taskId);
            if (taskIndex !== -1) {
              if (!group.tasks[taskIndex].customFields) {
                group.tasks[taskIndex].customFields = {};
              }
              group.tasks[taskIndex].customFields[fieldId] = {
                type: state.visibleFields.find((f) => f.id === fieldId)?.type || 'Text',
                value: value,
              };
              // 同时更新 fields 属性
              if (!group.tasks[taskIndex].fields) {
                group.tasks[taskIndex].fields = {};
              }
              group.tasks[taskIndex].fields[fieldId] = value;

              break;
            }
          }

          const filtered = filterData(newData, state.searchQuery, state.filterConfig);

          debouncedSave(getStorageData({ ...state, data: newData }));

          return {
            data: newData,
            filteredData: filtered,
          };
        });
      },

      applyTemplateDefaults: (defaults) => {
        const { visibleFields, headerOrder, table, filter } = defaults;
        set((state) => {
          let newState = { ...state };
          if (visibleFields && visibleFields.length) {
            newState.visibleFields = visibleFields;
            newState.data = { ...newState.data, fields: visibleFields };
          }
          if (headerOrder && headerOrder.length) {
            newState.headerOrder = headerOrder;
          }
          if (table?.groupBy) {
            newState.groupBy = table.groupBy;
          }
          if (table?.sortBy) {
            newState.sortConfig = {
              field: table.sortBy,
              direction: state.sortConfig.direction,
              isActive: true,
            };
          }
          if (filter) {
            newState.filterConfig = { ...state.filterConfig, ...filter, isActive: true };
          }
          if (table?.rowHeight !== undefined || table?.headerDraggable !== undefined) {
            newState.viewConfig = { ...newState.viewConfig };
            if (table?.rowHeight !== undefined) newState.viewConfig.rowHeight = table.rowHeight!;
            if (table?.headerDraggable !== undefined)
              newState.viewConfig.headerDraggable = !!table.headerDraggable;
          }

          // Apply side effects like sorting/filtering after state update
          // But here we just return new state
          debouncedSave(getStorageData(newState));
          return newState;
        });

        // Trigger re-calculations
        if (defaults.table?.sortBy) get().applySorting();
        if (defaults.filter) get().applyFilters();
        if (defaults.table?.groupBy) {
          const regroupedData = get().regroupData();
          set({ filteredData: regroupedData });
        }
      },

      applyViewConfigFromTemplate: (view) => {
        set((state) => {
          let newState = { ...state };

          if (view.groupBy) {
            newState.groupBy = view.groupBy;
          }
          if (view.sort) {
            const { field, direction, isActive } = view.sort;
            newState.sortConfig = {
              field: field ?? null,
              direction: direction ?? state.sortConfig.direction,
              isActive: isActive ?? !!field,
            };
          }
          if (view.filter) {
            newState.filterConfig = { ...state.filterConfig, ...view.filter, isActive: true };
          }
          if (view.rowHeight !== undefined || view.headerDraggable !== undefined) {
            newState.viewConfig = { ...newState.viewConfig };
            if (view.rowHeight !== undefined) newState.viewConfig.rowHeight = view.rowHeight!;
            if (view.headerDraggable !== undefined)
              newState.viewConfig.headerDraggable = !!view.headerDraggable;
          }

          debouncedSave(getStorageData(newState));
          return newState;
        });

        // Trigger side effects
        if (view.groupBy) {
          const regroupedData = get().regroupData();
          set({ filteredData: regroupedData });
        }
        if (view.sort) get().applySorting();
        if (view.filter) get().applyFilters();
      },

      saveCurrentView: (name) => {
        const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => {
          const config = {
            groupBy: state.groupBy,
            sort: { ...state.sortConfig },
            filter: { ...state.filterConfig },
            rowHeight: state.viewConfig.rowHeight,
            headerDraggable: state.viewConfig.headerDraggable,
          };
          const newViews = [...state.views, { id, name, config }];
          const newState = { ...state, views: newViews };
          debouncedSave(getStorageData(newState));
          return { views: newViews };
        });
        return id;
      },

      applySavedView: (id) => {
        const view = get().views.find((v) => v.id === id);
        if (!view) return;
        get().applyViewConfigFromTemplate(view.config);
      },

      renameView: (id, name) => {
        set((state) => {
          const newViews = state.views.map((v) => (v.id === id ? { ...v, name } : v));
          const newState = { ...state, views: newViews };
          debouncedSave(getStorageData(newState));
          return { views: newViews };
        });
      },

      deleteView: (id) => {
        set((state) => {
          const newViews = state.views.filter((v) => v.id !== id);
          const newDefaultId = state.defaultViewId === id ? null : state.defaultViewId;

          const newState = { ...state, views: newViews, defaultViewId: newDefaultId };
          debouncedSave(getStorageData(newState));

          return {
            views: newViews,
            defaultViewId: newDefaultId,
          };
        });
      },

      setDefaultView: (id) => {
        const exists = get().views.some((v) => v.id === id);
        if (!exists) return;
        set((state) => {
          const newState = { ...state, defaultViewId: id };
          debouncedSave(getStorageData(newState));
          return { defaultViewId: id };
        });
      },
    }),
    {
      name: 'task-management-storage',
      partialize: (state) => ({
        data: state.data,
        viewConfig: state.viewConfig,
        filterConfig: state.filterConfig,
        sortConfig: state.sortConfig,
        groupBy: state.groupBy,
        visibleFields: state.visibleFields,
        userOrder: state.userOrder,
        headerOrder: state.headerOrder,
        ganttConfig: state.ganttConfig,
        views: state.views,
        defaultViewId: state.defaultViewId,
      }),
    },
  ),
);

// 筛选数据函数
function filterData(data: TaskData, query: string, filterConfig: FilterConfig): TaskData {
  const filteredData = JSON.parse(JSON.stringify(data));
  const lowerQuery = query.toLowerCase();

  // 应用搜索查询
  filteredData.priorityGroups = filteredData.priorityGroups.map((group: PriorityGroup) => ({
    ...group,
    tasks: group.tasks.filter(
      (task: Task) =>
        (task.description || '').toLowerCase().includes(lowerQuery) ||
        (task.assignee?.name || '').toLowerCase().includes(lowerQuery) ||
        (task.summary || '').toLowerCase().includes(lowerQuery) ||
        (task.status || '').toLowerCase().includes(lowerQuery) ||
        (task.priority || '').toLowerCase().includes(lowerQuery),
    ),
  }));

  // 如果没有激活筛选，直接返回
  if (!filterConfig.isActive) {
    return filteredData;
  }

  // 应用筛选条件
  filteredData.priorityGroups = filteredData.priorityGroups.map((group: PriorityGroup) => ({
    ...group,
    tasks: group.tasks.filter((task: Task) => {
      // 状态筛选
      if (filterConfig.status && task.status !== filterConfig.status) {
        return false;
      }

      // 优先级筛选
      if (filterConfig.priority && task.priority !== filterConfig.priority) {
        return false;
      }

      // 执行人筛选
      if (filterConfig.assignee && task.assignee?.id !== filterConfig.assignee) {
        return false;
      }

      // 日期范围筛选
      if (filterConfig.dateRange && task.startDate) {
        const taskDate = new Date(task.startDate.replace(/\//g, '-'));
        const startDate = filterConfig.dateRange.start
          ? new Date(filterConfig.dateRange.start)
          : null;
        const endDate = filterConfig.dateRange.end ? new Date(filterConfig.dateRange.end) : null;

        if (startDate && taskDate < startDate) {
          return false;
        }

        if (endDate && taskDate > endDate) {
          return false;
        }
      }

      return true;
    }),
  }));

  return filteredData;
}

// 辅助函数：排序任务
function sortTasks(tasks: Task[], field: string, direction: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    let valueA, valueB;

    // 根据字段获取值
    switch (field) {
      case 'description':
        valueA = a.description || '';
        valueB = b.description || '';
        break;
      case 'assignee':
        valueA = a.assignee?.name || '';
        valueB = b.assignee?.name || '';
        break;
      case 'status':
        valueA = a.status || '';
        valueB = b.status || '';
        break;
      case 'startDate':
        valueA = a.startDate ? new Date(a.startDate.replace(/\//g, '-')).getTime() : 0;
        valueB = b.startDate ? new Date(b.startDate.replace(/\//g, '-')).getTime() : 0;
        break;
      case 'expectedEndDate':
        valueA = a.expectedEndDate
          ? new Date(a.expectedEndDate.replace(/\//g, '-')).getTime()
          : Number.POSITIVE_INFINITY;
        valueB = b.expectedEndDate
          ? new Date(b.expectedEndDate.replace(/\//g, '-')).getTime()
          : Number.POSITIVE_INFINITY;
        break;
      case 'actualEndDate':
        valueA = a.actualEndDate
          ? new Date(a.actualEndDate.replace(/\//g, '-')).getTime()
          : Number.POSITIVE_INFINITY;
        valueB = b.actualEndDate
          ? new Date(b.actualEndDate.replace(/\//g, '-')).getTime()
          : Number.POSITIVE_INFINITY;
        break;
      case 'completed':
        valueA = a.completed ? 1 : 0;
        valueB = b.completed ? 1 : 0;
        break;
      default:
        // 处理自定义字段 - 优先尝试从 customFields 获取，然后从 fields 获取，最后尝试直接属性
        if (field.startsWith('custom_')) {
          valueA = a.customFields?.[field]?.value || a.fields?.[field] || '';
          valueB = b.customFields?.[field]?.value || b.fields?.[field] || '';
        } else {
          valueA = (a as any)[field] || a.fields?.[field] || '';
          valueB = (b as any)[field] || b.fields?.[field] || '';
        }
    }

    // 比较值
    if (valueA < valueB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function applyFiltersAndSort(state: any) {
  const filteredData = filterData(state.data, state.searchQuery, state.filterConfig);
  state.filteredData = JSON.parse(JSON.stringify(filteredData));

  if (state.sortConfig.isActive && state.sortConfig.field) {
    for (const group of state.filteredData.priorityGroups) {
      group.tasks = sortTasks(group.tasks, state.sortConfig.field!, state.sortConfig.direction);
    }
  }
}
