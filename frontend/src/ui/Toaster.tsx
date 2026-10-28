import React, { createContext, useCallback, useContext, useState } from 'react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem { id: number; text: string; tone: Tone }

const ToasterContext = createContext<{ show: (text: string, tone?: Tone) => void } | undefined>(undefined);

export const useToaster = () => {
  const context = useContext(ToasterContext);
  if (!context) throw new Error('useToaster must be used within a Toaster');
  return context;
};

/** App-wide toasts, bottom right. */
export const Toaster: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const color = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-zinc-800' };
  return (
    <ToasterContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${color[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
};
