# 深色玻璃与顶部按钮状态 · 2026-10-20

参考：已对用户两段 MP4 在本地解码抽帧，输出在 test-results/glass-dark/ref-*；参考深色底栏亮边很弱，未测得苹果的原始材质参数。

原因：现有 CSS 统一写死70%白色上沿，并非真实 WebGL 折射。另有 shell 通用按钮 hover 填充在点击后光标停留时形成灰色底，触屏可能保留模拟 hover。

修改：将顶部按钮、Dock、我的菜单/弹层的高光改成主题变量。浅色维持旧值，深色上沿4%、下沿1%，Dock 外沿4.7%。鼠标和触屏激活后 blur，键盘 detail=0 不移除焦点；排除通用 hover 灰底；高光 hover 仅精细指针。

实际验证：按钮点击后 focus=false / focus-visible=false；光标 hover=true 的语言按钮与其他按钮 background 完全一致。Tab 后我的按钮 focus-visible=true，outline=solid。浅色读取仍为上沿70%、下沿20%。深色 Dock 读取上沿.04、下沿.01、外沿.047。语言实际切换后已恢复中文，主题保持用户原有深色。类型检查及 diff 检查通过。

差异与未验证：CSS blur/highlight，仍非真实光线折射；未在用户 iPhone Safari 实机复测触屏，Chromium实际点击验证通过；没有宣称精确复刻苹果材质参数。
