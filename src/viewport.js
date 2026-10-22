// World/UI coordinates remain in the original scene units even when the
// backing bitmap has more pixels. Input and reticle bounds share this size.
export function sceneViewport(canvas) {
  return { width: canvas.sceneWidth ?? canvas.width, height: canvas.sceneHeight ?? canvas.height };
}
