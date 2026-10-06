// The STUDLYF brand gradient — ONE config, shared by every surface that carries the
// animated WebGL wash. Extracted after the signed-in dashboard backdrop and the public
// ecosystem landing heroes drifted apart in colour: the dashboards are the reference look,
// and the landing pages must match them exactly. Change it here once, both follow.
//
// `speed` stays slow (9) so the wash reads as ambient drift, never churn. Fed to the
// 21st.dev WebGL "animated-gradient" as a `custom` preset with an edge-shaped flow.
export const BRAND_GRADIENT = {
  preset: 'custom',
  color1: '#08060F',
  color2: '#6C4DFF',
  color3: '#EC4899',
  rotation: 20,
  proportion: 45,
  scale: 0.5,
  speed: 9,
  distortion: 5,
  swirl: 55,
  swirlIterations: 8,
  softness: 100,
  offset: -160,
  shape: 'Edge',
  shapeSize: 42,
}

// Light-theme ramp: the same geometry and motion lifted into airy pastels — near-white
// lavender base through soft violet into light rose — so under [data-theme=light] the wash
// reads bright and delicate instead of dark colours showing through a light scrim. Only the
// colours change; every shape/motion value is inherited.
export const BRAND_GRADIENT_LIGHT = {
  ...BRAND_GRADIENT,
  color1: '#F3F1FB',
  color2: '#B9A6FF',
  color3: '#F7B8D6',
}

/** Pick the ramp for the active theme. `light` is `theme === 'light'`. */
export function brandGradient(light) {
  return light ? BRAND_GRADIENT_LIGHT : BRAND_GRADIENT
}
