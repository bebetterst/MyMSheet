'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import {
  format,
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isWeekend,
  differenceInBusinessDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TaskDetail } from '@/components/task-detail';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Settings,
  ZoomIn,
  ZoomOut,
  BarChart2,
  Printer,
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { GanttConfigurationDialog } from '@/components/gantt/gantt-configuration-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// 常量定义
const HEADER_HEIGHT = 80; // 增加头部高度以容纳两行
const TASK_HEIGHT = 56; // 任务行高度 (包含间距)
const BAR_HEIGHT = 28; // 甘特图条高度
const TASK_GAP = 0; // 既然 TASK_HEIGHT 包含了间距，这里设为0或者移除
const SIDEBAR_WIDTH = 260;
const MIN_COLUMN_WIDTH = 30;

// 辅助函数：格式化显示值
const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    // 处理用户对象
    if (value.name) return value.name;
    // 处理包含 label/title/text 的对象
    if (value.label) return value.label;
    if (value.title) return value.title;
    if (value.text) return value.text;
    // 处理数组
    if (Array.isArray(value)) {
      return value.map((item) => formatDisplayValue(item)).join(', ');
    }
    // 降级处理
    return JSON.stringify(value);
  }

  return String(value);
};

export function GanttView() {
  const { data, ganttConfig, updateGanttViewSettings, addTask } = useTaskStore();
  const { fieldMapping, viewSettings } = ganttConfig;

  // 状态管理
  const [selectedTask, setSelectedTask] = useState<string | null>(null); // 控制弹窗
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null); // 控制高亮
  const [configOpen, setConfigOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 处理缩放
  const handleZoom = (delta: number) => {
    const newZoom = Math.min(200, Math.max(50, viewSettings.zoomLevel + delta));
    updateGanttViewSettings({ zoomLevel: newZoom });
  };

  // 计算列宽
  const columnWidth = useMemo(() => {
    const baseWidth =
      viewSettings.timeScale === 'year'
        ? 100
        : viewSettings.timeScale === 'quarter'
          ? 80
          : viewSettings.timeScale === 'month'
            ? 60
            : viewSettings.timeScale === 'week'
              ? 40
              : 50;
    return Math.max(MIN_COLUMN_WIDTH, (baseWidth * viewSettings.zoomLevel) / 100);
  }, [viewSettings.timeScale, viewSettings.zoomLevel]);

  // 获取任务数据并处理分组
  const { processedTasks, groups } = useMemo(() => {
    let allTasks = data.priorityGroups.flatMap((group) => group.tasks);

    // 搜索过滤
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      allTasks = allTasks.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(lowerQuery) ||
          (t.assignee?.name || '').toLowerCase().includes(lowerQuery),
      );
    }

    // 分组逻辑
    const groupField = fieldMapping.group;
    if (!groupField || groupField === 'none') {
      return {
        processedTasks: allTasks,
        groups: [{ id: 'all', name: '所有任务', tasks: allTasks }],
      };
    }

    // 按字段分组
    const grouped: Record<string, typeof allTasks> = {};
    allTasks.forEach((task) => {
      let groupKey = '未分组';
      // 尝试获取分组值
      if (groupField === 'priority') groupKey = task.priority || '未分组';
      else if (groupField === 'status') groupKey = task.status || '未分组';
      else if (groupField === 'assignee') groupKey = task.assignee?.name || '未分配';
      else {
        // 尝试从 fields 或 customFields 获取
        groupKey = task.fields?.[groupField] || '未分组';
      }

      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(task);
    });

    const groupList = Object.entries(grouped).map(([name, tasks]) => ({
      id: name,
      name,
      tasks,
    }));

    return { processedTasks: allTasks, groups: groupList };
  }, [data, fieldMapping.group, searchQuery]);

  // 计算时间范围
  const { startDate, endDate, periods } = useMemo(() => {
    // 获取所有任务的日期范围
    const dates = processedTasks
      .flatMap((t) => {
        const d = [];
        // 使用配置的字段获取日期
        const startStr = (t as any)[fieldMapping.startDate] || t.fields?.[fieldMapping.startDate];
        const endStr = (t as any)[fieldMapping.endDate] || t.fields?.[fieldMapping.endDate];

        if (startStr) d.push(new Date(startStr.replace(/\//g, '-')));
        if (endStr) d.push(new Date(endStr.replace(/\//g, '-')));
        return d;
      })
      .filter((d) => !isNaN(d.getTime()));

    let start = new Date();
    let end = addDays(start, 30);

    if (dates.length > 0) {
      // 过滤掉无效日期 (如 1970年) 和极端异常日期
      const validDates = dates.filter((d) => d.getFullYear() > 2000 && d.getFullYear() < 2100);

      if (validDates.length > 0) {
        const minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));

        // 根据不同的时间刻度设置不同的前后缓冲
        switch (viewSettings.timeScale) {
          case 'year':
            start = startOfYear(minDate);
            end = endOfYear(maxDate);
            break;
          case 'quarter':
            start = startOfQuarter(addQuarters(minDate, -1));
            end = endOfQuarter(addQuarters(maxDate, 1));
            break;
          case 'month':
            start = startOfMonth(addMonths(minDate, -1));
            end = endOfMonth(addMonths(maxDate, 1));
            break;
          case 'week':
            start = startOfWeek(addWeeks(minDate, -1), { weekStartsOn: 1 });
            end = endOfWeek(addWeeks(maxDate, 1), { weekStartsOn: 1 });
            break;
          default: // day
            // 日视图下，只向前缓冲3天，避免过多的空白
            start = addDays(minDate, -3);
            // 结束时间向后缓冲7天
            end = addDays(maxDate, 7);

            // 确保至少有两周的显示范围
            if (differenceInDays(end, start) < 14) {
              end = addDays(start, 14);
            }
        }
      } else {
        // 如果所有日期都无效，回退到当前周
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
      }
    } else {
      // 尝试自动查找可能的日期字段
      const sampleTask = processedTasks[0];
      if (sampleTask) {
        // 简单的启发式查找
        const dateFields = ['startDate', 'start_date', 'created_at', 'date'];
        let foundDate = null;

        for (const field of dateFields) {
          const val = (sampleTask as any)[field] || sampleTask.fields?.[field];
          if (val) {
            const d = new Date(val.replace?.(/\//g, '-') || val);
            if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
              foundDate = d;
              break;
            }
          }
        }

        if (foundDate) {
          start = startOfWeek(foundDate, { weekStartsOn: 1 });
          end = endOfWeek(foundDate, { weekStartsOn: 1 });
        } else {
          start = startOfWeek(new Date(), { weekStartsOn: 1 });
          end = endOfWeek(new Date(), { weekStartsOn: 1 });
        }
      } else {
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
      }
    }

    // 生成时间段
    let current = start;
    const periods = [];

    while (current <= end) {
      // 在日视图且不显示周末时，跳过周末
      if (viewSettings.timeScale === 'day' && !viewSettings.showWeekend && isWeekend(current)) {
        current = addDays(current, 1);
        continue;
      }

      periods.push(current);
      switch (viewSettings.timeScale) {
        case 'year':
          current = addYears(current, 1);
          break;
        case 'quarter':
          current = addQuarters(current, 1);
          break;
        case 'month':
          current = addMonths(current, 1);
          break;
        case 'week':
          current = addWeeks(current, 1);
          break;
        default:
          current = addDays(current, 1);
      }
    }

    return { startDate: start, endDate: end, periods };
  }, [
    processedTasks,
    fieldMapping.startDate,
    fieldMapping.endDate,
    viewSettings.timeScale,
    viewSettings.showWeekend,
  ]);

  // 计算任务位置和渲染数据
  const renderData = useMemo(() => {
    let currentTop = 0;
    const rows: any[] = [];

    groups.forEach((group) => {
      // 组标题行
      const isExpanded = expandedGroups[group.id] !== false; // 默认展开

      const GROUP_HEIGHT = 40; // 分组行不需要那么高

      rows.push({
        type: 'group',
        id: group.id,
        name: group.name,
        top: currentTop,
        count: group.tasks.length,
        expanded: isExpanded,
        height: GROUP_HEIGHT,
      });

      currentTop += GROUP_HEIGHT;

      if (isExpanded) {
        group.tasks.forEach((task) => {
          // 获取任务时间
          const startStr =
            (task as any)[fieldMapping.startDate] || task.fields?.[fieldMapping.startDate];
          const endStr = (task as any)[fieldMapping.endDate] || task.fields?.[fieldMapping.endDate];

          if (!startStr || !endStr) {
            // 即使没有时间也占位
            rows.push({
              type: 'task',
              data: task,
              top: currentTop,
              hasDates: false,
            });
            currentTop += TASK_HEIGHT;
            return;
          }

          const taskStart = new Date(startStr.replace(/\//g, '-'));
          const taskEnd = new Date(endStr.replace(/\//g, '-'));

          if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) {
            rows.push({ type: 'task', data: task, top: currentTop, hasDates: false });
            currentTop += TASK_HEIGHT;
            return;
          }

          // 计算位置
          let offsetUnits = 0;
          let durationUnits = 0;

          switch (viewSettings.timeScale) {
            case 'year': // 简单按天比例
              offsetUnits = differenceInDays(taskStart, startDate) / 365;
              durationUnits = (differenceInDays(taskEnd, taskStart) + 1) / 365;
              break;
            case 'quarter': // 简单按天比例
              offsetUnits = differenceInDays(taskStart, startDate) / 90;
              durationUnits = (differenceInDays(taskEnd, taskStart) + 1) / 90;
              break;
            case 'month': // 简单按天比例
              offsetUnits = differenceInDays(taskStart, startDate) / 30;
              durationUnits = (differenceInDays(taskEnd, taskStart) + 1) / 30;
              break;
            case 'week':
              offsetUnits = differenceInDays(taskStart, startDate) / 7;
              durationUnits = (differenceInDays(taskEnd, taskStart) + 1) / 7;
              break;
            default: // day
              if (!viewSettings.showWeekend) {
                // 如果不显示周末，使用工作日差值
                offsetUnits = differenceInBusinessDays(taskStart, startDate);
                // differenceInBusinessDays 不包含结束日期，所以如果是同一天会返回0
                // 我们需要包含两端，但要注意 date-fns 的逻辑
                // 另外，differenceInBusinessDays 会排除周六周日

                // 如果开始时间是周末，date-fns 会将其调整到最近的工作日计算，这可能导致偏差
                // 这里简单处理：如果任务跨越了周末，它的宽度应该只包含工作日
                durationUnits = differenceInBusinessDays(addDays(taskEnd, 1), taskStart);

                // 修正：如果 start 在 end 之后（例如同一天），differenceInBusinessDays 可能为0
                if (durationUnits < 1 && taskStart <= taskEnd) durationUnits = 1;
              } else {
                offsetUnits = differenceInDays(taskStart, startDate);
                durationUnits = differenceInDays(taskEnd, taskStart) + 1;
              }
          }

          rows.push({
            type: 'task',
            data: task,
            top: currentTop,
            left: offsetUnits * columnWidth,
            width: Math.max(durationUnits * columnWidth, 20), // 最小宽度
            hasDates: true,
          });

          currentTop += TASK_HEIGHT;
        });
      }
    });

    return { rows, totalHeight: currentTop + TASK_HEIGHT };
  }, [groups, expandedGroups, fieldMapping, startDate, viewSettings.timeScale, columnWidth]);

  // 处理分组切换
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === false ? true : false,
    }));
  };

  // 依赖线计算 (简化版，仅连接当前可见任务)
  const dependencyLines = useMemo(() => {
    if (!fieldMapping.dependencies || fieldMapping.dependencies === 'none') return [];

    const lines: React.ReactNode[] = [];
    const taskMap = new Map(
      renderData.rows.filter((r) => r.type === 'task' && r.hasDates).map((r) => [r.data.id, r]),
    );

    renderData.rows.forEach((row) => {
      if (row.type !== 'task' || !row.hasDates) return;

      const depField = fieldMapping.dependencies;
      if (!depField) return;

      const deps = (row.data as any)[depField] || row.data.fields?.[depField];
      if (!deps || !Array.isArray(deps)) return;

      deps.forEach((depId: string) => {
        const depTask = taskMap.get(depId);
        if (!depTask) return;

        const startX = depTask.left + depTask.width;
        const startY = depTask.top + TASK_HEIGHT / 2;

        const endX = row.left;
        const endY = row.top + TASK_HEIGHT / 2;

        // 贝塞尔曲线
        const path = `M ${startX} ${startY} 
                      C ${startX + 20} ${startY}, ${endX - 20} ${endY}, ${endX} ${endY}`;

        lines.push(
          <path
            key={`${depId}-${row.data.id}`}
            d={path}
            stroke="#94a3b8"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#arrowhead)"
            className="opacity-50 hover:opacity-100 transition-opacity"
          />,
        );
      });
    });
    return lines;
  }, [renderData.rows, fieldMapping.dependencies]);

  // 快速添加任务
  const handleAddTask = () => {
    const newTask = {
      id: `task-${Date.now()}`,
      description: '新任务',
      status: '待开始',
      priority: '重要紧急',
      startDate: format(new Date(), 'yyyy/MM/dd'),
      expectedEndDate: format(addDays(new Date(), 3), 'yyyy/MM/dd'),
      fields: {},
      assignee: undefined,
    };
    addTask(newTask);
    setSelectedTask(newTask.id);
  };

  const totalWidth = periods.length * columnWidth;

  // 处理滚动到起点/终点
  const scrollToStart = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToEnd = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: totalWidth, behavior: 'smooth' });
    }
  };

  // 辅助函数：获取进度值
  const getTaskProgress = (task: any) => {
    const progressField = fieldMapping.progress;
    if (!progressField || progressField === 'none') return null;

    let val =
      task[progressField] ??
      task.fields?.[progressField] ??
      task.customFields?.[progressField]?.value;
    if (typeof val === 'object' && val !== null && 'value' in val) val = val.value;

    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
  };

  // 滚动到指定任务
  const scrollToTask = (taskId: string) => {
    setHighlightedTask(taskId); // 设置高亮
    const taskRow = renderData.rows.find(
      (r) => r.type === 'task' && r.data.id === taskId && r.hasDates,
    );
    if (taskRow && scrollContainerRef.current) {
      // 计算目标位置，将任务置于视口中间或偏左位置
      // taskRow.left 是相对于内容区域的偏移
      // 减去一些 padding 使得任务不贴边
      const targetLeft = Math.max(0, taskRow.left - 100);
      scrollContainerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  };

  // 处理滚动事件，更新滚动位置
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // 移除了 JS 状态更新，改用 CSS sticky
  };

  return (
    <div className="flex h-full flex-col bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md bg-white shadow-sm">
            <span className="px-2 text-xs font-medium text-gray-500 border-r">时间刻度:</span>
            <Select
              value={viewSettings.timeScale}
              onValueChange={(v: any) => updateGanttViewSettings({ timeScale: v })}
            >
              <SelectTrigger className="h-8 border-0 focus:ring-0 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日</SelectItem>
                <SelectItem value="week">周</SelectItem>
                <SelectItem value="month">月</SelectItem>
                <SelectItem value="quarter">季</SelectItem>
                <SelectItem value="year">年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center border rounded-md bg-white shadow-sm h-8 px-2 gap-2">
            <ZoomOut
              className="h-4 w-4 text-gray-500 cursor-pointer hover:text-blue-600"
              onClick={() => handleZoom(-10)}
            />
            <span className="text-xs w-8 text-center">{viewSettings.zoomLevel}%</span>
            <ZoomIn
              className="h-4 w-4 text-gray-500 cursor-pointer hover:text-blue-600"
              onClick={() => handleZoom(10)}
            />
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              className="h-8 pl-8 w-40 bg-white"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Switch
              id="show-weekend"
              checked={viewSettings.showWeekend}
              disabled={viewSettings.timeScale !== 'day'}
              onCheckedChange={(c) => updateGanttViewSettings({ showWeekend: c })}
            />
            <Label htmlFor="show-weekend" className="text-xs">
              周末
            </Label>
          </div>

          <div className="flex items-center gap-2 mr-4">
            <Switch
              id="show-today"
              checked={viewSettings.showToday}
              onCheckedChange={(c) => updateGanttViewSettings({ showToday: c })}
            />
            <Label htmlFor="show-today" className="text-xs">
              今日
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" />
            配置
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleAddTask}
          >
            <Plus className="h-3.5 w-3.5" />
            添加记录
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧列表 */}
        <div
          className="border-r bg-white z-10 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="h-[60px] border-b flex items-center px-4 font-medium text-sm bg-gray-50 text-gray-700">
            任务列表 ({processedTasks.length})
          </div>
          <ScrollArea className="flex-1">
            <div className="relative" style={{ height: renderData.totalHeight }}>
              {renderData.rows.map((row) => {
                if (row.type === 'group') {
                  return (
                    <div
                      key={`group-${row.id}`}
                      className="absolute w-full flex items-center px-2 bg-gray-50/80 border-b border-t text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                      style={{ top: row.top, height: row.height || 40 }}
                      onClick={() => toggleGroup(row.id)}
                    >
                      {row.expanded ? (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mr-1" />
                      )}
                      {row.name}
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">
                        {row.count}
                      </Badge>
                    </div>
                  );
                } else {
                  // 任务行
                  return (
                    <div
                      key={`list-${row.data.id}`}
                      className={cn(
                        'absolute w-full flex items-center px-4 hover:bg-gray-50/80 cursor-pointer border-b border-dashed border-gray-100 group transition-colors',
                        highlightedTask === row.data.id && 'bg-blue-50/80 text-blue-700',
                      )}
                      style={{ top: row.top, height: TASK_HEIGHT }}
                      onClick={() => scrollToTask(row.data.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate font-medium flex items-center justify-between">
                          <span className="truncate">
                            {formatDisplayValue(
                              row.data[fieldMapping.title] || row.data.description || '无标题',
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(row.data.id);
                            }}
                            title="查看详情"
                          >
                            <Maximize2 className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                          </Button>
                        </div>
                        <div className="flex flex-col w-full mt-0.5 gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 truncate">
                              {row.data.assignee?.name || '未分配'}
                            </span>
                            {row.data.status && (
                              <span
                                className={cn(
                                  'text-[10px] px-1 rounded',
                                  row.data.status === '已完成'
                                    ? 'bg-green-100 text-green-700'
                                    : row.data.status === '进行中'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600',
                                )}
                              >
                                {row.data.status}
                              </span>
                            )}
                          </div>
                          {/* 进度条显示 */}
                          {(() => {
                            const progress = getTaskProgress(row.data);
                            if (progress !== null) {
                              return (
                                <div className="flex items-center gap-2 w-full">
                                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-300 rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 min-w-[24px] text-right">
                                    {progress}%
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧甘特图 */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* 快速导航按钮 - 左侧 */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-4 top-[90px] z-40 h-8 w-8 rounded-full shadow-md bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 opacity-80 hover:opacity-100 transition-all"
            title="滚动到开始"
            onClick={scrollToStart}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* 快速导航按钮 - 右侧 */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-4 top-[90px] z-40 h-8 w-8 rounded-full shadow-md bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 opacity-80 hover:opacity-100 transition-all"
            title="滚动到结束"
            onClick={scrollToEnd}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <ScrollArea
            className="h-full w-full"
            orientation="both"
            viewportRef={scrollContainerRef}
            onScroll={handleScroll}
          >
            <div
              className="relative"
              style={{ width: totalWidth, height: Math.max(renderData.totalHeight, 500) }}
            >
              {/* 背景网格 */}
              <div className="absolute inset-0 flex pointer-events-none">
                {periods.map((period, i) => {
                  const isWeekend = period.getDay() === 0 || period.getDay() === 6;
                  const isToday = isSameDay(period, new Date());

                  // 在 periods 生成阶段已经过滤了周末，所以这里不需要再过滤

                  return (
                    <div
                      key={i}
                      className={cn(
                        'h-full border-r border-gray-100/50',
                        viewSettings.showWeekend &&
                          isWeekend &&
                          viewSettings.timeScale === 'day' &&
                          'bg-slate-50/60',
                        viewSettings.showToday &&
                          isToday &&
                          viewSettings.timeScale === 'day' &&
                          'bg-blue-50/30',
                      )}
                      style={{ width: columnWidth, minWidth: columnWidth }}
                    />
                  );
                })}
              </div>

              {/* 时间轴头 - 双层结构 */}
              <div
                className="sticky top-0 z-30 flex flex-col bg-white border-b shadow-sm"
                style={{ height: HEADER_HEIGHT }}
              >
                {/* 第一层：年份/月份/季度 */}
                <div className="flex border-b border-gray-100 h-8 items-center bg-gray-50/30 text-xs text-gray-500 font-medium">
                  {(() => {
                    const groups: { label: string; width: number }[] = [];
                    let currentLabel = '';
                    let currentCount = 0;

                    periods.forEach((period) => {
                      let label = '';
                      if (viewSettings.timeScale === 'day')
                        label = format(period, 'yyyy年 M月', { locale: zhCN });
                      else if (viewSettings.timeScale === 'week')
                        label = format(period, 'yyyy年 M月', { locale: zhCN });
                      else if (viewSettings.timeScale === 'month')
                        label = format(period, 'yyyy年', { locale: zhCN });
                      else if (viewSettings.timeScale === 'quarter')
                        label = format(period, 'yyyy年', { locale: zhCN });
                      else label = ''; // 年视图不需要顶层

                      if (label !== currentLabel) {
                        if (currentLabel) {
                          groups.push({ label: currentLabel, width: currentCount * columnWidth });
                        }
                        currentLabel = label;
                        currentCount = 1;
                      } else {
                        currentCount++;
                      }
                    });
                    if (currentLabel) {
                      groups.push({ label: currentLabel, width: currentCount * columnWidth });
                    }

                    return groups.map((g, i) => {
                      return (
                        <div
                          key={i}
                          className="relative border-r border-gray-100 h-full flex-shrink-0"
                          style={{
                            width: g.width,
                          }}
                        >
                          <span
                            className="sticky left-0 px-2 flex items-center h-full whitespace-nowrap z-10"
                            style={{ display: 'inline-flex' }}
                          >
                            {g.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 第二层：具体日期/周/月 */}
                <div className="flex flex-1">
                  {periods.map((period, i) => {
                    const isWeekend = period.getDay() === 0 || period.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex flex-col items-center justify-center border-r border-gray-100 text-xs text-gray-600 bg-white h-full',
                          isWeekend && viewSettings.timeScale === 'day' && 'bg-slate-50/60',
                        )}
                        style={{ width: columnWidth, minWidth: columnWidth }}
                      >
                        <span className="font-medium scale-90">
                          {viewSettings.timeScale === 'year'
                            ? format(period, 'yyyy')
                            : viewSettings.timeScale === 'month'
                              ? format(period, 'MMM')
                              : format(period, 'd')}
                        </span>
                        <span className="text-[10px] text-gray-400 scale-75 transform origin-center">
                          {viewSettings.timeScale === 'day'
                            ? format(period, 'EEE', { locale: zhCN })
                            : viewSettings.timeScale === 'week'
                              ? `W${format(period, 'w')}`
                              : viewSettings.timeScale === 'year'
                                ? ''
                                : format(period, 'yyyy')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 依赖线层 */}
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{ top: HEADER_HEIGHT }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                  </marker>
                </defs>
                {dependencyLines}
              </svg>

              {/* 任务条层 */}
              <div className="relative z-20" style={{ marginTop: 0 }}>
                {renderData.rows.map((row) => {
                  if (row.type === 'group') return null; // 分组行在左侧处理
                  if (!row.hasDates) return null; // 无日期的任务不显示在甘特图中

                  return (
                    <div
                      key={row.data.id}
                      className={cn(
                        'absolute rounded shadow-sm border px-2 text-xs cursor-pointer transition-all hover:shadow-md flex items-center gap-2 group',
                        // 颜色逻辑
                        row.data.priority === '重要紧急'
                          ? 'bg-red-100 border-red-200 text-red-800'
                          : row.data.priority === '紧急不重要'
                            ? 'bg-orange-100 border-orange-200 text-orange-800'
                            : 'bg-blue-100 border-blue-200 text-blue-800',
                        // 选中高亮
                        highlightedTask === row.data.id &&
                          'ring-2 ring-gray-400/50 ring-offset-1 z-30 shadow-md',
                      )}
                      style={{
                        left: row.left,
                        top: row.top + HEADER_HEIGHT + (TASK_HEIGHT - BAR_HEIGHT) / 2,
                        width: row.width,
                        height: BAR_HEIGHT,
                      }}
                      onClick={() => setHighlightedTask(row.data.id)}
                    >
                      <div className="flex-1 truncate font-medium">
                        {formatDisplayValue(row.data[fieldMapping.title] || row.data.description)}
                      </div>

                      {/* 拖拽手柄 (视觉) */}
                      <div className="w-1 h-full absolute right-0 top-0 cursor-e-resize hover:bg-black/10" />
                      <div className="w-1 h-full absolute left-0 top-0 cursor-w-resize hover:bg-black/10" />

                      {/* 进度值显示 (右侧) */}
                      {(() => {
                        const progress = getTaskProgress(row.data);
                        if (progress !== null && progress > 0) {
                          return (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium opacity-90 tabular-nums">
                              {progress}%
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* 详情弹出层 */}
                      {highlightedTask === row.data.id && (
                        <div
                          className="absolute left-0 bottom-full mb-2 z-50 w-max max-w-xs bg-white rounded-lg shadow-xl border border-gray-200 p-3 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 箭头 */}
                          <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45" />

                          <div className="relative space-y-2">
                            {/* 标题 */}
                            <div className="font-semibold text-sm text-gray-900 break-words">
                              {formatDisplayValue(
                                row.data[fieldMapping.title] || row.data.description || '无标题',
                              )}
                            </div>

                            {/* 日期和进度 */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                              <span>
                                {(() => {
                                  const start =
                                    row.data[fieldMapping.startDate] ||
                                    row.data.fields?.[fieldMapping.startDate];
                                  const end =
                                    row.data[fieldMapping.endDate] ||
                                    row.data.fields?.[fieldMapping.endDate];
                                  if (!start && !end) return '无日期';
                                  const s = start
                                    ? format(new Date(start.replace(/\//g, '-')), 'yyyy/MM/dd')
                                    : '?';
                                  const e = end
                                    ? format(new Date(end.replace(/\//g, '-')), 'yyyy/MM/dd')
                                    : '?';
                                  return `${s} - ${e}`;
                                })()}
                              </span>
                              {(() => {
                                const progress = getTaskProgress(row.data);
                                if (progress !== null) {
                                  return (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                                      <span>{progress}%</span>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            {/* 其他字段 */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {(() => {
                                const fields = [];
                                // 分组字段
                                if (fieldMapping.group && fieldMapping.group !== 'none') {
                                  const val = formatDisplayValue(
                                    row.data[fieldMapping.group] ||
                                      row.data.fields?.[fieldMapping.group],
                                  );
                                  if (val)
                                    fields.push({
                                      label: '分组',
                                      value: val,
                                      color: 'bg-purple-50 text-purple-700 border-purple-100',
                                    });
                                }
                                // 颜色字段
                                if (
                                  fieldMapping.color &&
                                  fieldMapping.color !== 'none' &&
                                  fieldMapping.color !== fieldMapping.group
                                ) {
                                  const val = formatDisplayValue(
                                    row.data[fieldMapping.color] ||
                                      row.data.fields?.[fieldMapping.color],
                                  );
                                  if (val)
                                    fields.push({
                                      label: '状态',
                                      value: val,
                                      color: 'bg-orange-50 text-orange-700 border-orange-100',
                                    });
                                }
                                // 依赖关系
                                if (
                                  fieldMapping.dependencies &&
                                  fieldMapping.dependencies !== 'none'
                                ) {
                                  const deps =
                                    row.data[fieldMapping.dependencies] ||
                                    row.data.fields?.[fieldMapping.dependencies];
                                  if (deps && Array.isArray(deps) && deps.length > 0) {
                                    fields.push({
                                      label: '依赖',
                                      value: `${deps.length}个前置任务`,
                                      color: 'bg-gray-100 text-gray-700 border-gray-200',
                                    });
                                  }
                                }

                                return fields.map((f, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] border font-medium',
                                      f.color,
                                    )}
                                  >
                                    {f.value}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 当前时间线 */}
              {viewSettings.showToday && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none border-dashed border-l"
                  style={{
                    left: (() => {
                      const today = new Date();
                      // 如果今天不在显示范围内，不渲染（或者渲染在边缘，这里简单处理为计算位置）

                      // 查找今天所在的 periods 索引
                      const periodIndex = periods.findIndex((p, i) => {
                        const next = periods[i + 1];
                        if (next) {
                          return today >= p && today < next;
                        }
                        // 最后一个周期
                        // 判断是否在最后一个周期的范围内
                        let limit;
                        switch (viewSettings.timeScale) {
                          case 'year':
                            limit = addYears(p, 1);
                            break;
                          case 'quarter':
                            limit = addQuarters(p, 1);
                            break;
                          case 'month':
                            limit = addMonths(p, 1);
                            break;
                          case 'week':
                            limit = addWeeks(p, 1);
                            break;
                          default:
                            limit = addDays(p, 1);
                        }
                        return today >= p && today < limit;
                      });

                      if (periodIndex === -1) return -9999; // 隐藏

                      // 计算周期内的偏移比例
                      let progress = 0;
                      const currentPeriod = periods[periodIndex];
                      let duration = 0;
                      let elapsed = 0;

                      switch (viewSettings.timeScale) {
                        case 'year':
                          duration = differenceInDays(addYears(currentPeriod, 1), currentPeriod);
                          elapsed = differenceInDays(today, currentPeriod);
                          break;
                        case 'quarter':
                          duration = differenceInDays(addQuarters(currentPeriod, 1), currentPeriod);
                          elapsed = differenceInDays(today, currentPeriod);
                          break;
                        case 'month':
                          duration = differenceInDays(addMonths(currentPeriod, 1), currentPeriod);
                          elapsed = differenceInDays(today, currentPeriod);
                          break;
                        case 'week':
                          duration = 7 * 24 * 60 * 60 * 1000; // 毫秒精度更准
                          elapsed = today.getTime() - currentPeriod.getTime();
                          progress = elapsed / duration;
                          return (periodIndex + progress) * columnWidth;
                        default: // day
                          // 日视图，直接在当前列中间
                          return periodIndex * columnWidth + columnWidth / 2;
                      }

                      if (duration > 0) {
                        progress = elapsed / duration;
                      }

                      return (periodIndex + progress) * columnWidth;
                    })(),
                    top: HEADER_HEIGHT,
                    display: (() => {
                      // 简单判断是否在范围内，如果不严谨可以用 left < 0 判断
                      const today = new Date();
                      if (today < startDate || today > endDate) return 'none';
                      return 'block';
                    })(),
                  }}
                >
                  <div className="bg-red-500 text-white text-[10px] px-1 py-0.5 rounded absolute -top-6 -left-4">
                    Today
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* 任务详情弹窗 */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">任务详情</DialogTitle>
            <DialogDescription className="sr-only">
              查看和编辑任务详情，包括执行人、状态、日期和评论等。
            </DialogDescription>
          </DialogHeader>
          {selectedTask &&
            (() => {
              const task = data.priorityGroups
                .flatMap((g) => g.tasks)
                .find((t) => t.id === selectedTask);
              if (!task) return null;
              return <TaskDetail task={task} onClose={() => setSelectedTask(null)} />;
            })()}
        </DialogContent>
      </Dialog>

      {/* 配置弹窗 */}
      <GanttConfigurationDialog open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
