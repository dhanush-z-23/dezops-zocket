import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BrandGuide } from '@/types';
import { generateId } from '@/lib/utils';

interface BrandState {
  brands: BrandGuide[];

  createBrand: (data: Partial<BrandGuide> & { name: string }) => BrandGuide;
  updateBrand: (brandId: string, updates: Partial<BrandGuide>) => void;
  deleteBrand: (brandId: string) => void;
  getBrandById: (brandId: string) => BrandGuide | undefined;
  addReferenceImage: (brandId: string, url: string) => void;
  removeReferenceImage: (brandId: string, url: string) => void;
  setAIGeneratedGuide: (brandId: string, guide: string) => void;
}

const DEMO_BRANDS: BrandGuide[] = [
  {
    id: 'brand-1',
    name: 'Zocket',
    logoUrl: null,
    primaryColors: ['#6366F1', '#4F46E5'],
    secondaryColors: ['#F59E0B', '#10B981'],
    fonts: ['Inter', 'Space Grotesk'],
    tonOfVoice: 'Professional, modern, and approachable. We speak with confidence but remain friendly.',
    doList: [
      'Use consistent spacing and alignment',
      'Keep copy concise and action-oriented',
      'Use brand colors as primary accent',
      'Include the logo in all external materials',
    ],
    dontList: [
      'Use more than 3 colors in a single creative',
      'Stretch or distort the logo',
      'Use decorative fonts for body text',
      'Overcrowd designs with too much content',
    ],
    referenceImageUrls: [],
    description: 'Zocket is a modern marketing platform. Our brand is bold, clean, and data-driven.',
    aiGeneratedGuide: null,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'brand-2',
    name: 'Acme Corp',
    logoUrl: null,
    primaryColors: ['#1E40AF', '#1E3A8A'],
    secondaryColors: ['#F97316', '#FBBF24'],
    fonts: ['Poppins', 'DM Sans'],
    tonOfVoice: 'Corporate, trustworthy, and innovative. Speak with authority and clarity.',
    doList: [
      'Maintain corporate blue as primary',
      'Use high-quality stock photography',
      'Include client testimonials where possible',
    ],
    dontList: [
      'Use casual language in formal materials',
      'Mix brand colors from different palettes',
      'Use low-resolution images',
    ],
    referenceImageUrls: [],
    description: 'Acme Corp is an enterprise B2B solutions company. Trustworthy and innovative.',
    aiGeneratedGuide: null,
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-03-10T09:00:00.000Z',
  },
];

export const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      brands: DEMO_BRANDS,

      createBrand: (data) => {
        const now = new Date().toISOString();
        const brand: BrandGuide = {
          id: generateId(),
          name: data.name,
          logoUrl: data.logoUrl ?? null,
          primaryColors: data.primaryColors ?? [],
          secondaryColors: data.secondaryColors ?? [],
          fonts: data.fonts ?? [],
          tonOfVoice: data.tonOfVoice ?? '',
          doList: data.doList ?? [],
          dontList: data.dontList ?? [],
          referenceImageUrls: data.referenceImageUrls ?? [],
          description: data.description ?? '',
          aiGeneratedGuide: null,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ brands: [...state.brands, brand] }));
        return brand;
      },

      updateBrand: (brandId, updates) => {
        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId
              ? { ...b, ...updates, updatedAt: new Date().toISOString() }
              : b,
          ),
        }));
      },

      deleteBrand: (brandId) => {
        set((state) => ({
          brands: state.brands.filter((b) => b.id !== brandId),
        }));
      },

      getBrandById: (brandId) => {
        return get().brands.find((b) => b.id === brandId);
      },

      addReferenceImage: (brandId, url) => {
        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId
              ? {
                  ...b,
                  referenceImageUrls: [...b.referenceImageUrls, url],
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }));
      },

      removeReferenceImage: (brandId, url) => {
        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId
              ? {
                  ...b,
                  referenceImageUrls: b.referenceImageUrls.filter((u) => u !== url),
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }));
      },

      setAIGeneratedGuide: (brandId, guide) => {
        set((state) => ({
          brands: state.brands.map((b) =>
            b.id === brandId
              ? { ...b, aiGeneratedGuide: guide, updatedAt: new Date().toISOString() }
              : b,
          ),
        }));
      },
    }),
    { name: 'designops-brands' },
  ),
);
