import fs from "node:fs";
const pairs = `8136|窄握卧推
8126|阿诺德推举
8090|相扑硬拉
8043|耸肩
8016|挺举
7969|倒立撑
7920|前水平抬升
7861|负重双杠臂屈伸
7856|单臂俯卧撑
7834|吉龙达胸触杠引体向上
7810|背后腕弯举
7759|上斜凳胸托划船
7726|单臂臂屈伸
7722|仰卧交替触踵
7644|高位下拉
7595|侧卧抬腿
7576|仰卧起坐
7551|卧推
7544|面拉
7515|高脚杯深蹲
7460|跪姿后踢腿
7445|负重双杠屈臂撑胸
7398|臂屈伸
7332|相扑深蹲
7326|上斜俯卧撑
7292|负重俄罗斯转体
7279|仰卧臂屈伸
7274|高翻拉
7251|悬垂抓举
7246|梅多斯划船
7207|地板卧推
7157|过顶深蹲
7150|集中弯举
7142|仰卧臂屈伸
7138|农夫行走
7126|钻石俯卧撑
7117|后撤弓步
7083|潘德雷划船
5573|弯举
4916|双力臂
4873|蛙跳
4865|引体向上
4862|单腿臀桥
4854|分腿蹲
4724|宽握卧推
4719|弓步蹲
4685|借力引体向上
4646|俯身飞鸟
4639|吊环臂屈伸
4629|肩胛引体向上
4605|反握弯举
4577|直腿硬拉
4570|悬垂
4560|空心支撑摇摆
4552|俄罗斯转体
4493|单腿臀推
4489|双杠提膝
4485|仰卧交替打腿
4479|仰卧提膝
4444|推胸
4438|环绕飞鸟
4388|坐姿提踵
4377|西西深蹲
4367|双杠举腿
4357|蜘蛛爬行
4300|硬拉
4290|锤式弯举
4283|坐姿过顶推举
4273|负重俯卧撑
4270|臂屈伸
4261|仰卧上拉
4254|土耳其起立
4250|侧腹卷腹
4186|深蹲推举
2020|高脚杯深蹲
2016|借力推举
2014|站姿推举
2012|反向平板支撑
2010|前平举
2018|臀推
1994|弓步蹲
1992|下斜卧推
2008|V字两头起
1996|佐特曼弯举
1998|深蹲跳
2000|叛逆者划船
2002|T杠划船
2004|臀桥
2006|靠墙静蹲
1990|高位下拉
1984|单腿罗马尼亚硬拉
1985|站姿腿弯举
1986|前蹲
1988|上斜卧推
1896|臀腿挺身
1892|单臂高位下拉
1890|硬拉
1888|超人式
1886|蹬腿提踵
1884|高位下拉
1894|泽奇深蹲
1864|直立划船
1861|交叉锤式弯举
1862|哈克深蹲
1866|三头肌下压
1874|上斜卧推
1876|侧平举
1878|耸肩
1868|下斜卷腹
1666|折刀仰卧起坐
1659|消防栓式抬腿
1660|双杠屈臂撑胸
1661|俯身臂屈伸
1655|卷腹
1654|架上硬拉
1653|早安式
1652|弯举
1651|卧推
1650|侧弓步蹲`;
const body = Object.fromEntries(pairs.split("\n").map((s) => s.split("|")));
const rows = JSON.parse(fs.readFileSync("src/data/hevy-exercises.json"));
const labels = {
  barbell: "杠铃",
  dumbbell: "哑铃",
  machine: "器械",
  none: "自重",
  bodyweight: "自重",
  kettlebell: "壶铃",
  "resistance-band": "弹力带",
  "suspension-band": "悬挂带",
  other: "其他器材",
};
// Title-specific equipment takes precedence over coarse/contradictory website tags.
const explicit = {
  7644: "resistance-band",
  1990: "cable",
  1866: "cable",
  1655: "cable",
  5573: "weight-plate",
  4444: "weight-plate",
  2010: "weight-plate",
  2020: null,
  4639: "suspension-band",
};
const names = {};
for (const r of rows) {
  if (!body[r.id]) throw Error("Untranslated " + r.name);
  if (Object.hasOwn(explicit, r.id)) r.equipment = explicit[r.id];
  const suffix =
    r.equipment === "cable"
      ? "绳索"
      : r.equipment === "weight-plate"
        ? "杠铃片"
        : labels[r.equipment];
  names[r.id] = body[r.id] + (suffix ? `（${suffix}）` : "");
}
fs.writeFileSync(
  "src/data/hevy-exercises.json",
  JSON.stringify(rows, null, 2) + "\n",
);
fs.writeFileSync(
  "src/data/hevy-exercises-zh.json",
  JSON.stringify(names, null, 2) + "\n",
);
fs.writeFileSync(
  "src/data/hevy-exercises-source.json",
  JSON.stringify(
    {
      source: "https://www.hevyapp.com/exercises/",
      retrieved: "2026-10-21",
      pages: 13,
      count: rows.length,
      coverage:
        "Public website directory only; not the complete Hevy app catalog",
      content:
        "Names and classification facts only; no images, animations or instruction text",
      equipmentOverrides: explicit,
    },
    null,
    2,
  ) + "\n",
);
console.log("Localized", rows.length);
