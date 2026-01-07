'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/lib/task-store';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, BookOpen, Settings, Code } from 'lucide-react';
import { IntroDocContent } from '../documentation/intro-doc-content';
import { FeatureDocContent } from '../documentation/feature-doc-content';
import { SettingsDocContent } from '../documentation/settings-doc-content';
import { DevDocContent } from '../documentation/dev-doc-content';

type DocSection = 'intro' | 'features' | 'settings' | 'development' | 'templates';

export function DocumentationView() {
  const [activeSection, setActiveSection] = useState<DocSection>('intro');
  const {
    applyTemplateDefaults,
    views,
    applySavedView,
    renameView,
    deleteView,
    defaultViewId,
    setDefaultView,
    groupBy,
    sortConfig,
    filterConfig,
    viewConfig,
    headerOrder,
    visibleFields,
  } = useTaskStore();
  const [renameId, setRenameId] = useState<string>('');
  const [renameText, setRenameText] = useState<string>('');
  const [selectedViewId, setSelectedViewId] = useState<string>('');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <IntroDocContent />;
      case 'features':
        return <FeatureDocContent />;
      case 'settings':
        return <SettingsDocContent />;
      case 'development':
        return <DevDocContent />;
      case 'templates':
        return (
          <div className="space-y-6">
            <div>
              <div className="text-lg font-semibold mb-2">模板与项目</div>
              <div className="text-sm text-gray-600 mb-3">应用项目管理模板的默认字段与视图配置</div>
              <Button
                variant="outline"
                onClick={() => {
                  applyTemplateDefaults({
                    visibleFields,
                    headerOrder,
                    table: {
                      groupBy: 'priority',
                      sortBy: 'status',
                      rowHeight: viewConfig.rowHeight,
                      headerDraggable: viewConfig.headerDraggable,
                    },
                    filter: filterConfig,
                  });
                }}
              >
                应用项目管理模板
              </Button>
            </div>

            <div>
              <div className="text-lg font-semibold mb-2">命名视图管理</div>
              <div className="flex items-center space-x-2 mb-3">
                <Select value={selectedViewId} onValueChange={setSelectedViewId}>
                  <SelectTrigger className="w-48 h-8">
                    <SelectValue placeholder="选择命名视图" />
                  </SelectTrigger>
                  <SelectContent>
                    {views.length === 0 && <SelectItem value="">暂无视图</SelectItem>}
                    {views.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedViewId && applySavedView(selectedViewId)}
                >
                  应用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedViewId && setDefaultView(selectedViewId)}
                >
                  设为默认
                </Button>
              </div>

              <div className="space-y-2">
                {views.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between border rounded-md p-2"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{v.name}</span>
                      {defaultViewId === v.id && (
                        <span className="text-xs text-blue-600">默认</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        className="h-8 w-44"
                        placeholder="重命名"
                        value={renameId === v.id ? renameText : ''}
                        onChange={(e) => {
                          setRenameId(v.id);
                          setRenameText(e.target.value);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (renameId === v.id && renameText.trim()) {
                            renameView(v.id, renameText.trim());
                            setRenameId('');
                            setRenameText('');
                          }
                        }}
                      >
                        重命名
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteView(v.id)}>
                        删除
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applySavedView(v.id)}>
                        应用
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return <IntroDocContent />;
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧导航区域 - 固定不滚动 */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-6 text-xl font-semibold">文档目录</h2>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('intro')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
              activeSection === 'intro'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            <span>入门指南</span>
          </button>

          <button
            onClick={() => setActiveSection('features')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
              activeSection === 'features'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            <span>功能介绍</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
              activeSection === 'settings'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>设置与配置</span>
          </button>

          <button
            onClick={() => setActiveSection('development')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
              activeSection === 'development'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Code className="mr-2 h-4 w-4" />
            <span>使用和二次开发</span>
          </button>

          <button
            onClick={() => setActiveSection('templates')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium',
              activeSection === 'templates'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            <span>模板与视图管理</span>
          </button>
        </nav>
      </div>

      {/* 右侧内容区域 - 内部滚动 */}
      <div className="flex-1 h-full overflow-hidden" style={{ background: '#fff' }}>
        <ScrollArea className="h-full w-full" style={{ height: '100vh' }}>
          <div className="p-6">{renderContent()}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
