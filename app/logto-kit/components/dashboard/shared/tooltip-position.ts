interface TooltipPositionInput {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}

export function getClampedTooltipPosition({
  left,
  top,
  width,
  height,
  viewportWidth,
  viewportHeight,
  margin = 8,
}: TooltipPositionInput) {
  const maxLeft = Math.max(margin, viewportWidth - width - margin);
  const maxTop = Math.max(margin, viewportHeight - height - margin);

  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top: Math.min(Math.max(top, margin), maxTop),
  };
}
