export type OperatingMode = 'chat' | 'image-creator' | 'workspace';

export type AgentType = 'planner' | 'worker' | 'supervisor' | 'error-fixer';

export type WorkMode = 'plan' | 'act';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
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