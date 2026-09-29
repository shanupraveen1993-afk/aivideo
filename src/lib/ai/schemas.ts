import { z } from 'zod';

export const GarmentAnalysisSchema = z.object({
  valid: z.boolean(),
  category: z.string(),
  garmentType: z.string(),
  coverage: z.enum(['top_only', 'full_set']),
  primaryColor: z.string(),
  secondaryColors: z.array(z.string()).default([]),
  fabricAppearance: z.string(),
  embroideryDescription: z.string(),
  patternDescription: z.string(),
  additionalPhotoRequired: z.boolean().default(false),
  requestedPhotos: z.array(z.string()).default([]),
  complementaryPieces: z.object({
    recommendedBottom: z.string(),
    rationale: z.string()
  }).optional(),
  operatorMessage: z.string()
});

export type GarmentAnalysis = z.infer<typeof GarmentAnalysisSchema>;

export const PersonAnalysisSchema = z.object({
  valid: z.boolean(),
  subjectGroup: z.enum(['adult', 'child']),
  fullBodyVisible: z.boolean(),
  faceVisible: z.boolean(),
  lightingQuality: z.enum(['excellent', 'acceptable', 'poor']),
  additionalPhotoRequired: z.boolean().default(false),
  requestedPhotos: z.array(z.string()).default([]),
  operatorMessage: z.string()
});

export type PersonAnalysis = z.infer<typeof PersonAnalysisSchema>;
