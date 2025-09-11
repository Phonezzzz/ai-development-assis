import { createClient } from '@supabase/supabase-js';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  similarity?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface VectorService {
  addDocument(document: VectorDocument): Promise<void>;
  addDocuments(documents: VectorDocument[]): Promise<void>;
  search(query: string, options?: VectorSearchOptions): Promise<VectorDocument[]>;
  deleteDocument(id: string): Promise<void>;
  updateDocument(id: string, document: Partial<VectorDocument>): Promise<void>;
  isAvailable(): boolean;
}

class OpenAIEmbeddingService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Error creating embeddings:', error);
      throw error;
    }
  }
}

class QdrantVectorService implements VectorService {
  private baseUrl: string;
  private apiKey: string;
  private collectionName = 'ai_agent_documents';
  private embeddingService: OpenAIEmbeddingService;

  constructor() {
    this.baseUrl = import.meta.env.VITE_QDRANT_URL || 'http://localhost:6333';
    this.apiKey = import.meta.env.VITE_QDRANT_API_KEY || '';
    this.embeddingService = new OpenAIEmbeddingService();
    this.initializeCollection();
  }

  isAvailable(): boolean {
    return !!this.baseUrl && this.embeddingService.isAvailable();
  }

  private async initializeCollection(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Check if collection exists
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        // Create collection
        await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            vectors: {
              size: 1536, // text-embedding-3-small dimension
              distance: 'Cosine',
            },
          }),
        });
      }
    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }
    
    return headers;
  }

  async addDocument(document: VectorDocument): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Qdrant or OpenAI not configured');
    }

    try {
      const embedding = await this.embeddingService.createEmbedding(document.content);
      
      await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          points: [{
            id: document.id,
            vector: embedding,
            payload: {
              content: document.content,
              metadata: document.metadata,
              timestamp: new Date().toISOString(),
            },
          }],
        }),
      });
    } catch (error) {
      console.error('Error adding document to Qdrant:', error);
      throw error;
    }
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Qdrant or OpenAI not configured');
    }

    try {
      const texts = documents.map(doc => doc.content);
      const embeddings = await this.embeddingService.createEmbeddings(texts);
      
      const points = documents.map((doc, index) => ({
        id: doc.id,
        vector: embeddings[index],
        payload: {
          content: doc.content,
          metadata: doc.metadata,
          timestamp: new Date().toISOString(),
        },
      }));

      await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ points }),
      });
    } catch (error) {
      console.error('Error adding documents to Qdrant:', error);
      throw error;
    }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorDocument[]> {
    if (!this.isAvailable()) {
      throw new Error('Qdrant or OpenAI not configured');
    }

    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          vector: queryEmbedding,
          limit: options.limit || 10,
          score_threshold: options.threshold || 0.7,
          with_payload: true,
          filter: options.filter,
        }),
      });

      if (!response.ok) {
        throw new Error(`Qdrant search error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.result.map((item: any) => ({
        id: item.id,
        content: item.payload.content,
        metadata: item.payload.metadata,
        similarity: item.score,
      }));
    } catch (error) {
      console.error('Error searching in Qdrant:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          points: [id],
        }),
      });
    } catch (error) {
      console.error('Error deleting document from Qdrant:', error);
      throw error;
    }
  }

  async updateDocument(id: string, document: Partial<VectorDocument>): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      if (document.content) {
        // If content changed, update embedding too
        const embedding = await this.embeddingService.createEmbedding(document.content);
        
        await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            points: [{
              id,
              vector: embedding,
              payload: {
                content: document.content,
                metadata: document.metadata || {},
                timestamp: new Date().toISOString(),
              },
            }],
          }),
        });
      } else {
        // Update only payload
        await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/payload`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            points: [id],
            payload: {
              metadata: document.metadata || {},
              timestamp: new Date().toISOString(),
            },
          }),
        });
      }
    } catch (error) {
      console.error('Error updating document in Qdrant:', error);
      throw error;
    }
  }
}

class LocalVectorService implements VectorService {
  private documents: Map<string, VectorDocument> = new Map();

  isAvailable(): boolean {
    return true;
  }

  async addDocument(document: VectorDocument): Promise<void> {
    this.documents.set(document.id, {
      ...document,
      embedding: await this.createSimpleEmbedding(document.content),
    });
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorDocument[]> {
    const queryEmbedding = await this.createSimpleEmbedding(query);
    const results: (VectorDocument & { similarity: number })[] = [];

    for (const doc of this.documents.values()) {
      if (doc.embedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        if (similarity >= (options.threshold || 0.3)) {
          results.push({ ...doc, similarity });
        }
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 10);
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async updateDocument(id: string, document: Partial<VectorDocument>): Promise<void> {
    const existing = this.documents.get(id);
    if (existing) {
      const updated = { ...existing, ...document };
      if (document.content) {
        updated.embedding = await this.createSimpleEmbedding(document.content);
      }
      this.documents.set(id, updated);
    }
  }

  private async createSimpleEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding for demo purposes
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const embedding = new Array(384).fill(0);
    
    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      embedding[hash % embedding.length] += 1 / (i + 1);
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Factory function to create the appropriate vector service
export function createVectorService(): VectorService {
  const qdrantService = new QdrantVectorService();
  if (qdrantService.isAvailable()) {
    return qdrantService;
  }
  return new LocalVectorService();
}

export const vectorService = createVectorService();