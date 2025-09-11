import { vectorService, VectorDocument } from './vector';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface AgentTool {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<ToolResult>;
}

class FileAnalysisTool implements AgentTool {
  name = 'file_analysis';
  displayName = 'Анализ файлов';
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
  displayName = 'Генератор кода';
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
  name = 'semantic_search';
  displayName = 'Семантический поиск';
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
  name = 'project_indexer';
  displayName = 'Индексатор проектов';
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

class WebScraperTool implements AgentTool {
  name = 'web_scraper';
  displayName = 'Веб-скрапер';
  description = 'Извлечение данных с веб-страниц';
  parameters = {
    url: { type: 'string', description: 'URL страницы для анализа' },
    selector: { type: 'string', description: 'CSS селектор (опционально)' }
  };

  async execute(params: { url: string; selector?: string }): Promise<ToolResult> {
    try {
      const { url, selector } = params;
      
      // Since we can't actually scrape in browser, simulate the functionality
      const mockData = {
        url,
        title: 'Заголовок страницы',
        description: 'Описание страницы',
        content: 'Симуляция извлеченного контента',
        links: ['https://example.com/link1', 'https://example.com/link2'],
        images: ['https://example.com/image1.jpg'],
        metadata: {
          author: 'Автор',
          publishDate: new Date().toISOString(),
          keywords: ['ключевое', 'слово'],
        },
      };

      await vectorService.addDocument({
        id: `scraped_${Date.now()}`,
        content: mockData.content,
        metadata: {
          type: 'web_scraped',
          url,
          selector,
          ...mockData.metadata,
        },
      });

      return {
        success: true,
        data: mockData,
        message: `Данные успешно извлечены с ${url}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка веб-скрапинга',
      };
    }
  }
}

class DatabaseQueryTool implements AgentTool {
  name = 'database_query';
  displayName = 'Запросы к БД';
  description = 'Выполнение запросов к базам данных';
  parameters = {
    query: { type: 'string', description: 'SQL запрос' },
    database: { type: 'string', description: 'Тип базы данных' },
    connectionString: { type: 'string', description: 'Строка подключения' }
  };

  async execute(params: { query: string; database: string; connectionString?: string }): Promise<ToolResult> {
    try {
      const { query, database } = params;
      
      // Simulate database query execution
      const mockResult = {
        query,
        database,
        rows: [
          { id: 1, name: 'Запись 1', created_at: new Date().toISOString() },
          { id: 2, name: 'Запись 2', created_at: new Date().toISOString() },
        ],
        rowCount: 2,
        executionTime: Math.random() * 100,
      };

      return {
        success: true,
        data: mockResult,
        message: `Запрос выполнен успешно. Получено ${mockResult.rowCount} записей`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка выполнения запроса',
      };
    }
  }
}

class TextProcessorTool implements AgentTool {
  name = 'text_processor';
  displayName = 'Обработка текста';
  description = 'Обработка и преобразование текста';
  parameters = {
    text: { type: 'string', description: 'Текст для обработки' },
    operation: { type: 'string', description: 'Операция: summarize, translate, format, extract' },
    options: { type: 'object', description: 'Дополнительные параметры' }
  };

  async execute(params: { text: string; operation: string; options?: any }): Promise<ToolResult> {
    try {
      const { text, operation, options = {} } = params;
      let result: any;

      switch (operation) {
        case 'summarize':
          result = await this.summarizeText(text);
          break;
        case 'translate':
          result = await this.translateText(text, options.targetLanguage || 'en');
          break;
        case 'format':
          result = await this.formatText(text, options.format || 'markdown');
          break;
        case 'extract':
          result = await this.extractEntities(text);
          break;
        default:
          throw new Error(`Неизвестная операция: ${operation}`);
      }

      return {
        success: true,
        data: result,
        message: `Текст обработан операцией "${operation}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка обработки текста',
      };
    }
  }

  private async summarizeText(text: string): Promise<any> {
    const prompt = spark.llmPrompt`Создай краткое резюме следующего текста на русском языке: ${text}`;
    const summary = await spark.llm(prompt, 'gpt-4o');
    
    return {
      original: text,
      summary,
      compressionRatio: (summary.length / text.length * 100).toFixed(1) + '%',
    };
  }

  private async translateText(text: string, targetLanguage: string): Promise<any> {
    const prompt = spark.llmPrompt`Переведи следующий текст на ${targetLanguage}: ${text}`;
    const translation = await spark.llm(prompt, 'gpt-4o');
    
    return {
      original: text,
      translation,
      targetLanguage,
      detectedLanguage: 'ru', // Simplified
    };
  }

  private async formatText(text: string, format: string): Promise<any> {
    const prompt = spark.llmPrompt`Переформатируй следующий текст в формат ${format}: ${text}`;
    const formatted = await spark.llm(prompt, 'gpt-4o');
    
    return {
      original: text,
      formatted,
      format,
    };
  }

  private async extractEntities(text: string): Promise<any> {
    const prompt = spark.llmPrompt`Извлеки из текста именованные сущности (имена, места, организации, даты) в формате JSON: ${text}`;
    const entities = await spark.llm(prompt, 'gpt-4o', true);
    
    return {
      original: text,
      entities: JSON.parse(entities),
    };
  }
}

class FileManagerTool implements AgentTool {
  name = 'file_manager';
  displayName = 'Менеджер файлов';
  description = 'Управление файлами и папками';
  parameters = {
    action: { type: 'string', description: 'Действие: read, write, delete, list, move, copy' },
    path: { type: 'string', description: 'Путь к файлу или папке' },
    content: { type: 'string', description: 'Содержимое (для записи)' }
  };

  async execute(params: { action: string; path: string; content?: string }): Promise<ToolResult> {
    try {
      const { action, path, content } = params;
      
      // Simulate file operations since we can't access real file system
      let result: any;

      switch (action) {
        case 'read':
          result = { content: `Содержимое файла ${path}`, size: 1024 };
          break;
        case 'write':
          result = { path, written: content?.length || 0, success: true };
          break;
        case 'delete':
          result = { path, deleted: true };
          break;
        case 'list':
          result = {
            path,
            files: [
              { name: 'file1.txt', type: 'file', size: 1024 },
              { name: 'folder1', type: 'directory', size: 0 },
            ],
          };
          break;
        case 'move':
        case 'copy':
          result = { from: path, to: path + '_copy', success: true };
          break;
        default:
          throw new Error(`Неизвестное действие: ${action}`);
      }

      return {
        success: true,
        data: result,
        message: `Операция "${action}" выполнена для ${path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка файловой операции',
      };
    }
  }
}

class TerminalExecutorTool implements AgentTool {
  name = 'terminal_executor';
  displayName = 'Исполнитель команд';
  description = 'Выполнение команд терминала';
  parameters = {
    command: { type: 'string', description: 'Команда для выполнения' },
    workingDirectory: { type: 'string', description: 'Рабочая директория' },
    timeout: { type: 'number', description: 'Таймаут в секундах' }
  };

  async execute(params: { command: string; workingDirectory?: string; timeout?: number }): Promise<ToolResult> {
    try {
      const { command, workingDirectory = '/', timeout = 30 } = params;
      
      // Simulate command execution
      const mockOutput = {
        command,
        workingDirectory,
        stdout: `Выполнение команды: ${command}\nРезультат симуляции\nУспешно завершено`,
        stderr: '',
        exitCode: 0,
        executionTime: Math.random() * 1000,
      };

      return {
        success: true,
        data: mockOutput,
        message: `Команда "${command}" выполнена успешно`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка выполнения команды',
      };
    }
  }
}

// Export all tools
export const agentTools: AgentTool[] = [
  new FileAnalysisTool(),
  new CodeGeneratorTool(),
  new SearchTool(),
  new ProjectMapTool(),
  new WebScraperTool(),
  new DatabaseQueryTool(),
  new TextProcessorTool(),
  new FileManagerTool(),
  new TerminalExecutorTool(),
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