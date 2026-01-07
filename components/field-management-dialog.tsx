'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useTaskStore } from '@/lib/task-store';
import { Plus, X, GripVertical, Trash2, Pencil, Check } from 'lucide-react';
import type { FieldType, FieldDefinition } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FieldManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SortableFieldItemProps {
  field: FieldDefinition;
  isSystem: boolean;
  displayTypeMapping: Record<string, string>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
}

function SortableFieldItem({
  field,
  isSystem,
  displayTypeMapping,
  onDelete,
  onUpdate,
  onToggleVisibility,
}: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(field.name);
  const [editType, setEditType] = useState<FieldType>(field.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (!editName.trim()) return;
    onUpdate(field.id, { name: editName, type: editType });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(field.name);
    setEditType(field.type);
    setIsEditing(false);
  };

  // 字段类型选项
  const typeOptions = [
    { label: '文本', value: 'Text' },
    { label: '数值', value: 'Number' },
    { label: '标签', value: 'Tag' },
    { label: '单选', value: 'Radio' },
    { label: '复选', value: 'Checkbox' },
    { label: '富文本', value: 'RichText' },
    { label: '图片', value: 'Image' },
    { label: '进度', value: 'Progress' },
    { label: '评分', value: 'Rating' },
    { label: '日期', value: 'Date' },
    { label: '人员', value: 'User' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border rounded-lg mb-2 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-gray-600 text-gray-400"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <Checkbox
          checked={field.visible !== false}
          onCheckedChange={(checked) => onToggleVisibility(field.id, !!checked)}
          className="mr-2"
        />

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 w-40"
            />
            {!isSystem && (
              <Select value={editType} onValueChange={(val) => setEditType(val as FieldType)}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-600"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <div className="font-medium text-sm">{field.name}</div>
            <div className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">
              {displayTypeMapping[field.type] || field.type}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!isEditing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-blue-600"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {!isSystem ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除字段?</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将永久删除字段 "{field.name}" 及其所有关联数据。此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(field.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div className="w-8"></div> // 占位
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function FieldManagementDialog({ open, onOpenChange }: FieldManagementDialogProps) {
  const { toast } = useToast();
  const {
    visibleFields,
    setVisibleFields,
    addField,
    deleteField,
    updateField,
    headerOrder,
    setHeaderOrder,
  } = useTaskStore();

  // 新字段状态
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('文本');

  // 排序状态
  const [orderedFields, setOrderedFields] = useState<FieldDefinition[]>([]);

  useEffect(() => {
    if (open) {
      // 初始化排序列表
      // 根据 headerOrder 排序可见字段，并追加不可见字段
      const sorted = [
        ...headerOrder.map((id) => visibleFields.find((f) => f.id === id)).filter(Boolean),
        ...visibleFields.filter((f) => !headerOrder.includes(f.id)),
      ] as FieldDefinition[];
      setOrderedFields(sorted);
    }
  }, [open, visibleFields, headerOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedFields((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      // 更新 store 中的顺序
      // 这里我们需要更新 headerOrder，保持那些不可见字段的位置或者仅仅更新可见字段的顺序
      // 简单起见，我们更新 headerOrder 为新的顺序（只包含可见的）
      const newHeaderOrder = newItems.filter((f) => f.visible).map((f) => f.id);
      setHeaderOrder(newHeaderOrder);

      return newItems;
    });
  };

  // 字段类型映射
  const displayTypeMapping: Record<string, string> = {
    Text: '文本',
    Number: '数值',
    Tag: '标签',
    Select: '标签',
    Radio: '单选',
    Checkbox: '复选',
    RichText: '富文本',
    Image: '图片',
    Date: '日期',
    User: '人员',
    Progress: '进度',
    Rating: '评分',
  };

  const typeMapping: Record<string, FieldType> = {
    文本: 'Text',
    数值: 'Number',
    标签: 'Tag',
    单选: 'Radio',
    复选: 'Checkbox',
    富文本: 'RichText',
    图片: 'Image',
    进度: 'Progress',
    评分: 'Rating',
    日期: 'Date',
    人员: 'User',
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      toast({ title: '请输入字段名称', variant: 'destructive' });
      return;
    }

    const fieldId = `custom_${Date.now()}_${newFieldName.replace(/\s+/g, '_').toLowerCase()}`;
    const type = typeMapping[newFieldType] || 'Text';

    const newField: FieldDefinition = {
      id: fieldId,
      name: newFieldName,
      type: type,
      width: 150,
      visible: true,
      options: ['Tag', 'Radio'].includes(type) ? ['选项1', '选项2'] : undefined, // 默认选项
    };

    addField(newField);
    setNewFieldName('');
    setNewFieldType('文本');

    toast({ title: '字段已添加' });
  };

  const handleUpdateField = (id: string, updates: Partial<FieldDefinition>) => {
    updateField(id, updates);
    toast({ title: '字段已更新' });
  };

  const handleDeleteField = (id: string) => {
    deleteField(id);
    toast({ title: '字段已删除' });
  };

  const handleToggleVisibility = (id: string, visible: boolean) => {
    updateField(id, { visible });

    const newItems = orderedFields.map((item) => (item.id === id ? { ...item, visible } : item));
    setOrderedFields(newItems);

    // 同步更新 headerOrder，确保包含所有可见字段
    const newHeaderOrder = newItems.filter((f) => f.visible).map((f) => f.id);
    setHeaderOrder(newHeaderOrder);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>字段管理 - 任务管理表</DialogTitle>
          <DialogDescription>添加新字段或管理现有字段。您可以拖动字段调整顺序。</DialogDescription>
        </DialogHeader>

        {/* 添加新字段区域 */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4 mb-4">
          <h3 className="font-medium text-sm text-gray-700">添加新字段</h3>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>字段名称</Label>
              <Input
                placeholder="输入字段名称"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-48">
              <Label>字段类型</Label>
              <Select value={newFieldType} onValueChange={setNewFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(typeMapping).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddField} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              添加字段
            </Button>
          </div>
        </div>

        {/* 现有字段列表 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="font-medium text-sm text-gray-700 mb-2">现有字段</h3>
          <ScrollArea className="flex-1 pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedFields.map((field) => (
                  <SortableFieldItem
                    key={field.id}
                    field={field}
                    isSystem={field.system || !field.id.startsWith('custom_')}
                    displayTypeMapping={displayTypeMapping}
                    onDelete={handleDeleteField}
                    onUpdate={handleUpdateField}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
