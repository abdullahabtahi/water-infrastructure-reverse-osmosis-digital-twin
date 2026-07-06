import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { streamAgentResponse } from '../api/agent';

export interface SourceTrace {
  figure_text: string;
  capability: string;
  unit_id: string;
  evidence_summary: string;
  evidence_payload?: any;
}

export interface RecordWritingProposal {
  proposal_id: string;
  record_type: "recommendation_log" | "decision" | "cip_plan";
  payload: any;
  status: "pending" | "approved" | "dismissed";
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  sourcedFigures?: SourceTrace[];
  proposal?: RecordWritingProposal;
  isStreaming?: boolean;
}

interface AssistantState {
  isOpen: boolean;
  sessionId: string | null;
  messages: Message[];
  isThinking: boolean;
  
  toggle: () => void;
  open: () => void;
  close: () => void;
  clearSession: () => void;
  
  sendMessage: (text: string) => Promise<void>;
  updateMessageProposalStatus: (messageId: string, status: 'approved' | 'dismissed') => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isThinking: false,
  
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  clearSession: () => set({ messages: [], sessionId: null }),
  
  sendMessage: async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: text,
    };
    
    // Add empty model message placeholder
    const modelMsgId = uuidv4();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      isStreaming: true,
    };
    
    set((state) => ({ 
      messages: [...state.messages, userMsg, modelMsg],
      isThinking: true,
      isOpen: true
    }));
    
    const { sessionId, messages } = get();
    
    try {
      const { interactionId } = await streamAgentResponse(
        text,
        sessionId,
        (newText, rawChunk) => {
          // Update the message content as we stream
          set((state) => {
            const updatedMessages = [...state.messages];
            const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
            if (msgIndex !== -1) {
              updatedMessages[msgIndex] = {
                ...updatedMessages[msgIndex],
                content: updatedMessages[msgIndex].content + newText
              };
            }
            return { messages: updatedMessages };
          });
        }
      );
      
      // Update session ID if we got a new one, and mark streaming complete
      set((state) => {
        const updatedMessages = [...state.messages];
        const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
        
        // After stream is done, we could theoretically parse out proposal/sourcedFigures 
        // if they are embedded in the text. For now, just mark stream done.
        if (msgIndex !== -1) {
          updatedMessages[msgIndex] = {
            ...updatedMessages[msgIndex],
            isStreaming: false
          };
        }
        
        return { 
          sessionId: interactionId, 
          isThinking: false,
          messages: updatedMessages
        };
      });
      
    } catch (err) {
      console.error("Failed to get agent response:", err);
      // Replace placeholder with error
      set((state) => {
        const updatedMessages = [...state.messages];
        const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
        if (msgIndex !== -1) {
          updatedMessages[msgIndex] = {
            ...updatedMessages[msgIndex],
            content: "Sorry, I encountered an error communicating with the backend agent.",
            isStreaming: false
          };
        }
        return { isThinking: false, messages: updatedMessages };
      });
    }
  },
  
  updateMessageProposalStatus: (messageId, status) => {
    set((state) => {
      const updatedMessages = [...state.messages];
      const msgIndex = updatedMessages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1 && updatedMessages[msgIndex].proposal) {
        updatedMessages[msgIndex] = {
          ...updatedMessages[msgIndex],
          proposal: {
            ...updatedMessages[msgIndex].proposal!,
            status
          }
        };
      }
      return { messages: updatedMessages };
    });
  }
}));
