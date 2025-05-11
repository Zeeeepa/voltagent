import { PerplexityProvider } from './index';

describe('PerplexityProvider', () => {
  let provider: PerplexityProvider;
  
  beforeEach(() => {
    // Create a provider with a mock client
    provider = new PerplexityProvider({
      client: {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      }
    });
  });
  
  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  
  it('should convert messages correctly', () => {
    const message = {
      role: 'user',
      content: 'Hello, world!'
    };
    
    const result = provider.toMessage(message as any);
    expect(result).toEqual(message);
  });
  
  it('should return the model identifier', () => {
    const model = 'sonar-medium-online';
    const result = provider.getModelIdentifier(model);
    expect(result).toBe(model);
  });
});

