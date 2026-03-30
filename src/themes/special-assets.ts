export const SPECIAL_TEXTURE_KEYS = {
  monkey: "special_monkey",
  iceOverlay: "special_ice_overlay",
  foodsBackground: "bg_foods",
  landmarksBackground: "bg_landmarks",
  planetsBackground: "bg_planets",
} as const;

export const SPECIAL_ASSET_PATHS: Record<(typeof SPECIAL_TEXTURE_KEYS)[keyof typeof SPECIAL_TEXTURE_KEYS], string> = {
  [SPECIAL_TEXTURE_KEYS.monkey]: "/assets/special/monkey.png",
  [SPECIAL_TEXTURE_KEYS.iceOverlay]: "/assets/special/ice_overlay.png",
  [SPECIAL_TEXTURE_KEYS.foodsBackground]: "/assets/backgrounds/foods.png",
  [SPECIAL_TEXTURE_KEYS.landmarksBackground]: "/assets/backgrounds/landmarks.png",
  [SPECIAL_TEXTURE_KEYS.planetsBackground]: "/assets/backgrounds/planets.png",
};
