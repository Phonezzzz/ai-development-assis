# File System Integration Documentation

## Overview

The AI Agent Workspace now includes comprehensive file system integration for project indexing, enabling intelligent code analysis, vector search, and agent-assisted development workflows.

## Features

### 🗂️ Project Indexing
- **Bulk Folder Upload**: Upload entire project folders with preserved directory structure
- **Intelligent File Filtering**: Automatically excludes common build artifacts and system files
- **Language Detection**: Automatically identifies programming languages and file types
- **File Tree Visualization**: Interactive file explorer with hierarchical project structure

### 🔍 Vector Search Integration
- **Semantic Search**: Find files by content meaning, not just keywords
- **Code Context**: Search across all indexed project files
- **Smart Suggestions**: AI-powered suggestions based on project context
- **Cross-File References**: Understand relationships between project components

### 🤖 Agent Integration
- **Project-Aware Agents**: AI agents understand your project structure and codebase
- **Contextual Assistance**: Get help specific to your project's architecture
- **Code Generation**: Generate code that fits your project's patterns and conventions
- **Refactoring Suggestions**: AI-powered code improvement recommendations

### ⚡ Performance Features
- **Incremental Indexing**: Only re-index changed files for faster updates
- **Chunked Processing**: Handle large projects without blocking the UI
- **Memory Optimization**: Efficient storage and retrieval of project metadata
- **Background Processing**: Index files while you continue working

## Usage

### 1. Project Setup

#### Upload a Project Folder
1. Go to the **Workspace** tab
2. Click the **Папка** (Folder) button in the file explorer
3. Select your project directory
4. Wait for indexing to complete

#### Supported File Types
- **Code Files**: .js, .ts, .tsx, .jsx, .py, .java, .cpp, .c, .cs, .go, .rs, .php, .rb
- **Web Files**: .html, .css, .scss, .sass, .less
- **Data Files**: .json, .yaml, .yml, .xml, .csv
- **Documentation**: .md, .rst, .txt
- **Configuration**: .env, .config, .ini, .toml

### 2. File Management

#### File Explorer
- **Search Files**: Use the search bar to find files by name or content
- **Navigate Structure**: Click folders to expand/collapse directory trees
- **View File Details**: See file size, modification date, and metadata
- **Quick Actions**: Edit, download, or delete files directly

#### Code Editor
- **Syntax Highlighting**: Automatic language detection and highlighting
- **Edit Mode**: Switch between view and edit modes
- **Save Changes**: Persist modifications to the project index
- **File Preview**: View images and other media files inline

### 3. AI Integration

#### Smart Context
The AI agents automatically receive context about your project when you:
- Ask questions about your code
- Request code generation
- Seek refactoring advice
- Need debugging help

#### Vector Search
Use semantic search to find:
- Similar functions or components
- Code patterns and examples
- Documentation and comments
- Configuration files

### 4. Terminal Integration

#### Project Commands
- **File Operations**: Navigate and manipulate project files
- **Build Commands**: Run project-specific build tools
- **Git Integration**: Version control operations
- **Agent Assistance**: Get AI help with command-line tasks

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Vector Database (Qdrant)
VITE_QDRANT_URL=http://localhost:6333
VITE_QDRANT_API_KEY=your_api_key

# OpenAI (for embeddings)
VITE_OPENAI_API_KEY=your_openai_key

# ElevenLabs (for TTS)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
```

### Qdrant Setup (Docker)

```bash
# Start Qdrant vector database
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Or with persistent storage
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

### Project Indexing Configuration

```typescript
// Configure indexing options
const indexOptions = {
  name: 'My Project',
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    '*.log'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedLanguages: ['javascript', 'typescript', 'python']
};
```

## API Reference

### FileIndexerService

```typescript
// Index a project
const projectIndex = await fileIndexerService.indexProject(files, options);

// Search within project
const results = await fileIndexerService.searchInProject(
  projectId, 
  'search query',
  { languages: ['javascript'], maxResults: 10 }
);

// Reindex with new files
const updatedIndex = await fileIndexerService.reindexProject(
  existingIndex, 
  newFiles
);
```

### Vector Search

```typescript
// Search across all indexed content
const documents = await vectorService.search('user authentication', {
  limit: 10,
  threshold: 0.7,
  filter: { type: 'project_file', language: 'typescript' }
});
```

### Agent Tools

```typescript
// Use project context in agent conversations
const projectContext = {
  projectId: 'project_123',
  selectedFiles: ['src/components/App.tsx'],
  currentLanguage: 'typescript'
};

// Agent automatically receives project context
const response = await agentSystem.processQuery(
  'How can I improve this component?',
  projectContext
);
```

## Best Practices

### Project Organization
- **Clear Structure**: Maintain consistent directory organization
- **Meaningful Names**: Use descriptive file and folder names
- **Documentation**: Include README files and inline comments
- **Version Control**: Use git for tracking changes

### Indexing Optimization
- **Exclude Build Artifacts**: Configure ignore patterns for temporary files
- **Limit File Sizes**: Avoid indexing very large binary files
- **Regular Updates**: Re-index when making significant changes
- **Monitor Performance**: Watch for indexing delays with large projects

### AI Interaction
- **Specific Questions**: Ask targeted questions about your codebase
- **Provide Context**: Reference specific files or components
- **Iterative Improvement**: Build on previous AI suggestions
- **Review Suggestions**: Always review AI-generated code

## Troubleshooting

### Common Issues

#### Indexing Fails
- Check file permissions
- Verify supported file types
- Reduce batch size for large projects
- Check available disk space

#### Search Returns No Results
- Verify vector database connection
- Check search query relevance
- Adjust similarity threshold
- Rebuild project index

#### Slow Performance
- Optimize ignore patterns
- Reduce max file size limit
- Use incremental indexing
- Check system resources

### Performance Monitoring

```typescript
// Monitor indexing performance
const stats = {
  totalFiles: projectIndex.stats.totalFiles,
  indexingTime: Date.now() - startTime,
  memoryUsage: performance.memory.usedJSHeapSize,
  vectorCount: await vectorService.getDocumentCount()
};
```

## Advanced Features

### Custom File Processors
- **Language-Specific**: Custom parsers for different file types
- **Metadata Extraction**: Extract imports, exports, and dependencies
- **Code Analysis**: Identify functions, classes, and components
- **Documentation**: Parse JSDoc and similar comment formats

### Integration Workflows
- **CI/CD Integration**: Automatic indexing on code changes
- **IDE Plugins**: Direct integration with development environments
- **Code Review**: AI-assisted code review workflows
- **Documentation Generation**: Automated documentation from indexed code

## Future Enhancements

### Planned Features
- **Real-time Collaboration**: Multi-user project editing
- **Advanced Analytics**: Code complexity and quality metrics
- **Deployment Integration**: Direct deployment from workspace
- **Testing Integration**: Automated test generation and execution

### API Improvements
- **GraphQL Support**: Query project structure with GraphQL
- **Webhook Integration**: Real-time notifications and updates
- **Plugin System**: Custom extensions and integrations
- **Mobile Support**: Mobile app for project management

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start development server: `npm run dev`
5. Set up Qdrant instance for testing

### Testing
- **Unit Tests**: Test individual components and services
- **Integration Tests**: Test file indexing and search workflows
- **Performance Tests**: Benchmark indexing and search performance
- **E2E Tests**: Test complete user workflows

For more information, see the main project documentation.