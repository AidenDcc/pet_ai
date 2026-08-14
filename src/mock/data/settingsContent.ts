/**
 * 设置相关双语静态内容：常见问题 + 协议正文。
 * 独立于 locale 文件（正文较长），页面按当前语言选择 zh / en。
 */

export interface BiText {
  zh: string
  en: string
}

/* ============================================================
 * 常见问题（Top 10）
 * ============================================================ */
export interface FaqItem {
  id: string
  question: BiText
  answer: BiText
}

export const SETTINGS_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: { zh: '如何绑定智能宠物项圈？', en: 'How do I bind a smart pet collar?' },
    answer: {
      zh: '进入「我的设备」→ 点击「绑定设备」，输入项圈背面的 SN 序列号，选择要绑定的宠物即可。绑定成功后设备会自动上报体征数据。',
      en: 'Go to My Devices → Bind Device, enter the SN code printed on the collar, then pick the pet to bind. The collar will start reporting vital signs automatically.',
    },
  },
  {
    id: 'faq-2',
    question: { zh: '为什么收不到健康告警？', en: 'Why don’t I get health alerts?' },
    answer: {
      zh: '请确认：1) 设备在线且电量充足；2) 已在「守护」页开启告警开关；3) 手机通知权限已开启。若仍无告警，可在意见反馈中描述具体情况。',
      en: 'Please check: 1) the device is online with enough battery; 2) alerts are enabled on the Guard page; 3) notification permission is granted. If alerts still don’t arrive, report it via Feedback.',
    },
  },
  {
    id: 'faq-3',
    question: { zh: '设备离线怎么办？', en: 'My device is offline. What now?' },
    answer: {
      zh: '先检查设备电量与网络环境，靠近项圈重新连接蓝牙；仍离线可长按项圈按键 5 秒重启。重启后 1~2 分钟会自动恢复上报。',
      en: 'Check the battery and network first, then bring your phone close and reconnect Bluetooth. If it stays offline, press and hold the collar button for 5 seconds to restart it. Upload resumes within 1–2 minutes.',
    },
  },
  {
    id: 'faq-4',
    question: { zh: '如何查看宠物体征数据？', en: 'How do I view my pet’s vital signs?' },
    answer: {
      zh: '进入「守护」页即可查看体温、心率、血氧、呼吸频率等实时指标；点击指标可查看最近 24 小时或 7 天趋势图。',
      en: 'Open the Guard page to see live temperature, heart rate, blood oxygen and respiratory rate. Tap a metric for the last-24h or 7-day trend chart.',
    },
  },
  {
    id: 'faq-5',
    question: { zh: '健康报告多久生成一次？', en: 'How often is a health report generated?' },
    answer: {
      zh: '系统根据宠物体征数据每日生成一份健康报告，报告可在「健康报告」中查看，也可一键分享给在线医生。',
      en: 'A health report is generated daily from your pet’s vital data. View it under Health Reports, or share it to an online vet in one tap.',
    },
  },
  {
    id: 'faq-6',
    question: { zh: '在线问诊如何收费？', en: 'How much does online consultation cost?' },
    answer: {
      zh: '基础问诊免费，专家图文问诊与视频问诊按医生定价收费。订阅会员可享受专属折扣，具体以医生页面标价为准。',
      en: 'Basic consultation is free. Expert text and video consultations are charged per the vet’s price. Subscribers enjoy exclusive discounts; the vet’s page shows the exact price.',
    },
  },
  {
    id: 'faq-7',
    question: { zh: '如何更换绑定宠物？', en: 'How do I switch the bound pet?' },
    answer: {
      zh: '在「我的宠物」中解绑旧宠物，再在「我的设备」里把项圈绑定到新宠物即可。同一项圈同一时间仅可绑定一只宠物。',
      en: 'Unbind the old pet under My Pets, then bind the collar to the new pet under My Devices. A collar can bind to only one pet at a time.',
    },
  },
  {
    id: 'faq-8',
    question: { zh: '订阅服务如何取消？', en: 'How do I cancel a subscription?' },
    answer: {
      zh: '进入「订阅服务」查看当前套餐，取消续费后当前周期仍可使用至到期日。取消不产生额外费用。',
      en: 'Open Subscription to view your current plan. After you cancel renewal, the current period remains valid until it expires. Cancellation is free.',
    },
  },
  {
    id: 'faq-9',
    question: { zh: '数据上传需要多久？', en: 'How long does data upload take?' },
    answer: {
      zh: '设备一般每 5 分钟自动上报一次；手动同步可在「数据同步」页一键执行，通常 10~30 秒内完成。',
      en: 'The device uploads roughly every 5 minutes. Manual sync is available on the Sync page and usually finishes within 10–30 seconds.',
    },
  },
  {
    id: 'faq-10',
    question: { zh: '我的数据安全吗？', en: 'Is my data private and safe?' },
    answer: {
      zh: '我们采用加密传输与存储，健康数据仅用于为您提供监护、报告与问诊服务，未经授权不会向第三方提供。详见「用户隐私政策」。',
      en: 'We use encrypted transmission and storage. Your data is used only to provide monitoring, reports and consultation, and is never shared with third parties without authorization. See the Privacy Policy.',
    },
  },
]

/* ============================================================
 * 协议（服务与隐私 5 份）
 * ============================================================ */
export interface AgreementContent {
  type: string
  title: BiText
  updatedAt: string
  paragraphs: { zh: string[]; en: string[] }
}

export const SETTINGS_AGREEMENTS: AgreementContent[] = [
  {
    type: 'userService',
    title: { zh: '用户服务协议', en: 'User Service Agreement' },
    updatedAt: '2026-08-01',
    paragraphs: {
      zh: [
        '欢迎使用数心智能·智慧宠物健康平台（以下简称"本平台"）。在使用本平台前，请您仔细阅读本协议的全部内容。您勾选同意或开始使用本平台服务，即视为您已阅读并同意本协议。',
        '一、服务说明',
        '本平台向宠物主提供宠物健康监护、设备管理、在线问诊、健康报告等互联网信息服务。平台基于您授权上传的宠物数据提供分析结果，分析结果仅供参考，不构成医疗诊断。',
        '二、账号与安全',
        '您应妥善保管账号及密码，因账号出借、泄露导致的损失由您自行承担。如发现账号被盗用，请立即联系我们冻结账号。',
        '三、用户行为规范',
        '您不得利用本平台从事违法违规活动，不得上传虚假、侵权或违反公序良俗的内容，否则平台有权停止服务并追究法律责任。',
        '四、服务变更与终止',
        '平台可根据业务发展调整或中止部分服务，重大变更将提前公示。您亦可随时申请注销账号，注销后相关数据将按隐私政策处理。',
        '五、免责声明与争议解决',
        '因不可抗力或第三方原因导致服务中断的，平台在法律允许范围内免责。本协议的解释与争议解决适用中华人民共和国法律。',
      ],
      en: [
        'Welcome to Shuxin AI · Smart Pet Health Platform (the "Platform"). Please read this agreement carefully before using the Platform. By checking the consent box or starting to use the service, you are deemed to have read and agreed to this agreement.',
        '1. Service Description',
        'The Platform provides pet owners with pet health monitoring, device management, online consultation, health reports and other internet information services. Analysis is based on data you authorize to upload and is for reference only, not medical diagnosis.',
        '2. Account & Security',
        'You are responsible for safeguarding your account and password. Loss caused by sharing or leaking your account is your own responsibility. If your account is compromised, contact us immediately to freeze it.',
        '3. Code of Conduct',
        'You must not use the Platform for illegal activities or upload false, infringing or objectionable content. The Platform may suspend service and pursue legal liability for violations.',
        '4. Service Changes & Termination',
        'The Platform may adjust or suspend parts of the service according to business development, with major changes announced in advance. You may apply to cancel your account at any time; related data is handled per the Privacy Policy.',
        '5. Disclaimers & Dispute Resolution',
        'The Platform is not liable, to the extent permitted by law, for service interruptions caused by force majeure or third parties. This agreement is governed by the laws of the People’s Republic of China.',
      ],
    },
  },
  {
    type: 'userPrivacy',
    title: { zh: '用户隐私政策', en: 'User Privacy Policy' },
    updatedAt: '2026-08-01',
    paragraphs: {
      zh: [
        '我们深知个人信息对您的重要性，将按照法律法规要求，采取安全保护措施保护您的个人信息。本政策向您说明我们如何收集、使用、存储和共享您的个人信息。',
        '一、我们收集的信息',
        '为提供服务，我们会收集您的账号信息、宠物档案及健康数据、设备信息，以及您主动提交的反馈内容。',
        '二、信息的使用',
        '我们使用上述信息用于：提供健康监护与报告、在线问诊、设备管理，以及改进产品体验。未经您的授权，我们不会将您的数据用于其他用途。',
        '三、信息的存储与保护',
        '您的数据采用加密方式存储在境内服务器，我们采取访问控制、加密传输等措施防止数据泄露、篡改或丢失。',
        '四、信息的共享',
        '除法律法规规定或经您明示同意外，我们不会向任何第三方共享您的个人信息。向医生提供问诊资料时，会先获得您的确认。',
        '五、您的权利',
        '您有权查询、更正、删除您的个人信息，或注销账号。您可通过「设置 → 意见反馈」联系我们行使上述权利。',
      ],
      en: [
        'We understand how important your personal information is and take security measures in accordance with laws and regulations. This policy explains how we collect, use, store and share your personal information.',
        '1. Information We Collect',
        'To provide the service, we collect your account information, pet profiles and health data, device information, and feedback you voluntarily submit.',
        '2. How Information Is Used',
        'We use the information to provide health monitoring and reports, online consultation, device management, and to improve the product experience. Without your authorization we do not use your data for other purposes.',
        '3. Storage & Protection',
        'Your data is encrypted and stored on domestic servers. We apply access control, encrypted transmission and other measures to prevent leakage, tampering or loss.',
        '4. Sharing',
        'We do not share your personal information with any third party except as required by law or with your explicit consent. Sharing records with a vet for consultation happens only after your confirmation.',
        '5. Your Rights',
        'You have the right to access, correct and delete your personal information, or cancel your account. Contact us via Settings → Feedback to exercise these rights.',
      ],
    },
  },
  {
    type: 'accountCancel',
    title: { zh: '账号注销协议', en: 'Account Cancellation Agreement' },
    updatedAt: '2026-08-01',
    paragraphs: {
      zh: [
        '您在申请注销账号前，请仔细阅读并充分理解本协议全部内容。注销账号是不可恢复的操作，请您谨慎决定。',
        '一、注销后果',
        '账号注销后，您将无法登录本平台，无法查看历史健康报告、问诊记录与订阅服务；宠物档案与设备绑定关系将被解除。',
        '二、数据删除',
        '注销后我们将按照法律法规要求删除您的个人信息或做匿名化处理，法律法规另有规定的除外（如交易记录须按法定期限保存）。',
        '三、未了结权益',
        '如您仍有未完成的订单、进行中的问诊或未到期的订阅服务，请先处理完毕再申请注销，以免造成权益损失。',
        '四、注销方式',
        '您可通过「设置 → 意见反馈」提交注销申请，我们将在核实身份后为您办理注销。',
      ],
      en: [
        'Please read and fully understand this agreement before applying to cancel your account. Cancelling is irreversible — please decide carefully.',
        '1. Consequences of Cancellation',
        'After cancellation you can no longer log in or view historical health reports, consultation records or subscriptions; pet profiles and device bindings are removed.',
        '2. Data Deletion',
        'After cancellation we delete or anonymize your personal information as required by law, except where law requires retention (e.g. transaction records retained for the statutory period).',
        '3. Outstanding Entitlements',
        'If you have unfinished orders, active consultations or unexpired subscriptions, settle them before applying for cancellation to avoid losing entitlements.',
        '4. How to Cancel',
        'Submit a cancellation request via Settings → Feedback. We will verify your identity and process the cancellation.',
      ],
    },
  },
  {
    type: 'deviceMonitor',
    title: { zh: '宠物设备监控协议', en: 'Pet Device Monitoring Agreement' },
    updatedAt: '2026-08-01',
    paragraphs: {
      zh: [
        '本协议适用于您使用智能项圈等宠物监护设备及相关监控服务（以下简称"监控服务"）。',
        '一、监控服务内容',
        '监控服务包括实时体征监测、位置围栏告警、异常状态提醒等。设备采集的数据将实时上传至平台进行记录与分析。',
        '二、设备使用规范',
        '请为设备正常充电并保持佩戴；设备仅用于宠物日常监护，不得用于其他用途。因使用不当造成的设备损坏不在质保范围内。',
        '三、围栏与告警',
        '位置围栏告警依赖设备定位与网络状态，可能存在一定误差；紧急情况请以实际位置为准并及时联系我们。',
        '四、异常数据处置',
        '当监测到宠物体征明显异常时，系统将发出告警并提示就医建议。监控数据不能替代专业医疗诊断。',
        '五、免责声明',
        '监控服务为辅助监护手段，平台不对因设备故障、网络异常或使用者疏忽导致的损失承担责任。',
      ],
      en: [
        'This agreement applies to your use of smart collars and related pet monitoring services (the "Monitoring Service").',
        '1. Scope of the Monitoring Service',
        'The Monitoring Service includes real-time vital sign monitoring, geofence alerts and abnormal-state reminders. Collected data is uploaded to the Platform in real time for recording and analysis.',
        '2. Device Usage Rules',
        'Keep the device charged and worn properly. The device is for daily pet monitoring only. Damage caused by misuse is not covered by warranty.',
        '3. Geofence & Alerts',
        'Geofence alerts depend on the device’s positioning and network status and may have some error. In an emergency rely on the actual location and contact us immediately.',
        '4. Handling Abnormal Data',
        'When abnormal vitals are detected, the system alerts you and suggests seeking veterinary care. Monitoring data cannot replace professional medical diagnosis.',
        '5. Disclaimer',
        'The Monitoring Service is an auxiliary aid. The Platform is not liable for loss caused by device failure, network issues or user negligence.',
      ],
    },
  },
  {
    type: 'healthReport',
    title: { zh: '健康报告协议', en: 'Health Report Agreement' },
    updatedAt: '2026-08-01',
    paragraphs: {
      zh: [
        '健康报告（以下简称"报告"）由平台基于宠物健康数据自动生成，本协议约定您使用报告的相关规则。',
        '一、报告的性质',
        '报告为数据统计分析结果，仅用于健康管理参考，不构成诊断、治疗或处方依据。涉及宠物健康问题请咨询专业兽医。',
        '二、报告的内容与更新',
        '报告包含体征趋势、异常提示与养护建议。报告随数据更新定期生成，历史报告可在「健康报告」中随时查看。',
        '三、报告的使用',
        '您可查看、下载并分享报告给在线医生。请勿将报告用于任何商业用途或对外公开发布。',
        '四、风险提示',
        '因数据采集误差或设备异常，报告可能与宠物实际状况存在偏差，请您结合实际情况判断。',
      ],
      en: [
        'Health reports (the "Report") are auto-generated by the Platform from pet health data. This agreement governs your use of the Report.',
        '1. Nature of the Report',
        'The Report is a statistical analysis for health-management reference only and does not constitute diagnosis, treatment or prescription. For health concerns please consult a professional vet.',
        '2. Content & Updates',
        'The Report includes vital trends, abnormal signals and care suggestions. It is generated periodically as data updates, and historical reports are available under Health Reports.',
        '3. Use of the Report',
        'You may view, download and share the Report with an online vet. Do not use it for commercial purposes or publish it publicly.',
        '4. Risk Notice',
        'Due to data-collection error or device abnormality, the Report may differ from your pet’s actual condition. Please judge in combination with the real situation.',
      ],
    },
  },
]
