# 影生万物 · SHADOWMADE

一款实时 3D 光影解谜游戏。沿着雪镇寻找线索，组合真实投影造出星星与桥梁，最后通过双面幕布恢复归航灯。

- [在线试玩](https://shadowmade.jessyjang.com/)
- [Aholo 黑客松项目报告](https://shadowmade.jessyjang.com/report)
- [品牌与 3D 资产库](https://shadowmade.jessyjang.com/assets.html)

## 本地运行

使用 Node.js 24。

```sh
npm ci
npm run dev
```

浏览器打开终端给出的地址。点击「开始」后，先点击雪镇钟楼，查看门上的纸条。

```sh
npm test
npm run build
npm run preview
```

游戏源码在 `src/`，可运行模型、贴图和网页报告在 `public/`。报告正文可直接修改 `public/report/index.html`。

## 素材来源

- Aholo Lux3D 生成资产参与实际投影、影桥和遮光机关。任务 ID、加工方式和游戏实拍见[在线报告](https://shadowmade.jessyjang.com/report)。
- 雪杉、屋瓦、地形与猫的作者及许可见 [运行素材署名](public/asset-credits.txt)。
- 字体沿用 [Noto Sans SC 与 Noto Serif SC 的 OFL 许可](public/fonts/README.md)。依赖许可保存在 [submission/licenses](submission/licenses/)。
- 本评审快照未另行授予应用代码或项目原创素材的开源许可。第三方内容继续适用各自的许可。
