# 品牌与三餐独立页面

- 配置页面实际路由文件仅保留 src/app/(private)/config/page.tsx，删除旧 train/page.tsx。next.config.ts 通过永久重定向兼容 /train，HTTP 308，自动保留 date 参数。导航、返回配置与性能检查使用 /config。
- 三餐入口改为 /meals。独立页复用 Meals 组件、meals/photos API、现有上传/备注与用户隔离，无数据库变化。移除 Dashboard 中旧 openMeals 查询处理和隐藏三餐弹窗。桌面三餐并列，窄屏单列。
- 原图保存在 public/brand/kuizfit-425709cb35-original.png，1254×1254。所有输出等比完整缩放，无裁切或主题反色。80×80 WebP 在左上角以40×40显示，约1.4KB，kuizFit文字保留。
- 同目录生成16、32、48、180、192、512 PNG及webmanifest；src/app/favicon.ico包含16/32/48 RGBA PNG，兼容Next开发环境ICO解码。根metadata注册PNG favicon、Apple图标与manifest，Next自动注册favicon.ico。
- 内容哈希文件名对应Cache-Control public,max-age=31536000,immutable。公开brand静态目录排除鉴权cookie刷新代理，私有页面/API鉴权不变。实测WebP、PNG、ICO及manifest均HTTP 200。
- 浏览器实测 /meals 有早餐、午餐、晚餐三个编辑区，无打开的dialog；Logo图片完成解码。深浅主题均检查，浅色日期控件使用light原生配色。未上传测试照片、未写入用户三餐记录。
- 90项回归测试、Lint与类型检查通过；webpack生产构建验证 /config、/meals 和 favicon.ico。
- 截图：test-results/training-workbench/meals-brand-dark.png、meals-brand-light.png。
