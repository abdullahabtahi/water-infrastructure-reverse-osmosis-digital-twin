import { create } from 'zustand';
import { ReplayState } from '../types';

interface ReplayStore extends ReplayState {
  setCurrentDate: (date: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setAvailableDateRange: (range: [string, string]) => void;
  setSelectedUnitId: (unitId: string | null) => void;
}

export const useReplayStore = create<ReplayStore>((set) => ({
  currentDate: "2019-01-01T00:00:00Z",
  isPlaying: false,
  speed: 1,
  availableDateRange: ["2019-01-01T00:00:00Z", "2021-01-13T00:00:00Z"],
  selectedUnitId: null,
  
  setCurrentDate: (date) => set({ currentDate: date }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSpeed: (speed) => set({ speed }),
  setAvailableDateRange: (range) => set({ availableDateRange: range }),
  setSelectedUnitId: (unitId) => set({ selectedUnitId: unitId }),
}));
