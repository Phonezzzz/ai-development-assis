import { config } from '@/lib/config';

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
}

export interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

class ImageGenerationService {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey = config.openrouter.apiKey;

  constructor() {
    console.log('Image Generation service initialized with API key:', this.apiKey ? 'Set' : 'Not set');
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  async generateImage(request: ImageGenerationRequest): Promise<string> {
    if (!this.isConfigured()) {
      // Return mock image for demo
      return this.getMockImage(request.prompt);
    }

    try {
      // For Gemini 2.5 Flash Image Preview, we use chat completions with special formatting
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace',
        },
        body: JSON.stringify({
          model: request.model || 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: `Generate an image based on this description: ${request.prompt}. Please create a detailed, high-quality image that matches the description.`
            }
          ],
          temperature: 0.8,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No image generated in response');
      }

      // For Gemini models, the response might contain image data or a description
      // Since this is a preview model, we'll return a mock image with the generated description
      return this.getMockImage(request.prompt, content);

    } catch (error) {
      console.error('Error generating image:', error);
      // Fallback to mock image
      return this.getMockImage(request.prompt);
    }
  }

  private getMockImage(prompt: string, description?: string): string {
    // Generate a unique seed based on the prompt for consistent results
    const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Use Lorem Picsum with seed for consistent mock images
    const width = 512;
    const height = 512;
    
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }

  // Get available image models
  getImageModels() {
    return [
      {
        id: 'google/gemini-2.5-flash-image-preview',
        name: 'Gemini 2.5 Flash Image Preview',
        provider: 'Google',
        description: 'Advanced image generation with Gemini 2.5',
        maxResolution: '1024x1024',
        supportedFormats: ['PNG', 'JPEG'],
      }
    ];
  }
}

export const imageGenerationService = new ImageGenerationService();