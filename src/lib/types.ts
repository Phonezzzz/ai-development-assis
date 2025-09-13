export type OperatingMode = 'chat' | 'image-creator' | 'workspace';

export type AgentType = 'planner' | 'worker' | 'supervisor' | 'error-fixer';

export type WorkMode = 'plan' | 'act' | 'ask';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
  free?: boolean;
}

export type AgentStatus = 'idle' | 'thinking' | 'active' | 'complete' | 'error';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  avatar: string;
}

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  agentType?: AgentType;
  timestamp: Date;
  isVoice?: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  content?: string;
  lastModified: Date;
  metadata?: {
    extension?: string;
    language?: string;
    isTextFile?: boolean;
    isBinary?: boolean;
    projectId?: string;
    similarity?: number;
    [key: string]: any;
  };
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'draft' | 'confirmed' | 'executing' | 'complete';
  createdAt: Date;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  agentType: AgentType;
  result?: string;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  timestamp: Date;
  isGenerating?: boolean;
}