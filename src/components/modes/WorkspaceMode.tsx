import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernChatInput } from '@/components/ModernChatInput';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useKV } from '@github/spark/hooks';
import { ProjectFile, WorkMode } from '@/lib/types';
import { cn, formatDisplayDate } from '@/lib/utils';
import { vectorService } from '@/lib/services/vector';
import { agentTools } from '@/lib/services/agent-tools';
import { fileIndexerService, ProjectIndex as ProjectIndexType } from '@/lib/services/file-indexer';
import { toast } from 'sonner';
import { 
  File, 
  Folder, 
  Upload, 
  MagnifyingGlass, 
  Code, 
  Trash, 
  Download,
  Eye,
  Terminal as TerminalIcon,
  Play,
  Stop,
  FolderOpen,
  TreeStructure,
  Lightning,
  Cpu,
  Archive,
  FileCode,
  ChatCircle,
  Sparkle
} from '@phosphor-icons/react';

interface TerminalSession {
  id: string;
  commands: Array<{
    id: string;
    command: string;
    output: string;
    timestamp: Date;
    exitCode: number;
  }>;
  workingDirectory: string;
  isActive: boolean;
}

interface WorkspaceModeProps {
  messages?: any[];
  onSendMessage?: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  isProcessing?: boolean;
}

export function WorkspaceMode({ onSendMessage }: WorkspaceModeProps) {
  const {
    files,
    isDragging,
    isProcessing,
    handleFileUpload,
    removeFile,
    updateFileContent,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getFileIcon,
  } = useFileUpload();

  const [projectIndexes, setProjectIndexes] = useKV<ProjectIndexType[]>('project-indexes', []);
  const [selectedProject, setSelectedProject] = useState<ProjectIndexType | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('explorer');
  
  // Terminal state
  const [terminalSession, setTerminalSession] = useState<TerminalSession>({
    id: 'main',
    commands: [],
    workingDirectory: '/',
    isActive: false,
  });
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  // Agent integration
  const [agentChatMessage, setAgentChatMessage] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = (selectedProject?.files || files).filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: ProjectFile) => {
    setSelectedFile(file);
    setEditingContent(file.content || '');
    setIsEditing(false);
  };

  const handleSaveFile = () => {
    if (selectedFile) {
      updateFileContent(selectedFile.id, editingContent);
      setSelectedFile(prev => prev ? { ...prev, content: editingContent } : null);
      setIsEditing(false);
      toast.success('Файл сохранен');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  const handleFolderUpload = useCallback(async () => {
    if (!folderInputRef.current) return;

    const files = folderInputRef.current.files;
    if (!files || files.length === 0) return;

    toast.info('Начинаю индексацию проекта...');
    
    try {
      // Use the new file indexer service
      const projectIndex = await fileIndexerService.indexProject(files, {
        name: files[0].webkitRelativePath?.split('/')[0] || 'New Project',
      });

      setProjectIndexes(prev => [...(prev || []), projectIndex]);
      setSelectedProject(projectIndex);
      setActiveTab('explorer');

      toast.success(`Проект "${projectIndex.name}" успешно проиндексирован!`);
    } catch (error) {
      console.error('Error indexing project:', error);
      toast.error('Ошибка при индексации проекта');
    }
  }, [setProjectIndexes]);

  const executeTerminalCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsExecutingCommand(true);
    const commandId = `cmd_${Date.now()}`;
    
    // Add command to terminal history immediately
    const newCommand = {
      id: commandId,
      command,
      output: 'Выполняется...',
      timestamp: new Date(),
      exitCode: -1,
    };

    setTerminalSession(prev => ({
      ...prev,
      commands: [...prev.commands, newCommand],
    }));

    try {
      // Execute command using terminal tool
      const terminalTool = agentTools.find(tool => tool.name === 'terminal_executor');
      if (terminalTool) {
        const result = await terminalTool.execute({
          command,
          workingDirectory: terminalSession.workingDirectory,
        });

        // Update command with result
        setTerminalSession(prev => ({
          ...prev,
          commands: prev.commands.map(cmd =>
            cmd.id === commandId
              ? {
                  ...cmd,
                  output: result.success ? result.data.stdout : result.error || 'Ошибка выполнения',
                  exitCode: result.success ? result.data.exitCode : 1,
                }
              : cmd
          ),
        }));
      }
    } catch (error) {
      setTerminalSession(prev => ({
        ...prev,
        commands: prev.commands.map(cmd =>
          cmd.id === commandId
            ? {
                ...cmd,
                output: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
                exitCode: 1,
              }
            : cmd
        ),
      }));
    } finally {
      setIsExecutingCommand(false);
      setCurrentCommand('');
    }
  }, [terminalSession.workingDirectory]);

  const handleAgentChat = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsAgentWorking(true);
    setAgentChatMessage('');

    try {
      // Get project context for agent
      const contextPrompt = selectedProject 
        ? `Контекст проекта: ${selectedProject.name}\nФайлы: ${selectedProject.files.map(f => f.name).join(', ')}\nЯзыки: ${selectedProject.stats.languages.join(', ')}`
        : 'Нет активного проекта';

      const prompt = window.spark.llmPrompt`Ты - ИИ помощник в рабочем пространстве разработки. 

${contextPrompt}

Пользователь спрашивает: ${message}

Отвечай на русском языке и предоставляй практические советы для работы с проектом. Если нужно выполнить действия с файлами или кодом, предложи конкретные шаги.`;

      const response = await window.spark.llm(prompt, 'gpt-4o');
      
      // Add agent response to terminal as a special command
      const agentCommand = {
        id: `agent_${Date.now()}`,
        command: `💬 ${message}`,
        output: `🤖 ${response}`,
        timestamp: new Date(),
        exitCode: 0,
      };

      setTerminalSession(prev => ({
        ...prev,
        commands: [...prev.commands, agentCommand],
      }));

      toast.success('Агент ответил');
    } catch (error) {
      console.error('Error in agent chat:', error);
      toast.error('Ошибка связи с агентом');
    } finally {
      setIsAgentWorking(false);
    }
  }, [selectedProject]);

  const downloadFile = (file: ProjectFile) => {
    const blob = new Blob([file.content || ''], { type: file.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col max-h-screen">
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Project Explorer */}
        <div className="w-80 border-r bg-card flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Cpu size={20} />
                Рабочее пространство
              </h2>
              
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="explorer" className="flex items-center gap-2">
                  <FolderOpen size={14} />
                  Проводник
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <TreeStructure size={14} />
                  Проекты
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="explorer" className="flex-1 p-4 space-y-3">
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск файлов..."
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <span>
                      <Upload size={14} className="mr-2" />
                      Файлы
                    </span>
                  </Button>
                </label>
                
                <label className="flex-1">
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory=""
                    multiple
                    onChange={handleFolderUpload}
                    className="hidden"
                  />
                  <Button variant="default" size="sm" className="w-full" asChild>
                    <span>
                      <Archive size={14} className="mr-2" />
                      Папка
                    </span>
                  </Button>
                </label>
              </div>

              {/* File List */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex-1 drop-zone",
                  isDragging && "drag-over"
                )}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Обработка файлов...</p>
                    </div>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📁</div>
                    <h3 className="font-medium mb-2">Файлов пока нет</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Перетащите файлы сюда или используйте кнопки загрузки
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-1">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handleFileSelect(file)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors group",
                            selectedFile?.id === file.id && "bg-accent text-accent-foreground"
                          )}
                        >
                          <span className="text-lg">{getFileIcon(file)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="flex-1 p-4 space-y-3">
              <ScrollArea className="h-96">
                {(projectIndexes || []).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🏗️</div>
                    <h3 className="font-medium mb-2">Проектов нет</h3>
                    <p className="text-sm text-muted-foreground">
                      Загрузите папку для создания индекса проекта
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(projectIndexes || []).map((project) => (
                      <Card
                        key={project.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                          selectedProject?.id === project.id && "bg-accent"
                        )}
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TreeStructure size={16} />
                          <h4 className="font-medium truncate">{project.name}</h4>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {project.stats.languages.slice(0, 3).map(lang => (
                            <Badge key={lang} variant="secondary" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                          {project.stats.languages.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(project.stats.languages.length - 3).toString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.stats.totalFiles} файлов • {formatFileSize(project.stats.totalSize || 0)}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="editor" className="flex-1 flex flex-col">
            <div className="border-b bg-background px-4 py-2">
              <TabsList>
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <FileCode size={14} />
                  Редактор
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <TerminalIcon size={14} />
                  Терминал
                </TabsTrigger>
                <TabsTrigger value="agent" className="flex items-center gap-2">
                  <ChatCircle size={14} />
                  Агент
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="flex-1 flex flex-col m-0">
              {selectedFile ? (
                <>
                  <div className="p-4 border-b bg-background flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFileIcon(selectedFile)}</span>
                      <div>
                        <h3 className="font-semibold">{selectedFile.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedFile.size)} • Изменен {formatDisplayDate(selectedFile.lastModified)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(selectedFile)}
                      >
                        <Download size={14} className="mr-2" />
                        Скачать
                      </Button>
                      
                      {selectedFile.content && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          <Code size={14} className="mr-2" />
                          {isEditing ? 'Просмотр' : 'Редактировать'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    {selectedFile.content ? (
                      isEditing ? (
                        <div className="h-full flex flex-col">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="flex-1 resize-none font-mono text-sm"
                            placeholder="Содержимое файла..."
                          />
                          <div className="flex gap-2 mt-4">
                            <Button onClick={handleSaveFile}>Сохранить</Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setEditingContent(selectedFile.content || '');
                                setIsEditing(false);
                              }}
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Card className="h-full p-4">
                          <pre className="syntax-highlight whitespace-pre-wrap h-full overflow-auto">
                            {selectedFile.content}
                          </pre>
                        </Card>
                      )
                    ) : selectedFile.type.startsWith('image/') ? (
                      <Card className="h-full p-4 flex items-center justify-center">
                        <img
                          src={selectedFile.content}
                          alt={selectedFile.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </Card>
                    ) : (
                      <Card className="h-full p-8 flex items-center justify-center">
                        <div className="text-center">
                          <Eye size={48} className="mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">Предварительный просмотр недоступен</h3>
                          <p className="text-sm text-muted-foreground">
                            Этот тип файла не может быть отображен в браузере.
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Card className="p-8 text-center max-w-md">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="font-semibold text-lg mb-2">Выберите файл</h3>
                    <p className="text-muted-foreground">
                      Выберите файл из бокового меню для просмотра или редактирования.
                    </p>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="terminal" className="flex-1 flex flex-col m-0">
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4 bg-black/5 font-mono text-sm">
                  <div className="space-y-2">
                    {terminalSession.commands.map((cmd) => (
                      <div key={cmd.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-accent">
                          <span>$</span>
                          <span>{cmd.command}</span>
                          {cmd.exitCode === 0 && <span className="text-green-500">✓</span>}
                          {cmd.exitCode > 0 && <span className="text-red-500">✗</span>}
                        </div>
                        <div className="pl-4 text-muted-foreground whitespace-pre-wrap">
                          {cmd.output}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-black/5 rounded px-3 py-2">
                      <span className="text-accent">$</span>
                      <Input
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        placeholder="Введите команду..."
                        className="border-none bg-transparent p-0 font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isExecutingCommand) {
                            executeTerminalCommand(currentCommand);
                          }
                        }}
                        disabled={isExecutingCommand}
                      />
                    </div>
                    <Button
                      onClick={() => executeTerminalCommand(currentCommand)}
                      disabled={isExecutingCommand || !currentCommand.trim()}
                      size="sm"
                    >
                      {isExecutingCommand ? (
                        <Stop size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agent" className="flex-1 flex flex-col m-0">
              <div className="flex-1 p-4">
                <Card className="h-full p-6 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="font-semibold text-lg mb-2">ИИ Агент</h3>
                    <p className="text-muted-foreground">
                      Задайте вопрос или попросите помочь с проектом
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={agentChatMessage}
                      onChange={(e) => setAgentChatMessage(e.target.value)}
                      placeholder="Как могу помочь с проектом?"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAgentWorking) {
                          handleAgentChat(agentChatMessage);
                        }
                      }}
                      disabled={isAgentWorking}
                    />
                    <Button
                      onClick={() => handleAgentChat(agentChatMessage)}
                      disabled={isAgentWorking || !agentChatMessage.trim()}
                    >
                      {isAgentWorking ? (
                        <div className="animate-spin">
                          <Sparkle size={16} />
                        </div>
                      ) : (
                        <Sparkle size={16} />
                      )}
                    </Button>
                  </div>

                  {selectedProject && (
                    <div className="mt-4 p-3 bg-accent/10 rounded">
                      <p className="text-sm font-medium mb-1">Активный проект:</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProject.name} • {selectedProject.stats.totalFiles} файлов
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Chat Input at the bottom */}
      <div className="p-4 border-t bg-card/80 backdrop-blur-sm flex-shrink-0">
        <ModernChatInput
          onSubmit={(text, mode, isVoice) => {
            if (onSendMessage) {
              onSendMessage(text, mode, isVoice);
            } else {
              // Handle workspace-specific commands
              handleWorkspaceCommand(text, mode);
            }
          }}
          placeholder="Работайте с проектом, задавайте команды..."
          disabled={isAgentWorking}
        />
      </div>
    </div>
  );

  function handleWorkspaceCommand(text: string, mode: WorkMode) {
    // Handle workspace-specific commands like file operations, code generation, etc.
    if (mode === 'act') {
      executeTerminalCommand(text);
    } else {
      handleAgentChat(text);
    }
  }
}