import { heightAt } from './heightfield.ts';

/**
 * Interseção analítica de um raio com o terreno, marchando pela heightfield.
 * Bem mais barato que raycast contra a malha (~96 mil triângulos) e não
 * depende da geometria estar carregada.
 */
export function raycastGround(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
): { x: number; z: number } | null {
  const step = 1.5;
  const maxDistance = 900;
  let prev = oy - heightAt(ox, oz);
  for (let t = step; t < maxDistance; t += step) {
    const d = oy + dy * t - heightAt(ox + dx * t, oz + dz * t);
    if (prev > 0 && d <= 0) {
      let lo = t - step;
      let hi = t;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const m = oy + dy * mid - heightAt(ox + dx * mid, oz + dz * mid);
        if (m > 0) lo = mid;
        else hi = mid;
      }
      const hit = (lo + hi) / 2;
      return { x: ox + dx * hit, z: oz + dz * hit };
    }
    prev = d;
  }
  return null;
}
