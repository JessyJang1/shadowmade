import {places} from './storyIdentity.ts';

export type MapPoint=readonly [number,number];
export const northBridgeZ=-10;
// The west and east spans meet opposite sides of the river's stone landing.
export const northDeckOffset=(across:number)=>.64*Math.max(-1,Math.min(1,across/1.60));
export const northDeckHalfWidth=1.07;
export const northDeckHalfSpan=3.28;
export const stoneDeckHalfWidth=1.10;
export const northDeckHeight=(across:number)=>.265+1.04*Math.pow(Math.max(0,1-(across/northDeckHalfSpan)**2),1.22);
export const marketPass={x:14.55,z:-7.25,halfWidth:1.33};
export const townBounds={west:-17,east:25,north:-20,south:13};
export const townRoads:{points:MapPoint[];width:number;street?:'main'|'lane'}[]=[
  {points:[[-21,21],[-12,12],[-8,7],[-4,5.2],[2.9,5.1],[5.6,2.8],[4.5,-3.8],[-.4,-6.3],[-5.6,-6.2],[-9.5,-9],[-12,-17],[-14,-22]],width:2.80,street:'main'},
  {points:[[-3.10,-7.1],[-3.95,-6.27],[-4.28,-4.16],[-4.62,-2.12],[-5.64,-1.35],[-7.78,-.95]],width:1.25,street:'lane'},
  {points:[[.57,5.1],[1.65,7.78],[2.20,11.5],[4.4,16],[4.6,21],[3.4,25]],width:1.83},
  {points:[[4.7,2.7],[5.4,3.7],[7.98,4],[13.86,4],[17.2,4.1],[19.55,3.41],[23.3,3.55]],width:2.43},
  {points:[[15.45,4.05],[17,6.05],[19.0,8.6],[22.7,8.44],[23.7,5.66],[23.3,3.55],[21.8,.54],[19.75,-1.9]],width:1.79},
  {points:[[-5.68,-6.38],[-5.48,-9.46],[-5.38,-12.1],[-7.39,-14.9],[-8.95,-16.37],[-10.91,-15.06]],width:1.82},
  {points:[[-7.43,-14.97],[-6.5,-17.41],[-3.27,-18.1],[-.64,-16.5]],width:1.54},
  {points:[[4.45,-3.8],[3.88,-5.31],[3.92,-6.88],[4.40,-8.36],[4.67,-10.64],[5.35,-10.64]],width:2.04},
  {points:[[10.03,-9.36],[11.13,-9.55],[13.46,-11.16],[15.07,-12.07]],width:2.18},
  {points:[[13.45,4.0],[13.16,1.66],[12.65,-1.6],[13.24,-4.58],[14.55,-7.25],[14.47,-9.3],[13.50,-10.85]],width:2.10},
];
export const landmarks={
  plaza:{label:'旋转木马',x:1.7,z:2.8},
  clock:{label:places.clock,x:-3.06,z:-7.1},
  workshop:{label:places.workshop,x:-7.78,z:-.95},
  bridge:{label:'运河桥',x:10.4,z:4},
  market:{label:'灯市码头',x:19.55,z:3.41},
  lookout:{label:'松影坡',x:-8.95,z:-16.37},
  pier:{label:places.pier,x:4.80,z:northBridgeZ-.64},
  observatory:{label:places.lighthouse,x:13.30,z:-11.10},
};
