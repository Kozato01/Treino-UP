import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PhotoLabel = 'frente' | 'lado' | 'costas' | null;

export type ProgressPhoto = {
  id: number;
  date: number;
  dataUrl: string;
  label: PhotoLabel;
  note: string | null;
};

type State = {
  photos: ProgressPhoto[];
  nextId: number;
  addPhoto: (input: Omit<ProgressPhoto, 'id'>) => number;
  deletePhoto: (id: number) => void;
};

export const usePhotos = create<State>()(
  persist(
    (set, get) => ({
      photos: [],
      nextId: 1,
      addPhoto: (input) => {
        const id = get().nextId;
        set((s) => ({
          photos: [...s.photos, { id, ...input }],
          nextId: id + 1,
        }));
        return id;
      },
      deletePhoto: (id) =>
        set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
    }),
    {
      name: 'academia-photos',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Redimensiona um File para um dataURL JPEG com max=maxSide e qualidade dada.
export async function fileToCompressedDataUrl(
  file: File,
  maxSide = 800,
  quality = 0.8,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
