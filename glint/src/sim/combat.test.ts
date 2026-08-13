import { describe, expect, it } from 'vitest';
import { createHero } from './hero.ts';
import {
  grantXp,
  healHero,
  hitHero,
  restoreAtCrystal,
  tryAttack,
} from './combat.ts';
import {
  MAGIC_COST,
  MAX_LEVEL,
  MELEE_DAMAGE,
  SLIME_HP,
  magicDamage,
  maxHp,
  maxMp,
  xpToNext,
} from './stats.ts';

describe('stats', () => {
  it('nível 1 começa com 10/10', () => {
    expect(maxHp(1)).toBe(10);
    expect(maxMp(1)).toBe(10);
  });

  it('nível 2 replica o vídeo: HP 16, MP 12', () => {
    expect(maxHp(2)).toBe(16);
    expect(maxMp(2)).toBe(12);
  });

  it('magia no nível 1 não one-shot o slime; no 3 sim', () => {
    expect(magicDamage(1)).toBeLessThan(SLIME_HP);
    expect(magicDamage(1) * 2).toBe(SLIME_HP);
    expect(magicDamage(3)).toBeGreaterThanOrEqual(SLIME_HP);
  });

  it('três slimes (24 XP) passam do limiar do nível 2', () => {
    expect(8 * 3).toBeGreaterThanOrEqual(xpToNext(1));
    expect(8 * 2).toBeLessThan(xpToNext(1));
  });
});

describe('combate', () => {
  it('magia gasta 2 MP e devolve o raio grande', () => {
    const hero = createHero(0, 0);
    const atk = tryAttack(hero);
    expect(atk?.kind).toBe('magic');
    expect(atk?.mpSpent).toBe(MAGIC_COST);
    expect(hero.mp).toBe(8);
    expect(atk?.damage).toBe(magicDamage(1));
  });

  it('sem MP cai no cutelo grátis', () => {
    const hero = createHero(0, 0);
    hero.mp = 1;
    const atk = tryAttack(hero);
    expect(atk?.kind).toBe('melee');
    expect(atk?.damage).toBe(MELEE_DAMAGE);
    expect(atk?.mpSpent).toBe(0);
    expect(hero.mp).toBe(1);
  });

  it('cooldown impede spam no mesmo instante', () => {
    const hero = createHero(0, 0);
    expect(tryAttack(hero)).not.toBeNull();
    expect(tryAttack(hero)).toBeNull();
  });

  it('contato mata no último ponto e marca alive=false', () => {
    const hero = createHero(0, 0);
    hero.hp = 1;
    expect(hitHero(hero, 1)).toBe(1);
    expect(hero.alive).toBe(false);
    expect(hitHero(hero, 4)).toBe(0);
  });

  it('cura não passa do máximo', () => {
    const hero = createHero(0, 0);
    hero.hp = 7;
    expect(healHero(hero, 10)).toBe(3);
    expect(hero.hp).toBe(10);
  });

  it('cristal aplica o +10 do vídeo e enche MP', () => {
    const hero = createHero(0, 0);
    hero.hp = 4;
    hero.mp = 2;
    const rest = restoreAtCrystal(hero);
    expect(rest?.hp).toBe(6);
    expect(hero.hp).toBe(10);
    expect(hero.mp).toBe(10);
    expect(restoreAtCrystal(hero)).toBeNull();
  });
});

describe('level-up', () => {
  it('20 XP sobem para o nível 2, curam tudo e sobem os tetos', () => {
    const hero = createHero(0, 0);
    hero.hp = 3;
    hero.mp = 1;
    const result = grantXp(hero, 20);
    expect(result.leveled).toBe(true);
    expect(result.to).toBe(2);
    expect(result.hpGained).toBe(6);
    expect(hero.level).toBe(2);
    expect(hero.maxHp).toBe(16);
    expect(hero.maxMp).toBe(12);
    expect(hero.hp).toBe(16);
    expect(hero.mp).toBe(12);
    expect(hero.xp).toBe(0);
  });

  it('XP extra permanece depois de subir', () => {
    const hero = createHero(0, 0);
    grantXp(hero, 24);
    expect(hero.level).toBe(2);
    expect(hero.xp).toBe(4);
  });

  it('uma avalanche de XP não passa do nível máximo', () => {
    const hero = createHero(0, 0);
    grantXp(hero, 10_000);
    expect(hero.level).toBe(MAX_LEVEL);
    expect(hero.xp).toBe(0);
    expect(hero.maxHp).toBe(maxHp(MAX_LEVEL));
  });

  it('morto não sobe de nível', () => {
    const hero = createHero(0, 0);
    hero.alive = false;
    const result = grantXp(hero, 40);
    expect(result.leveled).toBe(false);
    expect(hero.level).toBe(1);
  });
});
