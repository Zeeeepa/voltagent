import { Agent } from '../src/core/agent';
import { AgentConfig } from '../src/types/agent';

describe('Agent', () => {
  const mockConfig: AgentConfig = {
    name: 'test-agent',
    description: 'A test agent',
    provider: 'openai',
    model: 'gpt-4',
  };

  let agent: Agent;

  beforeEach(() => {
    agent = new Agent(mockConfig);
  });

  it('should create an agent with the given config', () => {
    expect(agent.getName()).toBe('test-agent');
    expect(agent.getConfig()).toEqual(mockConfig);
  });

  it('should execute a prompt and return a response', async () => {
    const prompt = 'Hello, world!';
    const response = await agent.execute(prompt);

    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('usage');
    expect(response.content).toContain(prompt);
  });
});

