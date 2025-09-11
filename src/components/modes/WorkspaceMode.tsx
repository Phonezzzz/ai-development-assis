import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFileUpload } from '@/hooks/use-file-upload';
import { ProjectFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  File, 
  Folder, 
  Upload, 
  Search, 
  Code, 
  Trash, 
  Download,
  Eye
} from '@phosphor-icons/react';

export function WorkspaceMode() {
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

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredFiles = files.filter(file =>
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
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

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
    <div className="flex h-full">
      {/* File Explorer Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Folder size={20} />
            Project Workspace
          </h2>
          
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
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
                    Upload Files
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex-1 p-4 drop-zone",
            isDragging && "drag-over"
          )}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Processing files...</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="font-medium mb-2">No Files Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drop files here or use the upload button
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
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
      </div>

      {/* File Viewer/Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(selectedFile)}</span>
                <div>
                  <h3 className="font-semibold">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • Modified {selectedFile.lastModified.toLocaleDateString()}
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
                  Download
                </Button>
                
                {selectedFile.content && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Code size={14} className="mr-2" />
                    {isEditing ? 'Preview' : 'Edit'}
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
                      placeholder="File content..."
                    />
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveFile}>Save Changes</Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingContent(selectedFile.content || '');
                          setIsEditing(false);
                        }}
                      >
                        Cancel
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
                    <h3 className="font-medium mb-2">Preview Not Available</h3>
                    <p className="text-sm text-muted-foreground">
                      This file type cannot be previewed in the browser.
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
              <h3 className="font-semibold text-lg mb-2">Select a File</h3>
              <p className="text-muted-foreground">
                Choose a file from the sidebar to view or edit its contents.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}