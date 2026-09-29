import { describe, expect, it } from 'vitest';
import { biomeForSector, biomeIndexForSector } from '../src/data/biomes';
import { SHIPS } from '../src/data/ships';
import { SectorManager } from '../src/world/SectorManager';
import { pointToSegmentDistanceSquared } from '../src/core/math';
import { Ship, shipRockCollision } from '../src/player/Ship';

describe('VoidRunner source parity data',()=>{
  it('keeps all four source ships and exact physics constants',()=>{
    expect(SHIPS.map(s=>s.name)).toEqual(['PIONEER','APEX','SAUCER','TITAN']);
    expect(SHIPS.map(s=>[s.gravity,s.thrust,s.maxSpeed,s.worldSpeedMod,s.dampening])).toEqual([[.21,-.44,6.5,1,.978],[.27,-.56,8,1.25,.955],[.1,-.22,4.5,.95,.985],[.4,-.72,9,.65,.96]]);
    expect(SHIPS[2]!.bounce).toBe(true);
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
