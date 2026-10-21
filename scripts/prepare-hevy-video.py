import json,re,hashlib,collections
rows=json.load(open('test-results/hevy-video/reconstructed.json',encoding='utf8'))
# Manual review corrections. Ambiguous source wording is kept out of the live catalog.
fix={78:'胸托Y举（哑铃）',319:'耸肩（器械）',19:'坐姿V把划船（绳索）',20:'坐姿V把划船（绳索）',23:'坐姿V把划船（绳索）',25:'有氧训练',26:'风阻单车',27:'阿诺德推举（哑铃）',30:'背部伸展',32:'负重背部伸展',33:'药球砸地',37:'背后弯举（绳索）',38:'腰带深蹲（器械）',40:'窄握卧推（杠铃）',41:'宽握卧推（杠铃）',43:'窄握卧推（杠铃）',51:'单车式卷腹',54:'单车式卷腹',84:'高翻',85:'挺举',86:'高翻推举',87:'高翻拉',94:'交叉后撤弓步（哑铃）',102:'相扑硬拉高拉',116:'划船（哑铃）',117:'抓举（哑铃）',118:'卧推（哑铃）',119:'登阶（哑铃）',122:'弯举（EZ杠铃）',123:'农夫行走',124:'抬脚卧推（杠铃）',125:'消防栓式抬腿',127:'地板卧推（哑铃）',128:'坐姿撑体',130:'蛙跳',131:'青蛙泵（哑铃）',132:'前水平保持',133:'前水平抬升',134:'前平举（弹力带）',135:'前平举（杠铃）',136:'前平举（绳索）',137:'前平举（哑铃）',138:'前平举（悬挂带）',139:'前蹲',140:'颈后深蹲',142:'臀腿挺身',143:'后踢腿（器械）',145:'高脚杯深蹲（哑铃）',146:'早安式（杠铃）',147:'猩猩划船（壶铃）',153:'倒立撑',154:'悬垂高翻',156:'悬垂提膝',157:'悬垂举腿',158:'仰卧交替触踵',159:'并握挤压卧推（哑铃）',161:'高强度间歇训练（HIIT）',162:'徒步',163:'髋外展（器械）',164:'髋内收（器械）',167:'臀推（器械）',168:'臀推（史密斯）',169:'空心支撑摇摆',176:'独立臂推胸（器械）',177:'独立臂高位划船（器械）',178:'独立臂低位划船（器械）',179:'独立臂划船（器械）',180:'折刀收腹（悬挂带）',182:'JM推举（杠铃）',185:'深蹲跳',186:'开合跳',187:'弓步跳',188:'绕体传递（壶铃）',189:'高翻（壶铃）',190:'弯举（壶铃）',191:'高脚杯深蹲（壶铃）',192:'绕头（壶铃）',193:'高拉（壶铃）',195:'抓举（壶铃）',196:'摆动（壶铃）',197:'土耳其起立（壶铃）',201:'跪姿俯卧撑',202:'L字支撑',203:'地雷管转体',204:'地雷管划船',205:'地雷管深蹲推举',206:'地雷管划船',213:'侧平举（弹力带）',217:'侧平举（绳索）',218:'侧平举（器械）',219:'侧弓步蹲',220:'侧弓步蹲',224:'低位划船（悬挂带）',230:'仰卧颈屈',231:'负重仰卧颈屈',232:'俯卧颈伸',233:'负重俯卧颈伸',235:'登山跑',236:'双力臂',237:'离心引体向上',238:'北欧腿弯举',240:'单臂俯卧撑',243:'过顶上举（杠铃片）',247:'过顶臂屈伸（绳索）',248:'半程臀桥（杠铃）',249:'暂停深蹲（杠铃）',250:'潘德雷划船（杠铃）',251:'摆式深蹲（器械）',252:'普拉提',253:'交叉锤式弯举（哑铃）',254:'单腿深蹲',255:'平板支撑',256:'平板俯卧撑',257:'弯举（杠铃片）',258:'前平举（杠铃片）',259:'推胸（杠铃片）',260:'斯万推胸（杠铃片）',261:'力量翻',263:'牧师凳弯举（杠铃）',264:'牧师凳弯举（哑铃）',265:'牧师凳弯举（器械）',267:'仰卧上拉（哑铃）',268:'上拉（器械）',270:'俯卧撑',271:'窄距俯卧撑',272:'负重俯卧撑',276:'反向飞鸟（器械）',277:'后踢腿（器械）',281:'反握弯举（绳索）',282:'单臂反向飞鸟（绳索）',286:'反向平板支撑',287:'吊环臂屈伸（悬挂带）',288:'吊环引体向上（悬挂带）',291:'吊环俯卧撑（悬挂带）',296:'俄罗斯转体（自重）',297:'负重俄罗斯转体',299:'坐姿划船（绳索）',300:'宽握坐姿划船（绳索）',302:'坐姿飞鸟（绳索）',304:'上斜弯举（哑铃）',305:'坐姿侧平举（哑铃）',307:'上斜弯举（哑铃）',314:'肩推（挂片器械）',326:'单臂弯举（绳索）',327:'单臂弯举（绳索）',328:'单臂地雷管推举（杠铃）',330:'单臂侧平举（绳索）',331:'单臂过顶臂屈伸（哑铃）',332:'单臂下压（绳索）',336:'单腿臀推（哑铃）',340:'单腿提踵',341:'单腿提踵（杠铃）',342:'单腿提踵（哑铃）',343:'单腿提踵（器械）',344:'负重西西深蹲',348:'滑雪',349:'仰卧臂屈伸（杠铃）',350:'仰卧臂屈伸（哑铃）',354:'蜘蛛弯举（哑铃）',356:'动感单车',357:'分腿挺举',358:'分腿蹲（哑铃）',367:'爬楼机',369:'站姿提踵',370:'站姿提踵（杠铃）',371:'站姿提踵（哑铃）',372:'站姿提踵（器械）',373:'站姿提踵（史密斯）',375:'站姿推举（杠铃）',376:'站姿提踵（史密斯）',378:'吉龙达胸触杠引体向上',383:'相扑深蹲',385:'相扑深蹲（哑铃）',386:'相扑深蹲（壶铃）',390:'深蹲推举（杠铃）',391:'深蹲推举（壶铃）',393:'悬垂举腿触杠',399:'过顶臂屈伸（杠铃）',401:'过顶臂屈伸（哑铃）',404:'俯身臂屈伸（绳索）',409:'V字侧支撑',410:'V字侧支撑',411:'垂直下拉（器械）',412:'侍者弯举（哑铃）',414:'行走弓步',415:'行走弓步（哑铃）',418:'热身',419:'宽握引体向上',420:'宽肘臂屈伸（哑铃）',423:'宽肘臂屈伸（哑铃）',424:'泽奇深蹲'}
skip={28:'名称“平卧划举”不能可靠对应具体动作',52:'名称“跪姿撑体”不能可靠对应具体动作',222:'原文仅显示“双杠”，动作含义不足',315:'原文“肩部水龙头”含义不明确',337:'原文“单腿（机器）”缺少动作名'}
# Exact wording that does not identify the movement reliably is not inferred from muscle tags.
gearMap={'哑铃':'dumbbell','杠铃':'barbell','EZ杠铃':'e-z curl bar','滑轮机':'cable','滑轮':'cable','绳索':'cable','训练机':'machine','机器':'machine','机械':'machine','机':'machine','器械':'machine','挂片器械':'plate-loaded','史密斯训练器':'smith','史密斯机':'smith','史密斯':'smith','阻力带':'resistance-band','弹力带':'resistance-band','悬吊':'suspension-band','悬挂带':'suspension-band','壶铃':'kettlebell','杠铃片':'weight-plate','自重':'bodyweight','体重':'bodyweight','六角杠':'trap-bar'}
gearLabel={'cable':'绳索','machine':'器械','smith':'史密斯','resistance-band':'弹力带','suspension-band':'悬挂带','bodyweight':'自重'}
replacements={'二头弯举':'弯举','二头肌弯举':'弯举','肩推':'肩推','阔背肌下拉':'高位下拉','繩索臉拉':'面拉（绳索）','躺着腿弯举':'俯卧腿弯举','腿部伸展':'腿屈伸','坐姿腿弯举':'坐姿腿弯举','箭步蹲':'弓步蹲','飞鸟夹胸':'飞鸟','胸蝇':'飞鸟','胸部支撑上斜划船':'上斜凳胸托划船','仰卧拉举':'仰卧上拉','单手伏地挺身':'单臂俯卧撑','伏地挺身':'俯卧撑','起脚尖':'提踵','单脚':'单腿','髋关节':'髋','坐式':'坐姿','坐侧平举':'坐姿侧平举','躺式抬膝':'仰卧提膝','躺式抬腿':'仰卧举腿','加重':'负重','負重':'负重','剪刀式踢脚':'仰卧剪刀腿','壶铃土其起立':'土耳其起立（壶铃）','北欧胭绳肌弯举':'北欧腿弯举'}
def canonical(s):
 for a,b in replacements.items():s=s.replace(a,b)
 s=s.replace('亻则','侧').replace('．','·').replace('一宽握','（宽握）')
 return s
musMap={'肩部':'shoulders','二头肌':'biceps','三头肌':'triceps','上背部':'upper-back','下背部':'lower-back','胸部':'chest','背阔肌':'lats','股四头肌':'quadriceps','腘绳肌':'hamstrings','腿绳肌':'hamstrings','胭绳肌':'hamstrings','月国绳肌':'hamstrings','臀肌':'glutes','臀大肌':'glutes','腹肌':'abdominals','全身':'full-body','小腿':'calves','前臂':'forearms','斜方肌':'traps','颈部':'neck','其他':'other','有氧运动':'cardio','有氧':'cardio','外展肌':'abductors','内收肌':'adductors'}
manifest=[];pending=[]
for i,r in enumerate(rows):
 if i in skip:pending.append({'rawName':r['rawName'],'frame':min(r['frames']),'reason':skip[i]});continue
 s=canonical(fix.get(i,r['rawName']));gear=None
 parts=re.findall(r'（([^）]+)）|\(([^)]+)\)',s)
 for a,b in parts:
  token=a or b
  if token in gearMap:
   gear=gearMap[token];s=s.replace('（'+token+'）','').replace('('+token+')','');break
 if gear is None:
  for text,code in [('滑轮','cable'),('绳索','cable'),('哑铃','dumbbell'),('杠铃','barbell'),('壶铃','kettlebell'),('阻力带','resistance-band'),('弹力带','resistance-band'),('悬吊','suspension-band')]:
   if text in s:gear=code;s=s.replace(text,'');break
 if gear in ['barbell','dumbbell','smith']:s=s.replace('上斜推胸','上斜卧推').replace('下斜推胸','下斜卧推')
 if gear:s+=f'（{gearLabel.get(gear,next((a for a,b in gearMap.items() if b==gear),gear))}）'
 s=s.replace('（哑铃）（哑铃）','（哑铃）')
 muscle=musMap[max(r['muscleVotes'],key=r['muscleVotes'].get)]
 entry={'rawName':r['rawName'],'localizedName':s,'equipment':gear,'primaryMuscles':[muscle] if muscle!='cardio' else [],'category':'cardio' if muscle=='cardio' else 'strength','frame':min(r['frames']),'seconds':round(min(r['frames'])/29.97431506849315,2),'observations':len(r['frames'])}
 manifest.append(entry)
# Merge repeated OCR variants by normalized name, not gym equipment/model.
unique={}
for r in manifest:
 key=r['localizedName'].casefold()
 if key not in unique:unique[key]=r
 else:unique[key]['observations']+=r['observations']
json.dump({'sourceVideo':'7eeec41acdc4e5437773f0062f66166c.mp4','durationSeconds':116.8,'decodedFrames':3501,'sampleIntervalSeconds':0.2,'reviewedChangeFrames':552,'entries':list(unique.values()),'pending':pending},open('src/data/hevy-video-review.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
print('Reviewed entries',len(unique),'pending',len(pending))
