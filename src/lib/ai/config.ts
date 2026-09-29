// Central AI & System Configuration
export const AI_CONFIG = {
  get GEMINI_ANALYSIS_MODEL() {
    return process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.5-flash';
  },
  get GEMINI_IMAGE_MODEL() {
    return process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  },
  get GEMINI_VIDEO_MODEL() {
    return process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview';
  },
  get TV_SETUP_PIN() {
    return process.env.TV_SETUP_PIN || '482731';
  },
  get IS_DEMO_MODE() {
    return process.env.DEMO_MODE === 'true';
  },
  get PRIMARY_API_KEY() {
    return process.env.GOOGLE_AI_API_KEY_PRIMARY || '';
  }
};
