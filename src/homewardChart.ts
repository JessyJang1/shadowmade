import { CanvasTexture, SRGBColorSpace } from 'three';
import { painted } from './paint';

// Ink and paper share the projection receiver. From shore the same inscription
// reads backwards; walking around the cloth physically reverses it.
export function homewardChart() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 680;
  const pen = canvas.getContext('2d')!;
  pen.fillStyle = pen.createPattern(painted('paper').image, 'repeat')!;
  pen.fillRect(0, 0, canvas.width, canvas.height);
  pen.translate(canvas.width, 0);
  pen.scale(-1, 1);
  pen.strokeStyle = '#937f74';
  pen.lineWidth = 2;
  pen.strokeRect(26, 25, 1228, 630);
  pen.strokeRect(34, 33, 1212, 614);
  pen.fillStyle = '#53485a';
  pen.textAlign = 'center';
  pen.font = '600 65px "Shadowmade Sans","PingFang SC",sans-serif';
  pen.fillText('归 航 图', 640, 124);
  pen.font = '24px "Shadowmade Sans","PingFang SC",sans-serif';
  pen.fillText('北 岸 灯 塔　·　守 灯 人 绘', 640, 170);
  pen.beginPath();
  for (const x of [174, 810]) {
    pen.moveTo(x, 103);
    pen.lineTo(x + 296, 103);
  }
  pen.stroke();
  // An asymmetric vessel makes the change of reading direction visible
  // even to players who cannot recognise mirrored lettering.
  pen.save();
  pen.translate(1074, 232);
  pen.fillStyle = '#776d78';
  const sail = new Path2D('M-50 17 L-8 -68 L-8 12 Z M0 -61 Q28 -38 41 8 L0 12 Z M-72 23 Q-28 37 65 14 L42 39 Q0 53 -50 42 Z');
  pen.fill(sail);
  pen.restore();
  pen.strokeStyle = '#ab9b96';
  for (let i = 0; i < 3; i++) {
    pen.beginPath();
    pen.moveTo(976 + i * 18, 288 + 10 * i);
    pen.bezierCurveTo(1028, 274 + 12 * i, 1092, 309 + 8 * i, 1168 - i * 12, 282 + 11 * i);
    pen.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
