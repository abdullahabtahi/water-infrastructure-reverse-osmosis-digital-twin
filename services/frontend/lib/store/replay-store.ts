import { create } from 'zustand';
import { ReplayState } from '../types';
import { addDays, parseISO, formatISO } from 'date-fns';

interface ReplayStore extends ReplayState {
  setCurrentDate: (date: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setAvailableDateRange: (range: [string, string]) => void;
  setSelectedUnitId: (unitId: string | null) => void;
  advanceTime: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
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
  
  advanceTime: () => {
    const { currentDate, speed, availableDateRange } = get();
    const current = parseISO(currentDate);
    const end = parseISO(availableDateRange[1]);
    
    let nextDate = addDays(current, speed);
    if (nextDate > end) {
      set({ isPlaying: false, currentDate: availableDateRange[1] });
      return;
    }
    set({ currentDate: formatISO(nextDate) });
  }
}));
