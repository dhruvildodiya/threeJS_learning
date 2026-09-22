/**
 * Utility functions for animations and calculations
 */

export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
