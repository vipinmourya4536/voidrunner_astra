import { describe, expect, it } from 'vitest';
import { biomeForSector, biomeIndexForSector } from '../src/data/biomes';
import { SHIPS, shipArt } from '../src/data/ships';
import { SectorManager } from '../src/world/SectorManager';
import { pointToSegmentDistanceSquared } from '../src/core/math';
import { Ship, shipRockCollision } from '../src/player/Ship';
import { DIFFICULTIES } from '../src/data/difficulty';

describe('VoidRunner configuration',()=>{
  it('keeps the three baseline ships, removes Titan, and exposes two valid new roles',()=>{
    expect(SHIPS.slice(0,5).map(s=>s.name)).toEqual(['PIONEER','APEX','SAUCER','WRAITH','HELIX']);
    expect(SHIPS.some(s=>s.name==='TITAN')).toBe(false);
    expect(SHIPS.every(s=>s.gravity>0&&s.thrust<0&&s.maxSpeed>0&&shipArt(s).length>0)).toBe(true);
    expect(SHIPS.find(s=>s.name==='HELIX')!.fieldDurationMultiplier).toBeGreaterThan(1);
    expect(SHIPS.find(s=>s.name==='HELIX')!.fieldCooldownMultiplier).toBeLessThan(1);
    expect(SHIPS[2]!.bounce).toBe(true);
  });
  it('keeps difficulty modes ordered by pressure while preserving a standard default',()=>{
    expect(DIFFICULTIES.map(d=>d.name)).toEqual(['CADET','STANDARD','VETERAN','NIGHTMARE']);
    expect(DIFFICULTIES[0]!.safeCorridor).toBeGreaterThan(DIFFICULTIES[1]!.safeCorridor);
    expect(DIFFICULTIES[3]!.density).toBeGreaterThan(DIFFICULTIES[1]!.density);
  });
  it('maps all source biome ranges without collapsing stages',()=>{
    expect(biomeIndexForSector(1)).toBe(0);expect(biomeForSector(3).name).toBe('NEBULA DRIFT');expect(biomeForSector(25).name).toBe('VOID ASCENSION');
  });
});

describe('fixed-step gameplay helpers',()=>{
  it('calculates sector progression at 500m',()=>{const s=new SectorManager();s.update(499.99);expect(s.current).toBe(1);s.update(500);expect(s.current).toBe(2);});
  it('uses squared point-to-segment distance',()=>{expect(pointToSegmentDistanceSquared(5,3,0,0,10,0)).toBe(9);});
  it('preserves the inset rectangle asteroid collision feel',()=>{const ship=new Ship();ship.reset(0,100,100);expect(shipRockCollision(ship,{x:100,y:100,radius:10})).toBe(true);expect(shipRockCollision(ship,{x:1000,y:1000,radius:10})).toBe(false);});
  it('keeps nitro bounded and changes thrust speed',()=>{const ship=new Ship();ship.reset(0,100,100);for(let i=0;i<240;i++)ship.update(0,true,true,null,()=>{});expect(ship.nitro).toBeGreaterThanOrEqual(0);expect(ship.nitro).toBeLessThanOrEqual(100);expect(Math.abs(ship.vy)).toBeLessThanOrEqual(6.5);});
});
