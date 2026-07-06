import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssistantTrigger } from '@/components/assistant/assistant-trigger';

describe('AssistantTrigger', () => {
  it('renders the assistant trigger button', () => {
    render(<AssistantTrigger />);
    const button = screen.getByRole('button', { name: /RO Assistant/i });
    expect(button).toBeDefined();
  });
});
