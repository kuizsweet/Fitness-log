import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync("src/data/free-exercise-db.json", "utf8"),
);
const exact = Object.fromEntries(
  `
3/4 Sit-Up|四分之三程仰卧起坐
90/90 Hamstring|90度仰卧腘绳肌拉伸
Adductor|内收肌拉伸
Adductor/Groin|内收肌与腹股沟拉伸
Air Bike|仰卧交替蹬车
All Fours Quad Stretch|四点支撑股四头肌拉伸
Alternate Heel Touchers|仰卧交替触踵
Alternate Leg Diagonal Bound|交替单腿斜向跨跳
Ankle On The Knee|搭腿臀肌拉伸
Anti-Gravity Press|俯卧抗重力推举
Around The Worlds|哑铃环绕飞鸟
Atlas Stone Trainer|阿特拉斯石训练器
Atlas Stones|阿特拉斯石搬举
Backward Drag|倒退拖雪橇
Backward Medicine Ball Throw|药球后抛
Balance Board|平衡板训练
Bear Crawl Sled Drags|熊爬拖雪橇
Behind Head Chest Stretch|抱头扩胸拉伸
Bench Dips|凳上臂屈伸
Bench Jump|跳凳
Bench Sprint|踏凳快跑
Bent Press|侧屈推举
Bicycling|骑自行车
Bicycling, Stationary|固定自行车骑行
Body-Up|前臂支撑起身
Body Tricep Press|自重臂屈伸
Bosu Ball Cable Crunch With Side Bends|波速球绳索卷腹侧屈
Bottoms-Up Clean From The Hang Position|悬垂壶铃倒提翻举
Bottoms Up|仰卧举腿抬臀
Box Jump (Multiple Response)|连续跳箱
Box Skip|跨步上箱
Brachialis-SMR|肱肌筋膜放松
Bradford/Rocky Presses|布拉德福德绕头推举
Butt-Ups|平板支撑提臀
Butt Lift (Bridge)|臀桥
Butterfly|蝴蝶机夹胸
Cable Iron Cross|绳索十字夹胸
Cable Judo Flip|绳索柔道翻转
Calf-Machine Shoulder Shrug|提踵机耸肩
Calf Press|蹬踵
Calf Press On The Leg Press Machine|腿举机蹬踵
Calf Raise On A Dumbbell|踩哑铃提踵
Calf Stretch Elbows Against Wall|肘撑墙小腿拉伸
Calf Stretch Hands Against Wall|手撑墙小腿拉伸
Car Deadlift|汽车硬拉
Car Drivers|杠铃片方向盘转动
Carioca Quick Step|交叉步敏捷跑
Cat Stretch|猫式拉伸
Catch and Overhead Throw|药球接球过顶抛掷
Chain Handle Extension|铁链握把臂屈伸
Chain Press|铁链卧推
Chair Leg Extended Stretch|坐椅伸腿拉伸
Chair Lower Back Stretch|坐椅下背拉伸
Chair Upper Body Stretch|坐椅上身拉伸
Chest And Front Of Shoulder Stretch|胸部与肩前侧拉伸
Chest Push from 3 point stance|三点起姿药球推掷
Chest Push (multiple response)|连续药球胸前推掷
Chest Push (single response)|单次药球胸前推掷
Chest Push with Run Release|助跑药球胸前推掷
Chest Stretch on Stability Ball|健身球胸部拉伸
Child's Pose|婴儿式拉伸
Chin To Chest Stretch|低头颈部拉伸
Circus Bell|大哑铃单臂推举
Clock Push-Up|时钟式俯卧撑
Close-Grip Push-Up off of a Dumbbell|撑哑铃窄距俯卧撑
Cocoons|团身卷腹
Conan's Wheel|柯南转轮负重行走
Crossover Reverse Lunge|交叉后撤箭步蹲
Crucifix|十字静力平举
Crunch - Hands Overhead|双手过顶卷腹
Crunch - Legs On Exercise Ball|搁腿健身球卷腹
Cuban Press|古巴推举
Dancer's Stretch|舞者式拉伸
Dead Bug|死虫式
Depth Jump Leap|落深纵跳
Dips - Chest Version|双杠臂屈伸（胸部式）
Dips - Triceps Version|双杠臂屈伸（三头肌式）
Donkey Calf Raises|驴式提踵
Double Leg Butt Kick|双腿后踢跳
Downward Facing Balance|俯身平衡式
Drag Curl|拖拉式弯举
Drop Push|落下爆发俯卧撑
Dumbbell Lying Pronation|仰卧哑铃前臂旋前
Dumbbell Lying Supination|仰卧哑铃前臂旋后
Dumbbell Scaption|哑铃肩胛面平举
Dumbbell Tricep Extension -Pronated Grip|正握哑铃臂屈伸
Elbow to Knee|肘碰膝卷腹
Elbows Back|双肘后拉扩胸
Elevated Back Lunge|垫高后撤箭步蹲
Elevated Cable Rows|高位绳索划船
Elliptical Trainer|椭圆机训练
Exercise Ball Pull-In|健身球屈膝收腹
Extended Range One-Arm Kettlebell Floor Press|加大行程单臂壶铃地板卧推
Face Pull|绳索面拉
Farmer's Walk|农夫行走
Fast Skipping|快速跳绳
Finger Curls|手指弯举
Flat Bench Leg Pull-In|平凳坐姿屈膝收腹
Flat Bench Lying Leg Raise|平凳仰卧举腿
Flexor Incline Dumbbell Curls|上斜哑铃屈腕弯举
Floor Glute-Ham Raise|地面臀腿挺身
Flutter Kicks|仰卧交替打腿
Foot-SMR|足底筋膜放松
Forward Drag with Press|雪橇前拖推胸
Frankenstein Squat|弗兰肯斯坦颈前深蹲
Freehand Jump Squat|徒手深蹲跳
Frog Hops|蛙跳
Frog Sit-Ups|蛙式仰卧起坐
Front Cone Hops (or hurdle hops)|前向跳锥或跨栏跳
Front Raise And Pullover|前平举接仰卧上拉
Full Range-Of-Motion Lat Pulldown|全程高位下拉
Gironda Sternum Chins|吉龙达胸触杠引体向上
Glute Kickback|臀部后踢
Goblet Squat|高脚杯深蹲
Gorilla Chin/Crunch|引体向上接卷腹
Groin and Back Stretch|腹股沟与背部拉伸
Groiners|交替弓步开髋
Hang Clean - Below the Knees|膝下悬垂翻举
Hang Snatch - Below Knees|膝下悬垂抓举
Hanging Bar Good Morning|悬挂杠铃体前屈
Hanging Pike|悬垂屈体举腿
Heaving Snatch Balance|借力下蹲翻杠
Heavy Bag Thrust|重沙袋推掷
Hip Circles (prone)|俯卧髋部绕环
Hug A Ball|抱球伸展
Hug Knees To Chest|抱膝至胸拉伸
Hyperextensions (Back Extensions)|背部挺身
Hyperextensions With No Hyperextension Bench|无挺身凳背部挺身
IT Band and Glute Stretch|髂胫束与臀肌拉伸
Iliotibial Tract-SMR|髂胫束筋膜放松
Inchworm|毛毛虫爬行
Incline Push-Up|上斜俯卧撑（手抬高）
Incline Push-Up Close-Grip|上斜窄距俯卧撑
Incline Push-Up Depth Jump|上斜落深俯卧撑
Incline Push-Up Medium|上斜中距俯卧撑
Incline Push-Up Reverse Grip|上斜反握俯卧撑
Incline Push-Up Wide|上斜宽距俯卧撑
Intermediate Groin Stretch|进阶腹股沟拉伸
Intermediate Hip Flexor and Quad Stretch|进阶髋屈肌与股四头肌拉伸
Iron Cross|十字平举
Iron Crosses (stretch)|十字转体拉伸
Isometric Chest Squeezes|胸部等长挤压
Isometric Neck Exercise - Front And Back|颈部前后等长抗阻
Isometric Neck Exercise - Sides|颈部侧向等长抗阻
Isometric Wipers|静力雨刷式俯卧撑
JM Press|杰姆推举
Jackknife Sit-Up|两头起仰卧起坐
Janda Sit-Up|扬达仰卧起坐
Jefferson Squats|杰斐逊深蹲
Jerk Balance|挺举分腿平衡
Jerk Dip Squat|挺举预蹲
Jogging, Treadmill|跑步机慢跑
Keg Load|酒桶搬举
Kettlebell Figure 8|壶铃绕八字
Kettlebell Halo|壶铃绕头
Kettlebell Halo with Overhead Extension|壶铃绕头接过顶臂屈伸
Kettlebell Pass Between The Legs|壶铃胯下传递
Kettlebell Pirate Ships|壶铃海盗船摆动
Kettlebell Seesaw Press|壶铃交替侧推举
Kettlebell Thruster|壶铃深蹲推举
Kettlebell Turkish Get-Up (Lunge style)|壶铃土耳其起身（箭步式）
Kettlebell Turkish Get-Up (Squat style)|壶铃土耳其起身（深蹲式）
Kipping Muscle Up|借力双力臂
Knee Across The Body|跨体抱膝拉伸
Knee/Hip Raise On Parallel Bars|双杠支撑屈膝抬髋
Knee Tuck Jump|屈膝收腹跳
Kneeling Arm Drill|跪姿摆臂练习
Kneeling Cable Crunch With Alternating Oblique Twists|跪姿绳索交替转体卷腹
Kneeling Hip Flexor|跪姿髋屈肌拉伸
Landmine 180's|地雷杆180度转体
Landmine Linear Jammer|地雷杆前推
Lateral Bound|侧向跨跳
Latissimus Dorsi-SMR|背阔肌筋膜放松
Leg-Over Floor Press|跨腿地板卧推
Leg-Up Hamstring Stretch|抬腿腘绳肌拉伸
Leg Lift|举腿
Linear 3-Part Start Technique|三阶段起跑练习
Linear Acceleration Wall Drill|扶墙直线加速练习
Linear Depth Jump|前向落深跳
Log Lift|原木杠推举
London Bridges|绳索仰卧攀起
Looking At Ceiling|抬头颈部拉伸
Low Pulley Row To Neck|低位绳索划船至颈部
Lower Back Curl|下背卷曲拉伸
Lunge Pass Through|箭步蹲胯下传递
Lunge Sprint|箭步起跑冲刺
Lying Bent Leg Groin|仰卧屈膝腹股沟拉伸
Lying Crossover|仰卧交叉转髋
Lying Face Down Plate Neck Resistance|俯卧杠铃片颈部抗阻
Lying Face Up Plate Neck Resistance|仰卧杠铃片颈部抗阻
Lying Glute|仰卧臀肌拉伸
Lying Hamstring|仰卧腘绳肌拉伸
Lying Prone Quadriceps|俯卧股四头肌拉伸
Medicine Ball Chest Pass|药球胸前传球
Medicine Ball Full Twist|药球完整转体
Medicine Ball Scoop Throw|药球铲抛
Middle Back Stretch|中背拉伸
Mixed Grip Chin|正反握引体向上
Monster Walk|弹力带怪兽步
Mountain Climbers|登山跑
Moving Claw Series|动态抓地爪步练习
Muscle Snatch|高抓举
Muscle Up|双力臂
Natural Glute Ham Raise|自重臀腿挺身
Neck Press|颈前卧推
Oblique Crunches - On The Floor|地面侧腹卷腹
Olympic Squat|奥林匹克深蹲
On-Your-Back Quad Stretch|仰卧股四头肌拉伸
On Your Side Quad Stretch|侧卧股四头肌拉伸
One Arm Against Wall|单臂扶墙胸部拉伸
One Half Locust|半蝗虫式
One Handed Hang|单手悬垂
One Knee To Chest|单膝抱胸拉伸
Otis-Up|奥蒂斯负重仰卧起坐
Overhead Lat|过顶背阔肌拉伸
Overhead Stretch|过顶伸展
Overhead Triceps|过顶三头肌拉伸
Pallof Press|帕洛夫抗旋转推
Pallof Press With Rotation|帕洛夫旋转推
Pelvic Tilt Into Bridge|骨盆倾斜接臀桥
Peroneals-SMR|腓骨肌筋膜放松
Peroneals Stretch|腓骨肌拉伸
Physioball Hip Bridge|健身球臀桥
Pin Presses|架上卧推
Piriformis-SMR|梨状肌筋膜放松
Plank|平板支撑
Plate Pinch|杠铃片捏握
Plate Twist|杠铃片转体
Platform Hamstring Slides|滑台腘绳肌滑动
Plie Dumbbell Squat|哑铃芭蕾式宽距深蹲
Plyo Kettlebell Pushups|壶铃支撑爆发俯卧撑
Plyo Push-up|爆发俯卧撑
Posterior Tibialis Stretch|胫骨后肌拉伸
Power Partials|半程爆发平举
Power Stairs|负重上台阶
Press Sit-Up|推举仰卧起坐
Prone Manual Hamstring|俯卧手动抗阻腿弯举
Prowler Sprint|推雪橇冲刺
Pull Through|绳索胯下后拉
Push-Ups With Feet Elevated|脚抬高俯卧撑
Push-Ups With Feet On An Exercise Ball|健身球搁脚俯卧撑
Push Up to Side Plank|俯卧撑接侧平板
Pushups (Close and Wide Hand Positions)|窄距与宽距交替俯卧撑
Pyramid|金字塔支撑
Quick Leap|快速纵跳
Rack Delivery|架上翻杠练习
Recumbent Bike|靠背式自行车骑行
Return Push from Stance|站姿回弹药球推掷
Reverse Plate Curls|杠铃片反握弯举
Reverse Triceps Bench Press|反握三头肌卧推
Rickshaw Carry|框架负重行走
Rickshaw Deadlift|框架硬拉
Ring Dips|吊环臂屈伸
Rocket Jump|火箭跳
Rocking Standing Calf Raise|站姿摇摆提踵
Rocky Pull-Ups/Pulldowns|洛基式引体下拉
Rope Climb|爬绳
Rope Jumping|跳绳
Round The World Shoulder Stretch|绕环肩部拉伸
Rowing, Stationary|划船机训练
Runner's Stretch|跑者式拉伸
Running, Treadmill|跑步机跑步
Sandbag Load|沙袋搬举
Scapular Pull-Up|肩胛引体向上
Scissor Kick|剪刀腿
Scissors Jump|剪刀跳
Seated Biceps|坐姿二头肌拉伸
Seated Front Deltoid|坐姿三角肌前束拉伸
Seated Glute|坐姿臀肌拉伸
Seated Hamstring|坐姿腘绳肌拉伸
Seated Hamstring and Calf Stretch|坐姿腘绳肌与小腿拉伸
Seated Head Harness Neck Resistance|坐姿头套颈部抗阻
Seated Leg Tucks|坐姿屈膝收腹
See-Saw Press (Alternating Side Press)|交替侧推举
Shotgun Row|单臂旋转绳索划船
Side-Lying Floor Stretch|侧卧地面拉伸
Side Bridge|侧桥
Side Hop-Sprint|侧跳接冲刺
Side Jackknife|侧身两头起
Side Laterals to Front Raise|侧平举接前平举
Side Lying Groin Stretch|侧卧腹股沟拉伸
Side Neck Stretch|颈部侧向拉伸
Side Standing Long Jump|站姿侧向跳远
Side To Side Chins|左右交替引体向上
Side Wrist Pull|侧向拉腕伸展
Side to Side Box Shuffle|左右交替踏箱
Single-Arm Linear Jammer|单臂地雷杆前推
Single-Cone Sprint Drill|单锥桶冲刺练习
Single-Leg High Box Squat|单腿高箱深蹲
Single-Leg Hop Progression|单腿渐进跳跃
Single-Leg Stride Jump|单腿跨步跳
Single Leg Butt Kick|单腿后踢跳
Single Leg Push-off|单腿蹬台跳
Sit Squats|坐凳深蹲
Skating|滑冰
Sled Drag - Harness|背带拖雪橇
Sled Overhead Backward Walk|雪橇过顶倒走
Sledgehammer Swings|大锤砸击
Smith Single-Leg Split Squat|史密斯单腿分腿蹲
Snatch Balance|下蹲翻杠
Spell Caster|哑铃斜向挥举
Spider Crawl|蜘蛛爬行
Spinal Stretch|脊柱拉伸
Stairmaster|爬楼机训练
Standing Biceps Stretch|站姿二头肌拉伸
Standing Bradford Press|站姿布拉德福德绕头推举
Standing Cable Lift|站姿绳索斜向上提
Standing Cable Wood Chop|站姿绳索伐木
Standing Dumbbell Straight-Arm Front Delt Raise Above Head|站姿哑铃直臂过顶前平举
Standing Elevated Quad Stretch|站姿垫高股四头肌拉伸
Standing Front Barbell Raise Over Head|站姿杠铃过顶前平举
Standing Gastrocnemius Calf Stretch|站姿腓肠肌拉伸
Standing Hamstring and Calf Stretch|站姿腘绳肌与小腿拉伸
Standing Hip Flexors|站姿髋屈肌拉伸
Standing Inner-Biceps Curl|站姿内侧二头肌弯举
Standing Lateral Stretch|站姿体侧拉伸
Standing Long Jump|立定跳远
Standing Olympic Plate Hand Squeeze|站姿杠铃片握力挤压
Standing One-Arm Dumbbell Curl Over Incline Bench|站姿单臂上斜凳哑铃弯举
Standing Pelvic Tilt|站姿骨盆倾斜
Standing Soleus And Achilles Stretch|站姿比目鱼肌与跟腱拉伸
Standing Toe Touches|站姿体前屈触趾
Standing Towel Triceps Extension|站姿毛巾臂屈伸
Standing Two-Arm Overhead Throw|站姿双臂过顶抛掷
Star Jump|星式跳跃
Step-up with Knee Raise|踏台提膝
Step Mill|阶梯机训练
Stomach Vacuum|腹部真空收缩
Straight Bar Bench Mid Rows|直杆平凳中位划船
Straight Raises on Incline Bench|上斜凳直臂平举
Stride Jump Crossover|交叉跨步跳
Superman|超人式挺身
Supine Chest Throw|仰卧药球胸前抛掷
Supine One-Arm Overhead Throw|仰卧单臂过顶抛掷
Supine Two-Arm Overhead Throw|仰卧双臂过顶抛掷
Suspended Fallout|悬吊前伸收腹
Svend Press|斯文夹片推胸
Tate Press|泰特臂屈伸
The Straddle|坐姿分腿拉伸
Thigh Abductor|器械髋外展
Thigh Adductor|器械髋内收
Tire Flip|翻轮胎
Toe Touchers|仰卧举腿触趾
Torso Rotation|躯干旋转
Trail Running/Walking|越野跑走
Tricep Side Stretch|三头肌侧向拉伸
Triceps Stretch|三头肌拉伸
Upper Back-Leg Grab|上背抓腿拉伸
Upper Back Stretch|上背拉伸
V-Bar Pullup|V形握把引体向上
Vertical Swing|垂直摆举
Walking, Treadmill|跑步机行走
Weighted Sissy Squat|负重西西深蹲
Wide Stance Stiff Legs|宽站距直腿硬拉
Wind Sprints|短距离冲刺
Windmills|风车转体
World's Greatest Stretch|世界最佳拉伸
Wrist Roller|卷腕器训练
Wrist Rotations with Straight Bar|直杆转腕
Yoke Walk|轭架负重行走
Zercher Squats|泽奇深蹲
Zottman Curl|佐特曼弯举
Zottman Preacher Curl|佐特曼牧师凳弯举
`
    .trim()
    .split("\n")
    .map((line) => line.split("|")),
);
Object.assign(
  exact,
  Object.fromEntries(
    "\nAb Crunch Machine|器械卷腹\nAb Roller|健腹轮\nAlternating Renegade Row|交替平板支撑哑铃划船\nAnterior Tibialis-SMR|胫骨前肌筋膜放松\nBall Leg Curl|健身球腿弯举\nBand Good Morning (Pull Through)|弹力带胯下体前屈\nBand Pull Apart|弹力带拉伸展肩\nBarbell Ab Rollout|杠铃滚动健腹\nBarbell Ab Rollout - On Knees|跪姿杠铃滚动健腹\nBarbell Bench Press - Medium Grip|杠铃卧推（中握距）\nBarbell Guillotine Bench Press|杠铃颈前卧推\nBarbell Incline Bench Press - Medium Grip|上斜杠铃卧推（中握距）\nBarbell Rollout from Bench|凳上杠铃滚动健腹\nBarbell Side Split Squat|杠铃侧向分腿蹲\nBattling Ropes|战绳\nBench Press - Powerlifting|力量举卧推\nBent Over Dumbbell Rear Delt Raise With Head On Bench|头抵凳俯身哑铃后束平举\nCable Incline Pushdown|上斜绳索下压\nChair Squat|坐椅深蹲\nDecline Close-Grip Bench To Skull Crusher|下斜窄握卧推接臂屈伸\nDip Machine|器械臂屈伸\nDumbbell Seated Box Jump|哑铃坐姿跳箱\nFront Box Jump|正向跳箱\nFront Squat (Clean Grip)|颈前深蹲（翻举握法）\nHammer Grip Incline DB Bench Press|上斜哑铃卧推（对握）\nHandstand Push-Ups|倒立俯卧撑\nHanging Leg Raise|悬垂举腿\nIncline Bench Pull|上斜凳俯卧划船\nIncline Dumbbell Bench With Palms Facing In|上斜哑铃卧推（对握）\nInverted Row|反向划船\nInverted Row with Straps|悬吊带反向划船\nKettlebell Dead Clean|壶铃地面翻举\nLateral Box Jump|侧向跳箱\nLeverage Iso Row|独立臂杠杆器械划船\nLying Close-Grip Bar Curl On High Pulley|仰卧窄握高位绳索弯举\nLying High Bench Barbell Curl|高凳俯卧杠铃弯举\nLying T-Bar Row|俯卧T形杆划船\nMachine Shoulder (Military) Press|器械肩上推举\nNarrow Stance Hack Squats|窄站距哈克深蹲\nOne-Arm Kettlebell Military Press To The Side|单臂壶铃侧向肩推\nOne-Arm Kettlebell Para Press|单臂壶铃辅助侧推举\nOne-Arm Kettlebell Swings|单臂壶铃摆动\nOne-Arm Medicine Ball Slam|单臂药球砸地\nOne-Arm Open Palm Kettlebell Clean|单臂开掌壶铃翻举\nOne-Arm Side Deadlift|单臂体侧硬拉\nOpen Palm Kettlebell Clean|开掌壶铃翻举\nOverhead Slam|过顶药球砸地\nParallel Bar Dip|双杠臂屈伸\nPreacher Hammer Dumbbell Curl|牧师凳哑铃锤式弯举\nPush-Up Wide|宽距俯卧撑\nPush-Ups - Close Triceps Position|窄距三头肌俯卧撑\nReverse Band Power Squat|反向弹力带力量深蹲\nReverse Hyperextension|反向背部挺身\nSeated Close-Grip Concentration Barbell Curl|坐姿窄握杠铃集中弯举\nSeated One-arm Cable Pulley Rows|坐姿单臂绳索划船\nSide Leg Raises|侧抬腿\nSingle Dumbbell Raise|单只哑铃平举\nSled Push|推雪橇\nSmith Machine Hang Power Clean|史密斯悬垂高翻\nSplit Jump|分腿跳\nSquat with Plate Movers|滑动杠铃片深蹲\nT-Bar Row with Handle|T形杆划船（握把）\nTricep Dumbbell Kickback|哑铃俯身臂屈伸\nTriceps Overhead Extension with Rope|绳索过顶臂屈伸\nTriceps Pushdown - V-Bar Attachment|三头肌下压（V形握把）\nTuck Crunch|团身卷腹\nUpright Barbell Row|杠铃直立划船\nUpright Cable Row|绳索直立划船\nUpward Stretch|向上伸展\nV-Bar Pulldown|V形握把下拉\nWeighted Ball Hyperextension|负重健身球挺身\nWeighted Ball Side Bend|负重健身球侧屈\nWeighted Bench Dip|负重凳上臂屈伸\nBarbell Curls Lying Against An Incline|上斜凳俯卧杠铃弯举\nBarbell Shrug Behind The Back|背后杠铃耸肩\nBarbell Squat To A Bench|杠铃坐凳深蹲\nBent Over Two-Dumbbell Row With Palms In|俯身双哑铃划船（对握）\nCalf Raises - With Bands|弹力带提踵\nClose-Grip EZ-Bar Curl with Band|弹力带曲杆窄握弯举\nClose-Grip EZ-Bar Press|曲杆窄握推举\nDumbbell Squat To A Bench|哑铃坐凳深蹲\nExternal Rotation with Band|弹力带肩外旋\nExternal Rotation with Cable|绳索肩外旋\nFront Barbell Squat|杠铃颈前深蹲\nFront Barbell Squat To A Bench|杠铃颈前坐凳深蹲\nFront Cable Raise|绳索前平举\nFront Dumbbell Raise|哑铃前平举\nFront Incline Dumbbell Raise|上斜哑铃前平举\nFront Plate Raise|杠铃片前平举\nFront Squats With Two Kettlebells|双壶铃颈前深蹲\nFront Two-Dumbbell Raise|双哑铃前平举\nHip Extension with Bands|弹力带髋伸展\nHip Flexion with Band|弹力带屈髋\nHip Lift with Band|弹力带抬髋\nInternal Rotation with Band|弹力带肩内旋\nLeg Extensions|坐姿腿屈伸\nLying Close-Grip Barbell Triceps Extension Behind The Head|仰卧窄握杠铃头后臂屈伸\nLying Close-Grip Barbell Triceps Press To Chin|仰卧窄握杠铃下巴臂屈伸\nOverhead Cable Curl|过顶绳索弯举\nPalms-Down Dumbbell Wrist Curl Over A Bench|凳上哑铃反向腕弯举\nPalms-Down Wrist Curl Over A Bench|凳上反向腕弯举\nPalms-Up Barbell Wrist Curl Over A Bench|凳上杠铃腕弯举\nPalms-Up Dumbbell Wrist Curl Over A Bench|凳上哑铃腕弯举\nSeated Flat Bench Leg Pull-In|平凳坐姿收膝\nSeated One-Arm Dumbbell Palms-Down Wrist Curl|坐姿单臂哑铃反向腕弯举\nSeated One-Arm Dumbbell Palms-Up Wrist Curl|坐姿单臂哑铃腕弯举\nSeated Two-Arm Palms-Up Low-Pulley Wrist Curl|坐姿双臂低位绳索腕弯举\nShoulder Press - With Bands|弹力带推肩\nStanding Palms-Up Barbell Behind The Back Wrist Curl|站姿背后杠铃腕弯举\nWeighted Sit-Ups - With Bands|弹力带负重仰卧起坐\nWide-Grip Pulldown Behind The Neck|宽握颈后下拉\nWide-Grip Rear Pull-Up|宽握颈后引体向上\n"
      .trim()
      .split("\n")
      .map((line) => line.split("|")),
  ),
);
Object.assign(
  exact,
  Object.fromEntries(
    `Band Pull Apart|弹力带水平拉开
Incline Dumbbell Press|上斜哑铃卧推
Decline Smith Press|下斜史密斯卧推
Smith Machine Decline Press|史密斯下斜卧推
Board Press|木板限程卧推
Lying Leg Curls|俯卧腿弯举
Lying Cable Curl|仰卧绳索弯举
Lying Dumbbell Tricep Extension|仰卧哑铃臂屈伸
Split Squat with Dumbbells|哑铃分腿蹲
Push Press - Behind the Neck|颈后借力推举
Standing Barbell Press Behind Neck|站姿杠铃颈后推举
Triceps Pushdown - Rope Attachment|三头肌下压（绳索握把）
Cable Hammer Curls - Rope Attachment|绳索锤式弯举（绳索握把）
Cable Rope Overhead Triceps Extension|绳索过顶臂屈伸（绳索握把）
Cable Rope Rear-Delt Rows|绳索后束划船（绳索握把）
Close-Grip Front Lat Pulldown|窄握颈前高位下拉`
      .split("\n")
      .map((line) => line.split("|")),
  ),
);
const phrases = Object.fromEntries(
  `
barbell|杠铃
dumbbell|哑铃
dumbbells|哑铃
two dumbbell|双哑铃
two dumbbells|双哑铃
double kettlebell|双壶铃
two kettlebells|双壶铃
kettlebell|壶铃
medicine ball|药球
smith machine|史密斯
smith|史密斯
leverage|杠杆器械
machine|器械
cable|绳索
bands|弹力带
band|弹力带
chains|铁链
chain|铁链
bodyweight|自重
weighted|负重
plate|杠铃片
exercise ball|健身球
bosu ball|波速球
stability ball|健身球
physioball|健身球
single arm|单臂
one arm|单臂
two arm|双臂
single leg|单腿
single legged|单腿
one legged|单腿
one leg|单腿
two leg|双腿
alternate|交替
alternating|交替
standing|站姿
seated|坐姿
kneeling|跪姿
lying|卧姿
prone|俯卧
supine|仰卧
bent over|俯身
bent arm|屈臂
bent knee|屈膝
straight arm|直臂
stiff legged|直腿
stiff leg|直腿
suspended|悬吊
incline|上斜
decline|下斜
flat bench|平凳
floor|地面
bench press|卧推
floor press|地板卧推
chest press|推胸
shoulder press|推肩
military press|肩上推举
overhead shoulder press|过顶推肩
close grip|窄握
wide grip|宽握
reverse grip|反握
neutral grip|对握
hammer grip|锤式握法
palms down|正握
palm up|反握
palms up|反握
palms in|对握
palm in|对握
palms facing in|对握
pronated|正握
supinated|反握
underhand|反握
bicep curl|二头肌弯举
biceps curl|二头肌弯举
biceps cable curl|绳索二头肌弯举
hammer curls|锤式弯举
hammer curl|锤式弯举
preacher curls|牧师凳弯举
preacher curl|牧师凳弯举
concentration curls|集中弯举
concentration curl|集中弯举
spider curl|蜘蛛弯举
wrist curl|腕弯举
curls|弯举
curl|弯举
triceps extension|臂屈伸
tricep extension|臂屈伸
triceps press|臂屈伸
tricep press|臂屈伸
triceps pushdown|三头肌下压
tricep pushdown|三头肌下压
skull crusher|仰卧臂屈伸
skullcrusher|仰卧臂屈伸
kickback|后踢
rear delt raise|三角肌后束平举
rear delt fly|三角肌后束飞鸟
rear delt row|三角肌后束划船
rear delt|三角肌后束
rear lateral raise|三角肌后束平举
side lateral raise|侧平举
side laterals|侧平举
side lateral|侧平举
lateral raise|侧平举
front raise|前平举
shoulder raise|提肩
raise|抬举
raises|抬举
pullover|仰卧上拉
flyes|飞鸟
flye|飞鸟
shrug|耸肩
shrugs|耸肩
upright row|直立划船
row|划船
rows|划船
pulldowns|下拉
pulldown|下拉
pullups|引体向上
pull ups|引体向上
pull up|引体向上
chin up|反握引体向上
chin|反握引体向上
push ups|俯卧撑
push up|俯卧撑
pushups|俯卧撑
leg curl|腿弯举
leg curls|腿弯举
leg extensions|腿屈伸
leg extension|腿屈伸
leg press|腿举
leg raise|举腿
leg raises|举腿
leg pull in|屈膝收腹
calf raise|提踵
calf raises|提踵
calf press|蹬踵
calf stretch|小腿拉伸
hamstring stretch|腘绳肌拉伸
quad stretch|股四头肌拉伸
glute ham raise|臀腿挺身
glute bridge|臀桥
hip thrust|臀推
hip raise|抬髋
hip extension|髋伸展
hip flexion|屈髋
hip adduction|髋内收
hip adductions|髋内收
hip lift|抬髋
hack squat|哈克深蹲
front squat|颈前深蹲
box squat|箱式深蹲
pistol squat|手枪深蹲
split squat|分腿蹲
split squats|分腿蹲
full squat|全蹲
jump squat|深蹲跳
squat|深蹲
squats|深蹲
lunge|箭步蹲
lunges|箭步蹲
step ups|上台阶
walking lunge|行进箭步蹲
romanian deadlift|罗马尼亚硬拉
sumo deadlift|相扑硬拉
trap bar deadlift|六角杠硬拉
axle deadlift|粗杆硬拉
deficit deadlift|垫高硬拉
deadlift|硬拉
deadlifts|硬拉
rack pulls|架上硬拉
rack pull|架上硬拉
good morning|体前屈
good mornings|体前屈
power clean|高翻
power snatch|高抓
hang clean|悬垂翻举
hang snatch|悬垂抓举
clean and jerk|挺举
clean and press|翻举推举
clean|翻举
snatch|抓举
jerk|上挺
push press|借力推举
power jerk|力量上挺
split jerk|分腿上挺
split clean|分腿翻举
split snatch|分腿抓举
squat jerk|下蹲挺举
high pull|高拉
pull|拉举
press|推举
sumo|相扑式
windmill|风车式
snatch pull|抓举高拉
snatch shrug|抓举耸肩
clean pull|翻举高拉
clean shrug|翻举耸肩
oblique crunch|侧腹卷腹
oblique crunches|侧腹卷腹
reverse crunch|反向卷腹
russian twists|俄罗斯转体
russian twist|俄罗斯转体
crunches|卷腹
crunch|卷腹
sit ups|仰卧起坐
sit up|仰卧起坐
side bend|体侧屈
side bends|体侧屈
external rotation|肩外旋
internal rotation|肩内旋
rotation|旋转
twist|转体
circles|绕环
circle|绕环
stretch|拉伸
smr|筋膜放松
hamstring|腘绳肌
hamstrings|腘绳肌
quadriceps|股四头肌
calves|小腿
calf|小腿
biceps|二头肌
triceps|三头肌
brachialis|肱肌
rhomboids|菱形肌
lower back|下背
middle back|中背
upper back|上背
forearm|前臂
forearms|前臂
front deltoid|三角肌前束
deltoid|三角肌
lat|背阔肌
lats|背阔肌
neck|颈部
ankle|脚踝
elbow|肘部
knee|膝部
wrist|手腕
hip|髋部
leg|腿部
arm|手臂
shoulder|肩部
back|背部
chest|胸部
rope|绳索握把
low pulley|低位滑轮
high pulley|高位滑轮
long bar|长杆
straight bar|直杆
cambered|曲杆
ez bar|曲杆
t bar|T形杆
v bar|V形握把
arnold|阿诺德
dynamic|动态
reverse|反向
front|前侧
rear|后侧
lateral|侧向
narrow stance|窄站距
wide stance|宽站距
speed|快速
jump|跳跃
hops|跳跃
hop|跳跃
hurdle|跨栏
cone|锥桶
sled|雪橇
towel|毛巾
handle|握把
board|木板限程
resistance|抗阻
overhead|过顶
assisted|辅助
assistance|辅助
advanced|进阶
high|高位
low|低位
inner|内侧
mid|中位
above head|过顶
behind the back|背后
behind neck|颈后
behind the neck|颈后
behind head|头后
behind the head|头后
cross body|跨体
cross over|交叉夹胸
crossover|交叉夹胸
and|接
with|配合
on|在
from|起自
to|至
off|离开
against|靠
an|一个
a|一个
the|
`
    .trim()
    .split("\n")
    .map((line) => line.split("|")),
);
const pairs = Object.entries(phrases).sort((a, b) => b[0].length - a[0].length);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function translate(name) {
  if (exact[name]) return exact[name];
  let text = name
    .toLowerCase()
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const suffixes = [
    ["with bands", "（弹力带）"],
    ["with band", "（弹力带）"],
    ["with chains", "（铁链）"],
    ["with a twist", "（转体）"],
    ["with straps", "（悬吊带）"],
    ["with palms in", "（对握）"],
    ["with neutral grip", "（对握）"],
    ["over a bench", "（凳上）"],
    ["on a bench", "（凳上）"],
    ["to a bench", "至凳上"],
    ["from blocks", "（垫高起始）"],
    ["off pins", "（架上起始）"],
    ["on knees", "（跪姿）"],
    ["rope attachment", "绳索握把"],
    ["v bar attachment", "V形握把"],
    ["from deficit", "（垫高）"],
  ];
  for (const [a, b] of suffixes) text = text.replaceAll(a, b);
  for (const [en, zh] of pairs)
    text = text.replace(
      new RegExp(`(?<![a-z])${escape(en)}(?![a-z])`, "g"),
      zh,
    );
  return text.replace(/\s+/g, "").replace(/\(/g, "（").replace(/\)/g, "）");
}
const result = Object.fromEntries(
  data.map((item) => [item.id, translate(item.name)]),
);
fs.writeFileSync(
  "src/data/free-exercise-db-zh.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    data
      .filter((item) => /[a-z]/i.test(result[item.id]))
      .map((item) => [item.name, result[item.id]]),
    null,
    2,
  ),
);
