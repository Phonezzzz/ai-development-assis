import { vectorService, VectorDocument } from './vector';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<ToolResult>;
}

class FileAnalysisTool implements AgentTool {
  name = 'file_analysis';
  description = 'Анализирует загруженные файлы и извлекает информацию';
  parameters = {
    file: { type: 'File', description: 'Файл для анализа' },
    analysisType: { type: 'string', description: 'Тип анализа: code, text, image' }
  };

  async execute(params: { file: File; analysisType: string }): Promise<ToolResult> {
    try {
      const { file, analysisType } = params;
      const content = await this.readFileContent(file);
      
      let analysis: any = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: new Date(file.lastModified),
      };

      switch (analysisType) {
        case 'code':
          analysis = { ...analysis, ...await this.analyzeCode(content, file.name) };
          break;
        case 'text':
          analysis = { ...analysis, ...await this.analyzeText(content) };
          break;
        case 'image':
          analysis = { ...analysis, ...await this.analyzeImage(file) };
          break;
        default:
          analysis = { ...analysis, content: content.substring(0, 1000) };
      }

      // Store in vector database for future search
      await vectorService.addDocument({
        id: `file_${Date.now()}_${file.name}`,
        content: content,
        metadata: {
          type: 'file_analysis',
          fileName: file.name,
          analysisType,
          analysis,
        },
      });

      return {
        success: true,
        data: analysis,
        message: `Файл ${file.name} успешно проанализирован`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async analyzeCode(content: string, fileName: string): Promise<any> {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const lines = content.split('\n');
    
    const analysis = {
      language: this.detectLanguage(extension || ''),
      lineCount: lines.length,
      functions: this.extractFunctions(content, extension || ''),
      imports: this.extractImports(content, extension || ''),
      complexity: this.calculateComplexity(content),
      comments: this.countComments(content, extension || ''),
    };

    return analysis;
  }

  private async analyzeText(content: string): Promise<any> {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageWordsPerSentence: words.length / sentences.length,
      readingTime: Math.ceil(words.length / 200), // minutes
      sentiment: await this.analyzeSentiment(content),
    };
  }

  private async analyzeImage(file: File): Promise<any> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: (img.width / img.height).toFixed(2),
          format: file.type,
        });
      };
      img.onerror = () => resolve({ error: 'Cannot analyze image' });
      img.src = URL.createObjectURL(file);
    });
  }

  private detectLanguage(extension: string): string {
    const langMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'jsx': 'JavaScript React',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
    };
    return langMap[extension] || 'Unknown';
  }

  private extractFunctions(content: string, extension: string): string[] {
    const patterns: Record<string, RegExp> = {
      'js': /function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g,
      'ts': /function\s+(\w+)|const\s+(\w+)\s*=\s*\(|(\w+)\s*\(/g,
      'py': /def\s+(\w+)/g,
      'java': /(public|private|protected)?\s*(static)?\s*\w+\s+(\w+)\s*\(/g,
    };
    
    const pattern = patterns[extension];
    if (!pattern) return [];
    
    const matches = [...content.matchAll(pattern)];
    return matches.map(match => match[1] || match[2] || match[3]).filter(Boolean);
  }

  private extractImports(content: string, extension: string): string[] {
    const patterns: Record<string, RegExp> = {
      'js': /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g,
      'ts': /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g,
      'py': /from\s+(\S+)\s+import|import\s+(\S+)/g,
      'java': /import\s+([^;]+);/g,
    };
    
    const pattern = patterns[extension];
    if (!pattern) return [];
    
    const matches = [...content.matchAll(pattern)];
    return matches.map(match => match[1] || match[2]).filter(Boolean);
  }

  private calculateComplexity(content: string): number {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1; // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) complexity += matches.length;
    });
    
    return complexity;
  }

  private countComments(content: string, extension: string): number {
    const patterns: Record<string, RegExp[]> = {
      'js': [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm],
      'ts': [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm],
      'py': [/#.*$/gm, /"""[\s\S]*?"""/g],
      'java': [/\/\*[\s\S]*?\*\//g, /\/\/.*$/gm],
    };
    
    const patternList = patterns[extension] || [];
    let commentCount = 0;
    
    patternList.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) commentCount += matches.length;
    });
    
    return commentCount;
  }

  private async analyzeSentiment(text: string): Promise<string> {
    // Simple sentiment analysis based on word presence
    const positiveWords = ['хорошо', 'отлично', 'замечательно', 'успешно', 'прекрасно'];
    const negativeWords = ['плохо', 'ужасно', 'провал', 'ошибка', 'неудача'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) positiveCount++;
      if (negativeWords.some(neg => word.includes(neg))) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'Положительный';
    if (negativeCount > positiveCount) return 'Отрицательный';
    return 'Нейтральный';
  }
}

class CodeGeneratorTool implements AgentTool {
  name = 'code_generator';
  description = 'Генерирует код на основе описания';
  parameters = {
    description: { type: 'string', description: 'Описание желаемого кода' },
    language: { type: 'string', description: 'Язык программирования' },
    framework: { type: 'string', description: 'Фреймворк (опционально)' }
  };

  async execute(params: { description: string; language: string; framework?: string }): Promise<ToolResult> {
    try {
      const { description, language, framework } = params;
      
      // Use the spark LLM for code generation
      const prompt = spark.llmPrompt`Сгенерируй код на ${language}${framework ? ` с использованием ${framework}` : ''} на основе описания: ${description}. 

Требования:
- Код должен быть полным и готовым к использованию
- Добавь комментарии на русском языке
- Используй современные практики и паттерны
- Код должен быть читаемым и поддерживаемым
- Не используй заглушки или TODO

Верни только код без дополнительных объяснений.`;

      const generatedCode = await spark.llm(prompt, 'gpt-4o');
      
      // Store generated code in vector database
      await vectorService.addDocument({
        id: `code_${Date.now()}`,
        content: generatedCode,
        metadata: {
          type: 'generated_code',
          language,
          framework,
          description,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        data: {
          code: generatedCode,
          language,
          framework,
          description,
        },
        message: `Код успешно сгенерирован на ${language}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка генерации кода',
      };
    }
  }
}

class SearchTool implements AgentTool {
  name = 'search';
  description = 'Поиск по истории сообщений и документам';
  parameters = {
    query: { type: 'string', description: 'Поисковый запрос' },
    limit: { type: 'number', description: 'Максимальное количество результатов' },
    type: { type: 'string', description: 'Тип поиска: all, messages, files, code' }
  };

  async execute(params: { query: string; limit?: number; type?: string }): Promise<ToolResult> {
    try {
      const { query, limit = 10, type = 'all' } = params;
      
      const filter = type !== 'all' ? { type } : undefined;
      const results = await vectorService.search(query, { limit, filter });
      
      const formattedResults = results.map(doc => ({
        id: doc.id,
        content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : ''),
        metadata: doc.metadata,
        similarity: doc.similarity,
      }));

      return {
        success: true,
        data: {
          query,
          results: formattedResults,
          totalFound: results.length,
        },
        message: `Найдено ${results.length} результатов по запросу "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка поиска',
      };
    }
  }
}

class ProjectMapTool implements AgentTool {
  name = 'project_map';
  description = 'Создание карты проекта и анализ структуры';
  parameters = {
    files: { type: 'FileList', description: 'Список файлов проекта' },
    action: { type: 'string', description: 'Действие: create, analyze, update' }
  };

  async execute(params: { files: FileList; action: string }): Promise<ToolResult> {
    try {
      const { files, action } = params;
      
      const projectMap = await this.analyzeProjectStructure(files);
      
      // Store project map
      await vectorService.addDocument({
        id: `project_map_${Date.now()}`,
        content: JSON.stringify(projectMap, null, 2),
        metadata: {
          type: 'project_map',
          action,
          fileCount: files.length,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        data: projectMap,
        message: `Карта проекта ${action === 'create' ? 'создана' : 'обновлена'} для ${files.length} файлов`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка создания карты проекта',
      };
    }
  }

  private async analyzeProjectStructure(files: FileList): Promise<any> {
    const structure: any = {
      name: 'Project',
      type: 'directory',
      children: [],
      stats: {
        totalFiles: files.length,
        languages: new Set(),
        frameworks: new Set(),
        dependencies: new Set(),
      },
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');
      
      this.addToStructure(structure, pathParts, file);
      
      // Analyze file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension) {
        structure.stats.languages.add(this.getLanguageFromExtension(extension));
      }
    }

    // Convert Sets to Arrays for serialization
    structure.stats.languages = Array.from(structure.stats.languages);
    structure.stats.frameworks = Array.from(structure.stats.frameworks);
    structure.stats.dependencies = Array.from(structure.stats.dependencies);

    return structure;
  }

  private addToStructure(parent: any, pathParts: string[], file: File): void {
    if (pathParts.length === 1) {
      // This is a file
      parent.children.push({
        name: pathParts[0],
        type: 'file',
        size: file.size,
        lastModified: file.lastModified,
        extension: pathParts[0].split('.').pop()?.toLowerCase(),
      });
    } else {
      // This is a directory
      const dirName = pathParts[0];
      let dir = parent.children.find((child: any) => child.name === dirName && child.type === 'directory');
      
      if (!dir) {
        dir = {
          name: dirName,
          type: 'directory',
          children: [],
        };
        parent.children.push(dir);
      }
      
      this.addToStructure(dir, pathParts.slice(1), file);
    }
  }

  private getLanguageFromExtension(extension: string): string {
    const langMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'LESS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
    };
    return langMap[extension] || 'Unknown';
  }
}

// Export all tools
export const agentTools: AgentTool[] = [
  new FileAnalysisTool(),
  new CodeGeneratorTool(),
  new SearchTool(),
  new ProjectMapTool(),
];

export function getToolByName(name: string): AgentTool | undefined {
  return agentTools.find(tool => tool.name === name);
}

export function executeToolByName(name: string, params: any): Promise<ToolResult> {
  const tool = getToolByName(name);
  if (!tool) {
    return Promise.resolve({
      success: false,
      error: `Tool '${name}' not found`,
    });
  }
  return tool.execute(params);
}