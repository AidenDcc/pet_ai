import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AiReport —— 由 src/mock/modules/aiReport.ts 逐段翻译而来。
 *
 * 说明：
 *  1. 仅做逻辑翻译，不引入任何第三方依赖（JSON 解析、HTTP 调用均使用 JDK 自带能力）。
 *  2. 依赖 JDK 11+（java.net.http.HttpClient），并使用文本块（text block，需 JDK 15+）；
 *     若需兼容 JDK 11，可将文本块改写为普通字符串拼接。
 *  3. 原 TS 依赖的外部数据（dailyAgg / reports / pets / users / health）在 mock/db.ts 中生成，
 *     这里仅声明对应的存储结构，供调用方填充后复用同一套报告生成逻辑。
 */
public class AiReport {

    /* ============================================================
     * 常量
     * ============================================================ */

    private static final String AI_API_URL = "https://api.deepseek.com/v1/chat/completions";
    private static final String AI_API_KEY = System.getenv().getOrDefault("VITE_DS_API_KEY", "");
    private static final String AI_MODEL = "deepseek-chat";
    private static final long AI_TIMEOUT_MS = 300000L;
    private static final long DAY = 86400000L;

    /* ============================================================
     * 数据存储（对应 mock/db.ts 中由数据生成器填充的结构）
     * ============================================================ */

    /** 每日聚合体征/运动数据，key = petId */
    public static final Map<String, List<DailyAgg>> dailyAgg = new HashMap<>();

    /** 逐小时健康数据（buildTrend 单日粒度用），key = petId */
    public static final Map<String, List<HealthMetric>> health = new HashMap<>();

    /** 已生成报告列表 */
    public static final List<ReportItem> reports = new ArrayList<>();

    /** 宠物档案 */
    public static final List<PetInfo> pets = new ArrayList<>();

    /** 用户档案（DbUser） */
    public static final List<UserInfo> users = new ArrayList<>();

    /* ============================================================
     * 数据模型
     * ============================================================ */

    /** 宠物档案（仅保留 aiReport 用到的字段） */
    public static class PetInfo {
        public String id;
        public String name;
        public String species; // dog | cat
        public String breed;
        public String gender; // male | female
        public String birthDate;
        public double weight; // kg
        public String avatar;
        public String ownerId;
        public String deviceId;
        public boolean sterilized;
        public boolean isPregnant;
        public boolean isLactating;
    }

    /** 用户（DbUser，仅保留 aiReport 用到的字段） */
    public static class UserInfo {
        public String id;
        public String name;
        public String avatar;
        public String role; // user | doctor | admin
        public List<String> petIds = new ArrayList<>();
    }

    /** 异常项 */
    public static class AbnormalItem {
        public String key;
        public String label;
        public String value;
        public String level; // warn | danger | info
        public String suggestion;
    }

    /** 数值区间（含 max/min/avg 的通用容器） */
    public static class MinMax {
        public double avg;
        public double max;
        public double min;
    }

    /** 数值区间（仅 avg/min） */
    public static class AvgMin {
        public double avg;
        public double min;
    }

    /** 指标正常参考区间 */
    public static class ReferenceRanges {
        public String temperature;
        public String heartRate;
        public String spo2;
        public String respiratoryRate;
    }

    /** 运动汇总 */
    public static class ExerciseSummary {
        public double totalActivity;
        public double dailyActivity;
        public double stepFreq;
        public double stride;
        public double speed;
        public double exerciseDurationMin;
    }

    /** 与上一周期比较 */
    public static class Compare {
        public double temperature;
        public double heartRate;
        public double spo2;
        public double respiratoryRate;
        public double stepFreq;
        public double stride;
        public double speed;
        public double calorie;
    }

    /** 就医提示 */
    public static class VetReferral {
        public boolean needed;
        public String urgency; // routine | urgent | emergency
        public String warning;
        public List<String> suggestedExams = new ArrayList<>();
    }

    /** 体征汇总 */
    public static class MetricsSummary {
        public MinMax heartRate = new MinMax();
        public MinMax respiratoryRate = new MinMax();
        public AvgMin spo2 = new AvgMin();
        public MinMax temperature = new MinMax();
        public double totalActivity;
        public double sleepDuration;
    }

    /** 健康报告 */
    public static class ReportItem {
        public String id;
        public String reportNo;
        public String petId;
        public String period;
        public long startAt;
        public long endAt;
        public double score;
        public String summary;
        public String aiConclusion;
        public List<AbnormalItem> abnormal = new ArrayList<>();
        public MetricsSummary metricsSummary = new MetricsSummary();
        public String timeRange; // day | week | month
        public String source; // ai | offline
        public String grade; // A | B | C | D
        public String reportDetail;
        public ExerciseSummary exerciseSummary;
        public Compare compare;
        public ReferenceRanges referenceRanges;
        public List<String> recommendations;
        public VetReferral vetReferral;
        public String doctorId;
        public String doctorReview;
        public String doctorComment;
        public Long readAt;
        public long createdAt;
    }

    /** 每日聚合数据 */
    public static class DailyAgg {
        public long ts;
        public MinMax heartRate = new MinMax();
        public MinMax respiratoryRate = new MinMax();
        public MinMax spo2 = new MinMax();
        public MinMax temperature = new MinMax();
        public long steps;
        public double sleepHours;
        public double avgHeartRate;
    }

    /** 逐小时健康数据点 */
    public static class HealthMetric {
        public long ts;
        public double heartRate;
        public double respiratoryRate;
        public double spo2;
        public double temperature;
        public long activity;
        public String sleepStage;
    }

    /** 趋势点位 */
    public static class TrendPoint {
        public long ts;
        public double value;
    }

    /** 报告趋势 */
    public static class ReportTrend {
        public List<TrendPoint> heartRate = new ArrayList<>();
        public List<TrendPoint> respiratoryRate = new ArrayList<>();
        public List<TrendPoint> spo2 = new ArrayList<>();
        public List<TrendPoint> temperature = new ArrayList<>();
        public List<TrendPoint> calorie = new ArrayList<>();
        public List<TrendPoint> stepFreq = new ArrayList<>();
        public List<TrendPoint> stride = new ArrayList<>();
        public List<TrendPoint> speed = new ArrayList<>();
    }

    /** 体征聚合结果 */
    private static class VitalsAgg {
        double temperature;
        double heartRate;
        double respiratoryRate;
        double spo2;
        double days;
    }

    /** 运动聚合结果 */
    private static class ExerciseAgg {
        double totalActivity;
        double dailyActivity;
        double stepFreq;
        double stride;
        double speed;
        double durationMin;
        double days;
    }

    /** 周期极值 */
    private static class Extremes {
        double tempMax, tempMin;
        double hrMax, hrMin;
        double respMax, respMin;
        double spo2Min;
        double sleep;
    }

    /** 上一同期（体征 + 运动） */
    private static class Period {
        VitalsAgg vitals = new VitalsAgg();
        ExerciseAgg exercise = new ExerciseAgg();
    }

    /** 卡路里（RER / DER / 实际） */
    private static class Calorie {
        double rer;
        double der;
        double actual;
        double deviationPct;
    }

    /** 报告生成上下文 */
    private static class ReportInput {
        long startAt;
        long endAt;
        String timeRange;
        PetInfo pet;
        VitalsAgg vitals;
        ExerciseAgg exercise;
        ExerciseAgg baseline;
        Period prev;
        Calorie calorie;
        Extremes extremes;
        String source; // ai | offline
    }

    /** 本地规则引擎评级 */
    private static class LocalLevels {
        String temp, heart, spo2, resp, calorie, stepFreq, stride, speed;
    }

    private static class LocalAnalysis {
        LocalLevels levels;
        double score;
        String grade;
        Map<String, Double> deviations;
        Calorie calorie;
        List<AbnormalItem> abnormal;
        List<String> recommendations;
        String rootCause;
    }

    private static class AbnDef {
        String key, label, level, suggestion;
        AbnDef(String k, String l, String lv, String s) {
            key = k; label = l; level = lv; suggestion = s;
        }
    }

    /** 由步数推导的当日运动指标 */
    private static class DayExercise {
        double stepFreq;
        double stride;
        double speed;
        double durationMin;
    }

    /** 确定性随机（同一天两次生成结果一致） */
    private static class SeededRandom {
        int t;
        SeededRandom(long seed) {
            t = ((int) seed) ^ ((int) 0x9E3779B9L);
        }
        double next() {
            t += 0x6d2b79f5;
            int x = t;
            x = imul(x ^ (x >>> 15), x | 1);
            x ^= x + imul(x ^ (x >>> 7), x | 61);
            int u = x ^ (x >>> 14);
            return Integer.toUnsignedLong(u) / 4294967296.0;
        }
    }

    private static int imul(int a, int b) {
        return a * b;
    }

    /** 分级区间 */
    private static class Band {
        String level;
        double min;
        double max;
    }

    /** 生成参数 */
    public static class GenerateOpts {
        public Long startAt;
        public Long endAt;
        public String timeRange;
    }

    /** 生成结果（报告 + 关联元信息 + 趋势） */
    public static class GeneratedReport {
        public ReportItem report;
        public String petName;
        public String petAvatar;
        public String species;
        public String doctorName;
        public String ownerId;
        public String ownerName;
        public String ownerAvatar;
        public ReportTrend trend;
    }

    /* ============================================================
     * MockError / 上下文 / 权限
     * ============================================================ */

    public static class MockError extends RuntimeException {
        public int code;
        public MockError(String message) {
            this(message, 1);
        }
        public MockError(String message, int code) {
            super(message);
            this.code = code;
        }
    }

    public static class MockContext {
        public Map<String, String> params = new HashMap<>();
        public Map<String, Object> query = new HashMap<>();
        public Object body;
        public Map<String, String> headers = new HashMap<>();
        public UserInfo user;
    }

    private static UserInfo requireUser(MockContext ctx) {
        if (ctx.user == null) throw new MockError("请先登录", 401);
        return ctx.user;
    }

    private static UserInfo requireRole(MockContext ctx, String role) {
        UserInfo user = requireUser(ctx);
        if (!role.equals(user.role)) throw new MockError("无权限访问", 403);
        return user;
    }

    private static PetInfo findPetById(String id) {
        for (PetInfo p : pets) if (p.id.equals(id)) return p;
        return null;
    }

    private static UserInfo findUserById(String id) {
        for (UserInfo u : users) if (u.id.equals(id)) return u;
        return null;
    }

    /* ============================================================
     * 基础工具
     * ============================================================ */

    private static double median(List<Double> nums) {
        if (nums.isEmpty()) return 0;
        List<Double> sorted = new ArrayList<>(nums);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        return sorted.size() % 2 == 1 ? sorted.get(mid) : (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }

    private static double round1(double n) {
        return Math.round(n * 10) / 10.0;
    }

    private static double round2(double n) {
        return Math.round(n * 100) / 100.0;
    }

    private static int ageMonths(String birth) {
        LocalDate b = parseDate(birth);
        LocalDate now = LocalDate.now();
        return (now.getYear() - b.getYear()) * 12 + (now.getMonthValue() - b.getMonthValue());
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isEmpty()) return LocalDate.now();
        String d = s;
        int t = d.indexOf('T');
        if (t >= 0) d = d.substring(0, t);
        try {
            return LocalDate.parse(d);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private static String lifeStageOf(PetInfo pet) {
        if (pet.isLactating) return "lactating";
        if (pet.isPregnant) return "pregnant";
        int months = ageMonths(pet.birthDate);
        if (months < 12) return "puppy_kitten";
        double years = months / 12.0;
        if (("dog".equals(pet.species) && years > 7) || ("cat".equals(pet.species) && years > 10)) return "senior";
        return "adult";
    }

    private static String deriveTimeRange(long startAt, long endAt) {
        double days = (endAt - startAt) / (double) DAY;
        if (days <= 1.5) return "day";
        if (days <= 10) return "week";
        return "month";
    }

    /* ============================================================
     * id / 报告编号
     * ============================================================ */

    private static String uid(String prefix) {
        StringBuilder sb = new StringBuilder(prefix).append('_');
        for (int i = 0; i < 6; i++) {
            int v = (int) (Math.random() * 36);
            sb.append(Character.forDigit(v, 36));
        }
        String time = Long.toString(System.currentTimeMillis(), 36);
        sb.append(time.substring(Math.max(0, time.length() - 4)));
        return sb.toString();
    }

    private static long reportSeq = 0;

    private static String reportNo() {
        reportSeq += 1;
        LocalDate d = LocalDate.now();
        String ymd = String.format("%04d%02d%02d", d.getYear(), d.getMonthValue(), d.getDayOfMonth());
        return "RPT-" + ymd + "-" + String.format("%04d", reportSeq);
    }

    /* ============================================================
     * 运动推导（dayExercise + seeded）
     * ============================================================ */

    private static DayExercise dayExercise(PetInfo pet, long ts, long steps, long stepsMax) {
        boolean isCat = "cat".equals(pet.species);
        double baseFreq = isCat ? 45 : 80;
        double baseStride = isCat ? 16 : 26;
        SeededRandom rnd = new SeededRandom(ts / DAY);
        double active = Math.min(1.0, (double) steps / (double) stepsMax);
        DayExercise e = new DayExercise();
        e.stepFreq = Math.round(baseFreq + active * 60 + (rnd.next() * 16 - 8));
        e.stride = round1(baseStride + active * 12 + (rnd.next() * 4 - 2));
        e.speed = round2(0.3 + active * 1.2 + (rnd.next() * 0.3 - 0.15));
        e.durationMin = Math.round(20 + active * 70 + rnd.next() * 20);
        return e;
    }

    private static DayExercise dayExercise(PetInfo pet, long ts, long steps) {
        return dayExercise(pet, ts, steps, 12800);
    }

    /* ============================================================
     * 参考区间
     * ============================================================ */

    private static ReferenceRanges referenceRangesOf(PetInfo pet) {
        boolean dog = "dog".equals(pet.species);
        double w = pet.weight;
        String heart = dog ? (w < 10 ? "90 ~ 140" : w <= 30 ? "70 ~ 120" : "60 ~ 100") : "120 ~ 180";
        String resp = dog ? (w < 10 ? "15 ~ 30" : "10 ~ 25") : "16 ~ 30";
        ReferenceRanges r = new ReferenceRanges();
        r.temperature = "38.0 ~ 39.2 ℃";
        r.heartRate = heart + " 次/分";
        r.spo2 = "≥ 95 %";
        r.respiratoryRate = resp + " 次/分";
        return r;
    }

    /* ============================================================
     * 数据聚合
     * ============================================================ */

    private static List<DailyAgg> filterDaily(String petId, long startAt, long endAt) {
        List<DailyAgg> out = new ArrayList<>();
        List<DailyAgg> list = dailyAgg.get(petId);
        if (list != null) {
            for (DailyAgg d : list) if (d.ts >= startAt && d.ts <= endAt) out.add(d);
        }
        return out;
    }

    private static VitalsAgg aggVitals(String petId, long startAt, long endAt) {
        List<DailyAgg> days = filterDaily(petId, startAt, endAt);
        List<Double> temps = new ArrayList<>();
        List<Double> hrs = new ArrayList<>();
        List<Double> rrs = new ArrayList<>();
        List<Double> spo2s = new ArrayList<>();
        for (DailyAgg d : days) {
            temps.add(d.temperature.avg);
            hrs.add(d.heartRate.avg);
            rrs.add(d.respiratoryRate.avg);
            spo2s.add(d.spo2.avg);
        }
        VitalsAgg a = new VitalsAgg();
        a.temperature = round1(median(temps));
        a.heartRate = Math.round(median(hrs));
        a.respiratoryRate = Math.round(median(rrs));
        a.spo2 = round1(median(spo2s));
        a.days = days.size();
        return a;
    }

    private static ExerciseAgg aggExercise(PetInfo pet, long startAt, long endAt) {
        List<DailyAgg> days = filterDaily(pet.id, startAt, endAt);
        ExerciseAgg a = new ExerciseAgg();
        if (days.isEmpty()) return a;
        List<Double> stepFreqs = new ArrayList<>();
        List<Double> strides = new ArrayList<>();
        List<Double> speeds = new ArrayList<>();
        List<Double> durations = new ArrayList<>();
        double total = 0;
        for (DailyAgg d : days) {
            DayExercise e = dayExercise(pet, d.ts, d.steps, 12800);
            total += d.steps;
            stepFreqs.add(e.stepFreq);
            strides.add(e.stride);
            speeds.add(e.speed);
            durations.add(e.durationMin);
        }
        a.totalActivity = total;
        a.dailyActivity = Math.round(total / days.size());
        a.stepFreq = Math.round(median(stepFreqs));
        a.stride = round1(median(strides));
        a.speed = round2(median(speeds));
        a.durationMin = Math.round(median(durations));
        a.days = days.size();
        return a;
    }

    /** 周期极值与睡眠（metricsSummary 用） */
    private static Extremes aggExtremes(String petId, long startAt, long endAt) {
        List<DailyAgg> days = filterDaily(petId, startAt, endAt);
        Extremes e = new Extremes();
        if (days.isEmpty()) return e;
        double tempMax = Double.NEGATIVE_INFINITY, tempMin = Double.POSITIVE_INFINITY;
        double hrMax = Double.NEGATIVE_INFINITY, hrMin = Double.POSITIVE_INFINITY;
        double respMax = Double.NEGATIVE_INFINITY, respMin = Double.POSITIVE_INFINITY;
        double spo2Min = Double.POSITIVE_INFINITY;
        List<Double> sleeps = new ArrayList<>();
        for (DailyAgg d : days) {
            tempMax = Math.max(tempMax, d.temperature.max);
            tempMin = Math.min(tempMin, d.temperature.min);
            hrMax = Math.max(hrMax, d.heartRate.max);
            hrMin = Math.min(hrMin, d.heartRate.min);
            respMax = Math.max(respMax, d.respiratoryRate.max);
            respMin = Math.min(respMin, d.respiratoryRate.min);
            spo2Min = Math.min(spo2Min, d.spo2.min);
            sleeps.add(d.sleepHours);
        }
        e.tempMax = round1(tempMax);
        e.tempMin = round1(tempMin);
        e.hrMax = hrMax;
        e.hrMin = hrMin;
        e.respMax = respMax;
        e.respMin = respMin;
        e.spo2Min = round1(spo2Min);
        e.sleep = round1(median(sleeps));
        return e;
    }

    /** 基线窗口天数：day=30 / week=90 / month=180 */
    private static int baselineWindow(String timeRange) {
        if ("day".equals(timeRange)) return 30;
        if ("week".equals(timeRange)) return 90;
        return 180;
    }

    /** 卡路里：每日步数 × 0.05 kcal */
    private static double dailyCalorie(ExerciseAgg exercise) {
        return Math.round(exercise.dailyActivity * 0.05);
    }

    private static double derFactor(PetInfo pet, String lifeStage) {
        boolean dog = "dog".equals(pet.species);
        int months = ageMonths(pet.birthDate);
        if ("pregnant".equals(lifeStage)) return dog ? 2.5 : 2.2;
        if ("lactating".equals(lifeStage)) return dog ? 4.0 : 3.0;
        if (months < 4) return dog ? 3.0 : 2.5;
        if (months < 12) return 2.0;
        double years = months / 12.0;
        if ((dog && years > 7) || (!dog && years > 10)) return dog ? 1.3 : 1.1;
        return pet.sterilized ? (dog ? 1.6 : 1.2) : (dog ? 1.8 : 1.4);
    }

    /* ============================================================
     * AI 提示词（规则文档 §8）
     * ============================================================ */

    private static final String SYSTEM_PROMPT = """
你是一位资深宠物健康分析师，具备兽医临床诊断学专业知识。
你的任务是根据输入的宠物生理数据、运动数据和主人观察，按照《宠物健康数据分析规则体系（行业修订版）》生成结构化健康报告。

核心原则：
1. 严格依据规则进行计算和分级，不臆测、不夸大
2. 生理指标按体型/年龄分层判定，运动指标按个体基线对比
3. 支持多时间粒度（day/week/month），各粒度容错阈值不同
4. 主人主观观察作为临床线索，可触发评级上调
5. 存在一票升级规则中的任意一项，直接判定D级
6. 报告语言应专业、清晰、易懂，避免过度医学术语
7. 所有数值计算必须展示过程，确保可审计
8. 时间粒度为 week/month 时，必须强调"趋势性"结论，避免用单日逻辑
""";

    private static final Map<String, String> TIME_RANGE_LABEL = new HashMap<>();
    static {
        TIME_RANGE_LABEL.put("day", "day（单日）");
        TIME_RANGE_LABEL.put("week", "week（近7天）");
        TIME_RANGE_LABEL.put("month", "month（近30天）");
    }

    private static final String JSON_SCHEMA = """
{
  "time_range": "day/week/month",
  "overall_grade": "A/B/C/D",
  "overall_score": 0.0,
  "grade_description": "...",
  "next_review_days": 0,
  "data_credibility": "high/medium/low/insufficient",
  "indicators": {
    "temperature": {"level": "正常/关注/异常/危急", "value": 0, "reference_range": "...", "data_points": 0, "suggestion": "..."},
    "heart_rate": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "spo2": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "respiratory_rate": {"level": "...", "value": 0, "reference_range": "...", "suggestion": "..."},
    "calories": {"level": "...", "rer": 0, "der": 0, "actual": 0, "deviation_pct": 0, "suggestion": "..."},
    "step_frequency": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "suggestion": "..."},
    "step_length": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "symmetry": "...", "suggestion": "..."},
    "gait": {"level": "...", "description": "...", "suggestion": "..."},
    "movement_speed": {"level": "...", "value": 0, "baseline": 0, "deviation_pct": 0, "suggestion": "..."}
  },
  "abnormal_indicators": [],
  "root_cause_analysis": "...",
  "recommendations": [],
  "vet_referral": {"needed": false, "urgency": "routine/urgent/emergency", "suggested_exams": [], "warning": "..."},
  "report_summary": "...",
  "report_detail": "...",
  "calculation_notes": "...",
  "report_generated_at": "..."
}
""";

    private static String buildUserPrompt(ReportInput in) {
        String timeRange = in.timeRange;
        PetInfo pet = in.pet;
        VitalsAgg vitals = in.vitals;
        ExerciseAgg exercise = in.exercise;
        ExerciseAgg baseline = in.baseline;
        Period prev = in.prev;
        Calorie calorie = in.calorie;
        int months = ageMonths(pet.birthDate);
        String timeRangeLabel = TIME_RANGE_LABEL.get(timeRange);

        StringBuilder sb = new StringBuilder();
        sb.append("请根据以下宠物健康数据生成").append(timeRangeLabel).append("健康报告：\n\n");
        sb.append("【分析时间粒度】").append(timeRange).append("\n");
        sb.append("（day=单日，week=近7天，month=近30天）\n\n");
        sb.append("【宠物基础信息】\n");
        sb.append("- 物种：").append(pet.species).append("\n");
        sb.append("- 品种：").append(pet.breed).append("\n");
        sb.append("- 体重：").append(pet.weight).append(" kg\n");
        sb.append("- 月龄：").append(months).append("\n");
        sb.append("- 性别：").append(pet.gender).append("，是否绝育：").append(pet.sterilized).append("\n");
        sb.append("- 生命阶段：").append(lifeStageOf(pet)).append("\n");
        sb.append("- 目标体重：无\n\n");
        sb.append("【").append(timeRange).append("生理指标（已聚合）】\n");
        sb.append("- 体温：").append(vitals.temperature).append(" ℃（有效数据点：").append(vitals.days).append("）\n");
        sb.append("- 静息心率：").append(vitals.heartRate).append(" 次/分（有效数据点：").append(vitals.days).append("）\n");
        sb.append("- 血氧饱和度：").append(vitals.spo2).append(" %（有效数据点：").append(vitals.days).append("）\n");
        sb.append("- 静息呼吸频率：").append(vitals.respiratoryRate).append(" 次/分（有效数据点：").append(vitals.days).append("）\n\n");
        sb.append("【").append(timeRange).append("运动指标（已聚合）】\n");
        sb.append("- 步频：").append(exercise.stepFreq).append(" 步/分\n");
        sb.append("- 平均步幅：").append(exercise.stride).append(" cm\n");
        sb.append("- 左/右步幅：暂无\n");
        sb.append("- 步态异常标记：false\n");
        sb.append("- 运动速度：").append(exercise.speed).append(" m/s\n");
        sb.append("- 运动时长：").append(exercise.durationMin).append(" 分钟/日\n");
        sb.append("- 有效运动数据天数：").append(exercise.days).append("\n\n");
        sb.append("【历史基线数据】\n");
        sb.append("- 基线步频：").append(baseline.stepFreq).append(" 步/分\n");
        sb.append("- 基线步幅：").append(baseline.stride).append(" cm\n");
        sb.append("- 基线速度：").append(baseline.speed).append(" m/s\n");
        sb.append("- 基线数据天数：").append(baseline.days).append(" 天\n\n");
        sb.append("【设备卡路里数据（日均）】\n");
        sb.append("- 数据类型：active（活动消耗）\n");
        sb.append("- 日均数值：").append(calorie.actual).append(" kcal（RER=").append(Math.round(calorie.rer))
                .append("，DER=").append(Math.round(calorie.der)).append("）\n\n");
        sb.append("【上一同期趋势数据】\n");
        sb.append("- 上期体温：").append(prev.vitals.temperature).append("\n");
        sb.append("- 上期心率：").append(prev.vitals.heartRate).append("\n");
        sb.append("- 上期血氧：").append(prev.vitals.spo2).append("\n");
        sb.append("- 上期呼吸：").append(prev.vitals.respiratoryRate).append("\n");
        sb.append("- 上期步频：").append(prev.exercise.stepFreq).append("\n");
        sb.append("- 上期步幅：").append(prev.exercise.stride).append("\n");
        sb.append("- 上期速度：").append(prev.exercise.speed).append("\n");
        sb.append("- 上期日均卡路里：").append(Math.round(prev.exercise.dailyActivity * 0.05)).append("\n\n");
        sb.append("【主人主观观察（").append(timeRange).append("内最严重记录）】\n");
        sb.append("- 精神状态：normal\n- 食欲：normal\n- 饮水：normal\n- 排尿：normal\n- 大便形态：normal\n- 大便颜色：normal_brown\n- 被毛皮肤：normal\n- 呕吐：false\n- 其他观察：（无）\n\n");
        sb.append("【环境标记】\n");
        sb.append("- 极端天气：false\n- 时段内生病/服药：false\n- 应激事件：无\n\n");
        sb.append("请严格按照以下步骤处理：\n");
        sb.append("STEP 1：计算RER和DER（RER = 70 × 体重^0.75；按 life_stage 匹配系数得 DER；处理 active 类型：日均总消耗 = actual + RER；按 time_range 阈值判定卡路里等级）\n");
        sb.append("STEP 2：生理指标分级（体温通用标准；心率按体型+年龄修正；血氧通用标准；呼吸按体型/物种）\n");
        sb.append("STEP 3：运动指标分级（与基线对比偏离百分比，按 time_range 阈值；注意步态与对称性）\n");
        sb.append("STEP 4：趋势分析（与 prev_period 对比，判定 stable/worsening/improving）\n");
        sb.append("STEP 5：主人观察整合（本例全部 normal，不触发上调）\n");
        sb.append("STEP 6：综合评级（按权重计算加权总分，按 time_range 阈值输出 A/B/C/D；检查一票升级规则）\n");
        sb.append("STEP 7：归因与建议（单指标归因、多指标关联归因、按评级与 time_range 输出建议模板、就医建议）\n\n");
        sb.append("请只输出以下格式的JSON（不要输出任何其他文字或 markdown 代码块）：\n");
        sb.append(JSON_SCHEMA);
        sb.append("\n\n注意事项：\n");
        sb.append("- calculation_notes 必须包含 RER/DER 计算过程与各指标偏离百分比计算过程\n");
        sb.append("- report_detail 使用 Markdown 格式，包含：摘要、各指标详情、趋势分析、综合结论、建议清单、就医提示（如需要）\n");
        sb.append("- 所有建议必须具体可执行\n");
        sb.append("- time_range 为 week/month 时，report_detail 中必须强调\"本周/本月趋势\"，避免使用\"今日\"表述\n");
        sb.append("- 若基线天数不足，在运动指标部分明确说明\"基线建立中，分级仅供参考\"\n");
        sb.append("- 若数据点不足，在对应指标处标记\"数据可信度低\"");
        return sb.toString();
    }

    /* ============================================================
     * AI 客户端
     * ============================================================ */

    private static String callAi(String system, String user) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        String body = buildChatBody(system, user);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(AI_API_URL))
                .timeout(Duration.ofMillis(AI_TIMEOUT_MS))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + AI_API_KEY)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new MockError("AI 接口返回 " + resp.statusCode());
        }
        Object json = parseJson(resp.body());
        List<?> choices = json instanceof Map ? (List<?>) ((Map<?, ?>) json).get("choices") : null;
        if (choices == null || choices.isEmpty()) throw new MockError("AI 返回内容为空");
        Map<?, ?> first = (Map<?, ?>) choices.get(0);
        Map<?, ?> message = (Map<?, ?>) first.get("message");
        Object content = message.get("content");
        if (content == null) throw new MockError("AI 返回内容为空");
        return String.valueOf(content);
    }

    private static String buildChatBody(String system, String user) {
        return "{\"model\":\"" + AI_MODEL + "\",\"messages\":["
                + "{\"role\":\"system\",\"content\":" + jsonString(system) + "},"
                + "{\"role\":\"user\",\"content\":" + jsonString(user) + "}],"
                + "\"temperature\":0.3}";
    }

    private static String jsonString(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append("\"").toString();
    }

    private static Object extractJson(String content) {
        String trimmed = content.trim();
        String boxed = matchBetween(trimmed, "<|begin_of_box|>", "<|end_of_box|>");
        String fenced = matchFenced(trimmed);
        String raw = (boxed != null ? boxed : (fenced != null ? fenced : trimmed)).trim();
        try {
            return parseJson(raw);
        } catch (Exception e) {
            int start = raw.indexOf('{');
            int end = raw.lastIndexOf('}');
            if (start != -1 && end > start) {
                return parseJson(raw.substring(start, end + 1));
            }
            throw new MockError("AI 返回内容不是有效 JSON");
        }
    }

    private static String matchBetween(String s, String open, String close) {
        int i = s.indexOf(open);
        if (i < 0) return null;
        int j = s.indexOf(close, i + open.length());
        if (j < 0) return null;
        return s.substring(i + open.length(), j);
    }

    private static String matchFenced(String s) {
        int i = s.indexOf("```");
        if (i < 0) return null;
        int contentStart = i + 3;
        if (s.regionMatches(contentStart, "json", 0, 4)) contentStart += 4;
        while (contentStart < s.length() && Character.isWhitespace(s.charAt(contentStart))) contentStart++;
        int j = s.indexOf("```", contentStart);
        if (j < 0) return null;
        return s.substring(contentStart, j);
    }

    /* ============================================================
     * 极简 JSON 解析（无第三方依赖）
     * ============================================================ */

    private static Object parseJson(String s) {
        JsonParser p = new JsonParser(s);
        Object v = p.parseValue();
        p.skipWs();
        if (p.pos < s.length()) throw new MockError("JSON 尾部多余内容");
        return v;
    }

    private static class JsonParser {
        String s;
        int pos;

        JsonParser(String s) {
            this.s = s;
        }

        void skipWs() {
            while (pos < s.length() && Character.isWhitespace(s.charAt(pos))) pos++;
        }

        Object parseValue() {
            skipWs();
            if (pos >= s.length()) throw new MockError("JSON 不完整");
            char c = s.charAt(pos);
            if (c == '{') return parseObject();
            if (c == '[') return parseArray();
            if (c == '"') return parseString();
            if (c == 't') { expect("true"); return Boolean.TRUE; }
            if (c == 'f') { expect("false"); return Boolean.FALSE; }
            if (c == 'n') { expect("null"); return null; }
            return parseNumber();
        }

        Map<String, Object> parseObject() {
            pos++; // {
            Map<String, Object> m = new LinkedHashMap<>();
            skipWs();
            if (pos < s.length() && s.charAt(pos) == '}') { pos++; return m; }
            while (true) {
                skipWs();
                String key = parseString();
                skipWs();
                if (pos >= s.length() || s.charAt(pos) != ':') throw new MockError("JSON 对象缺少冒号");
                pos++;
                Object v = parseValue();
                m.put(key, v);
                skipWs();
                if (pos < s.length() && s.charAt(pos) == ',') { pos++; continue; }
                if (pos < s.length() && s.charAt(pos) == '}') { pos++; return m; }
                throw new MockError("JSON 对象未闭合");
            }
        }

        List<Object> parseArray() {
            pos++; // [
            List<Object> a = new ArrayList<>();
            skipWs();
            if (pos < s.length() && s.charAt(pos) == ']') { pos++; return a; }
            while (true) {
                a.add(parseValue());
                skipWs();
                if (pos < s.length() && s.charAt(pos) == ',') { pos++; continue; }
                if (pos < s.length() && s.charAt(pos) == ']') { pos++; return a; }
                throw new MockError("JSON 数组未闭合");
            }
        }

        String parseString() {
            pos++; // "
            StringBuilder sb = new StringBuilder();
            while (pos < s.length()) {
                char c = s.charAt(pos++);
                if (c == '"') return sb.toString();
                if (c == '\\') {
                    char e = s.charAt(pos++);
                    switch (e) {
                        case '"': sb.append('"'); break;
                        case '\\': sb.append('\\'); break;
                        case '/': sb.append('/'); break;
                        case 'b': sb.append('\b'); break;
                        case 'f': sb.append('\f'); break;
                        case 'n': sb.append('\n'); break;
                        case 'r': sb.append('\r'); break;
                        case 't': sb.append('\t'); break;
                        case 'u': {
                            String hex = s.substring(pos, pos + 4);
                            pos += 4;
                            sb.append((char) Integer.parseInt(hex, 16));
                            break;
                        }
                        default: sb.append(e);
                    }
                } else {
                    sb.append(c);
                }
            }
            throw new MockError("JSON 字符串未闭合");
        }

        Object parseNumber() {
            int start = pos;
            while (pos < s.length() && "-+0123456789.eE".indexOf(s.charAt(pos)) >= 0) pos++;
            String num = s.substring(start, pos);
            if (num.indexOf('.') >= 0 || num.indexOf('e') >= 0 || num.indexOf('E') >= 0) {
                try { return Double.parseDouble(num); } catch (Exception e) { return 0.0; }
            }
            try { return Long.parseLong(num); } catch (Exception e) {
                try { return Double.parseDouble(num); } catch (Exception e2) { return 0L; }
            }
        }

        void expect(String w) {
            if (s.startsWith(w, pos)) pos += w.length();
            else throw new MockError("JSON 非法字面量");
        }
    }

    private static String toStr(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static double toDouble(Object o) {
        if (o == null) return 0;
        if (o instanceof Number) return ((Number) o).doubleValue();
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 0; }
    }

    private static long toLong(Object o) {
        if (o == null) return 0;
        if (o instanceof Number) return ((Number) o).longValue();
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return 0; }
    }

    private static boolean toBool(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean) return (Boolean) o;
        if (o instanceof Number) return ((Number) o).doubleValue() != 0;
        return "true".equalsIgnoreCase(String.valueOf(o));
    }

    /* ============================================================
     * AI 结果 → ReportItem
     * ============================================================ */

    private static final Map<String, String> INDICATOR_LABEL = new HashMap<>();
    static {
        INDICATOR_LABEL.put("temperature", "体温");
        INDICATOR_LABEL.put("heart_rate", "心率");
        INDICATOR_LABEL.put("spo2", "血氧饱和度");
        INDICATOR_LABEL.put("respiratory_rate", "呼吸频率");
        INDICATOR_LABEL.put("calories", "卡路里");
        INDICATOR_LABEL.put("step_frequency", "步频");
        INDICATOR_LABEL.put("step_length", "步幅");
        INDICATOR_LABEL.put("gait", "步态");
        INDICATOR_LABEL.put("movement_speed", "运动速度");
    }

    private static final Map<String, Integer> GRADE_SCORE = new HashMap<>();
    static {
        GRADE_SCORE.put("A", 95);
        GRADE_SCORE.put("B", 86);
        GRADE_SCORE.put("C", 73);
        GRADE_SCORE.put("D", 52);
    }

    private static final Map<String, String> GRADE_DESC = new HashMap<>();
    static {
        GRADE_DESC.put("A", "生理机能稳定，运动状态良好，代谢均衡，持续当前养护即可");
        GRADE_DESC.put("B", "整体健康良好，个别指标轻微波动，建议保持观察，无需干预");
        GRADE_DESC.put("C", "存在明确亚健康信号，需针对性调整（饮食/运动/环境），建议复查");
        GRADE_DESC.put("D", "存在明确病理风险，建议尽快就医检查");
    }

    private static boolean isGrade(String g) {
        return "A".equals(g) || "B".equals(g) || "C".equals(g) || "D".equals(g);
    }

    private static boolean isUrgency(String u) {
        return "routine".equals(u) || "urgent".equals(u) || "emergency".equals(u);
    }

    private static ReportItem mapAiReport(PetInfo pet, Map<String, Object> ai, ReportInput ctx) {
        String gradeRaw = toStr(ai.get("overall_grade")).toUpperCase();
        if (gradeRaw.isEmpty()) gradeRaw = "B";
        String grade = isGrade(gradeRaw) ? gradeRaw : "B";

        Object indObj = ai.get("indicators");
        Map<String, Object> indicators = indObj instanceof Map ? (Map<String, Object>) indObj : new LinkedHashMap<>();
        List<AbnormalItem> abnormal = new ArrayList<>();
        for (Map.Entry<String, Object> en : indicators.entrySet()) {
            String key = en.getKey();
            Map<String, Object> ind = en.getValue() instanceof Map ? (Map<String, Object>) en.getValue() : new LinkedHashMap<>();
            String level = toStr(ind.get("level"));
            if (L_ABNORMAL.equals(level) || L_DANGER.equals(level)) {
                AbnormalItem a = new AbnormalItem();
                a.key = key;
                a.label = INDICATOR_LABEL.containsKey(key) ? INDICATOR_LABEL.get(key) : key;
                a.value = level;
                a.level = L_DANGER.equals(level) ? "danger" : "warn";
                String sug = toStr(ind.get("suggestion"));
                a.suggestion = sug.isEmpty() ? "详见报告结论。" : sug;
                abnormal.add(a);
            }
        }

        String periodStart = formatDateCn(ctx.startAt);
        String periodEnd = formatDateCn(ctx.endAt);
        long now = System.currentTimeMillis();
        ExerciseAgg e = ctx.exercise;
        Extremes ext = ctx.extremes;

        String summary = toStr(ai.get("report_summary"));
        if (summary.isEmpty()) summary = pet.name + " 该周期健康状态评估完毕。";
        String reportDetail = toStr(ai.get("report_detail"));
        if (reportDetail.isEmpty()) {
            reportDetail = "# " + pet.name + " 健康报告\n\n" + summary + "\n\n> 综合评级：" + grade + " 级\n> " + GRADE_DESC.get(grade);
        }

        VitalsAgg prevV = ctx.prev.vitals;
        ExerciseAgg prevE = ctx.prev.exercise;
        Compare compare = new Compare();
        compare.temperature = round1(ctx.vitals.temperature - prevV.temperature);
        compare.heartRate = Math.round(ctx.vitals.heartRate - prevV.heartRate);
        compare.spo2 = round1(ctx.vitals.spo2 - prevV.spo2);
        compare.respiratoryRate = Math.round(ctx.vitals.respiratoryRate - prevV.respiratoryRate);
        compare.stepFreq = Math.round(ctx.exercise.stepFreq - prevE.stepFreq);
        compare.stride = round1(ctx.exercise.stride - prevE.stride);
        compare.speed = round2(ctx.exercise.speed - prevE.speed);
        compare.calorie = dailyCalorie(ctx.exercise) - dailyCalorie(prevE);

        List<String> recommendations = new ArrayList<>();
        Object recObj = ai.get("recommendations");
        if (recObj instanceof List) {
            for (Object r : (List<?>) recObj) {
                String s = toStr(r);
                if (!s.isEmpty()) recommendations.add(s);
            }
        }

        Object vetObj = ai.get("vet_referral");
        Map<String, Object> vetRaw = vetObj instanceof Map ? (Map<String, Object>) vetObj : new LinkedHashMap<>();
        String urgencyRaw = toStr(vetRaw.get("urgency"));
        if (urgencyRaw.isEmpty()) urgencyRaw = "routine";
        VetReferral vetReferral = new VetReferral();
        vetReferral.needed = toBool(vetRaw.get("needed"));
        vetReferral.urgency = isUrgency(urgencyRaw) ? urgencyRaw : "routine";
        vetReferral.warning = toStr(vetRaw.get("warning"));
        Object exams = vetRaw.get("suggested_exams");
        if (exams instanceof List) {
            for (Object s : (List<?>) exams) {
                String ss = toStr(s);
                if (!ss.isEmpty()) vetReferral.suggestedExams.add(ss);
            }
        }

        ReportItem r = new ReportItem();
        r.id = uid("r");
        r.reportNo = reportNo();
        r.petId = pet.id;
        r.period = periodStart + " 至 " + periodEnd;
        r.startAt = ctx.startAt;
        r.endAt = ctx.endAt;
        r.score = GRADE_SCORE.get(grade);
        r.summary = summary;
        r.aiConclusion = summary;
        r.abnormal = abnormal;
        r.metricsSummary.heartRate.avg = ctx.vitals.heartRate;
        r.metricsSummary.heartRate.max = ext.hrMax;
        r.metricsSummary.heartRate.min = ext.hrMin;
        r.metricsSummary.respiratoryRate.avg = ctx.vitals.respiratoryRate;
        r.metricsSummary.respiratoryRate.max = ext.respMax;
        r.metricsSummary.respiratoryRate.min = ext.respMin;
        r.metricsSummary.spo2.avg = ctx.vitals.spo2;
        r.metricsSummary.spo2.min = ext.spo2Min;
        r.metricsSummary.temperature.avg = ctx.vitals.temperature;
        r.metricsSummary.temperature.max = ext.tempMax;
        r.metricsSummary.temperature.min = ext.tempMin;
        r.metricsSummary.totalActivity = e.totalActivity;
        r.metricsSummary.sleepDuration = ext.sleep;
        r.exerciseSummary = new ExerciseSummary();
        r.exerciseSummary.totalActivity = e.totalActivity;
        r.exerciseSummary.dailyActivity = e.dailyActivity;
        r.exerciseSummary.stepFreq = e.stepFreq;
        r.exerciseSummary.stride = e.stride;
        r.exerciseSummary.speed = e.speed;
        r.exerciseSummary.exerciseDurationMin = e.durationMin;
        r.timeRange = ctx.timeRange;
        r.source = ctx.source;
        r.grade = grade;
        r.reportDetail = reportDetail;
        r.compare = compare;
        r.referenceRanges = referenceRangesOf(pet);
        r.recommendations = recommendations;
        r.vetReferral = vetReferral;
        r.doctorId = null;
        r.doctorReview = "pending";
        r.doctorComment = null;
        r.readAt = null;
        r.createdAt = now;
        return r;
    }

    private static String formatDateCn(long ms) {
        LocalDateTime dt = LocalDateTime.ofInstant(Instant.ofEpochMilli(ms), ZoneId.systemDefault());
        return dt.getYear() + "/" + dt.getMonthValue() + "/" + dt.getDayOfMonth();
    }

    /* ============================================================
     * 本地规则引擎兜底（AI 不可达时按规则文档 §3/§4 计算）
     * ============================================================ */

    private static final String L_NORMAL = "正常";
    private static final String L_CONCERN = "关注";
    private static final String L_ABNORMAL = "异常";
    private static final String L_DANGER = "危急";

    private static final Map<String, Integer> LEVEL_POINTS = new HashMap<>();
    static {
        LEVEL_POINTS.put(L_NORMAL, 0);
        LEVEL_POINTS.put(L_CONCERN, 1);
        LEVEL_POINTS.put(L_ABNORMAL, 2);
        LEVEL_POINTS.put(L_DANGER, 4);
    }

    private static Band band(String level, double min, double max) {
        Band b = new Band();
        b.level = level;
        b.min = min;
        b.max = max;
        return b;
    }

    private static List<Band> list(Band... bs) {
        List<Band> l = new ArrayList<>();
        for (Band b : bs) l.add(b);
        return l;
    }

    private static List<Band> applyAge(PetInfo pet, List<Band> bands) {
        int months = ageMonths(pet.birthDate);
        double years = months / 12.0;
        boolean young = months < 6;
        boolean senior = "cat".equals(pet.species) ? years > 10 : years > 8;
        if (!young && !senior) return bands;
        List<Band> out = new ArrayList<>();
        for (Band b : bands) {
            Band nb = new Band();
            nb.level = b.level;
            nb.min = senior ? b.min - 10 : b.min;
            nb.max = young ? b.max + 20 : b.max;
            out.add(nb);
        }
        return out;
    }

    private static String levelInBands(double v, List<Band> bands) {
        for (Band b : bands) if (v >= b.min && v <= b.max) return b.level;
        return L_ABNORMAL;
    }

    private static final Map<String, List<Band>> HEART_BANDS = new HashMap<>();
    private static final Map<String, List<Band>> RESP_BANDS = new HashMap<>();
    static {
        HEART_BANDS.put("cat", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 79),
                band(L_ABNORMAL, 80, 99),
                band(L_CONCERN, 100, 119),
                band(L_NORMAL, 120, 180),
                band(L_CONCERN, 181, 200),
                band(L_ABNORMAL, 201, 220),
                band(L_DANGER, 221, Double.POSITIVE_INFINITY)));
        HEART_BANDS.put("smallDog", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 69),
                band(L_ABNORMAL, 70, 79),
                band(L_CONCERN, 80, 89),
                band(L_NORMAL, 90, 140),
                band(L_CONCERN, 141, 160),
                band(L_ABNORMAL, 161, 180),
                band(L_DANGER, 181, Double.POSITIVE_INFINITY)));
        HEART_BANDS.put("mediumDog", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 49),
                band(L_ABNORMAL, 50, 59),
                band(L_CONCERN, 60, 69),
                band(L_NORMAL, 70, 120),
                band(L_CONCERN, 121, 140),
                band(L_ABNORMAL, 141, 160),
                band(L_DANGER, 161, Double.POSITIVE_INFINITY)));
        HEART_BANDS.put("largeDog", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 39),
                band(L_ABNORMAL, 40, 49),
                band(L_CONCERN, 50, 59),
                band(L_NORMAL, 60, 100),
                band(L_CONCERN, 101, 120),
                band(L_ABNORMAL, 121, 140),
                band(L_DANGER, 141, Double.POSITIVE_INFINITY)));

        RESP_BANDS.put("smallDog", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 9),
                band(L_CONCERN, 10, 14),
                band(L_NORMAL, 15, 30),
                band(L_CONCERN, 31, 40),
                band(L_ABNORMAL, 41, 50),
                band(L_DANGER, 51, Double.POSITIVE_INFINITY)));
        RESP_BANDS.put("mediumLargeDog", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 9),
                band(L_NORMAL, 10, 25),
                band(L_CONCERN, 26, 35),
                band(L_ABNORMAL, 36, 45),
                band(L_DANGER, 46, Double.POSITIVE_INFINITY)));
        RESP_BANDS.put("cat", list(
                band(L_DANGER, Double.NEGATIVE_INFINITY, 9),
                band(L_CONCERN, 10, 15),
                band(L_NORMAL, 16, 30),
                band(L_CONCERN, 31, 40),
                band(L_ABNORMAL, 41, 50),
                band(L_DANGER, 51, Double.POSITIVE_INFINITY)));
    }

    private static String gradeTemp(double t) {
        if (t < 37.0 || t > 40.0) return L_DANGER;
        if (t < 37.5 || t > 39.5) return L_ABNORMAL;
        if (t < 38.0 || t > 39.2) return L_CONCERN;
        return L_NORMAL;
    }

    private static String gradeSpo2(double s) {
        if (s < 90) return L_DANGER;
        if (s <= 91) return L_ABNORMAL;
        if (s <= 94) return L_CONCERN;
        return L_NORMAL;
    }

    private static String gradeHeart(PetInfo pet, double hr) {
        String key = "cat".equals(pet.species) ? "cat"
                : pet.weight < 10 ? "smallDog"
                : pet.weight <= 30 ? "mediumDog" : "largeDog";
        return levelInBands(hr, applyAge(pet, HEART_BANDS.get(key)));
    }

    private static String gradeResp(PetInfo pet, double rr) {
        String key = "cat".equals(pet.species) ? "cat"
                : pet.weight < 10 ? "smallDog" : "mediumLargeDog";
        return levelInBands(rr, RESP_BANDS.get(key));
    }

    private static String gradeCalorie(double deviationPct, String timeRange) {
        double abs = Math.abs(deviationPct);
        double normalMax = timeRange.equals("day") ? 15 : timeRange.equals("week") ? 12 : 10;
        double concernMax = timeRange.equals("day") ? 30 : timeRange.equals("week") ? 25 : 20;
        double abnormalMax = timeRange.equals("day") ? 50 : timeRange.equals("week") ? 40 : 35;
        if (abs <= normalMax) return L_NORMAL;
        if (abs <= concernMax) return L_CONCERN;
        if (abs <= abnormalMax) return L_ABNORMAL;
        return L_DANGER;
    }

    private static String gradeDeviation(double deviationPct, String timeRange, double normalMax) {
        return gradeDeviation(deviationPct, timeRange, normalMax, false);
    }

    private static String gradeDeviation(double deviationPct, String timeRange, double normalMax, boolean downwardOnly) {
        double d = downwardOnly ? Math.max(0, -deviationPct) : Math.abs(deviationPct);
        double concernMax = timeRange.equals("day") ? 30 : timeRange.equals("week") ? 25 : 20;
        double abnormalMax = timeRange.equals("day") ? 45 : timeRange.equals("week") ? 40 : 35;
        if (d <= normalMax) return L_NORMAL;
        if (d <= concernMax) return L_CONCERN;
        if (d <= abnormalMax) return L_ABNORMAL;
        return L_DANGER;
    }

    private static LocalAnalysis analyzeLocal(
            PetInfo pet, String timeRange, VitalsAgg vitals,
            ExerciseAgg exercise, ExerciseAgg baseline, Period prev) {
        double rer = 70 * Math.pow(pet.weight, 0.75);
        double der = rer * derFactor(pet, lifeStageOf(pet));
        double actual = dailyCalorie(exercise);
        double calorieDeviation = der != 0 ? ((actual + rer - der) / der) * 100 : 0;

        double normStep = timeRange.equals("day") ? 15 : timeRange.equals("week") ? 12 : 10;
        double normStride = timeRange.equals("day") ? 10 : timeRange.equals("week") ? 8 : 6;
        double devStep = baseline.stepFreq != 0 ? ((exercise.stepFreq - baseline.stepFreq) / baseline.stepFreq) * 100 : 0;
        double devStride = baseline.stride != 0 ? ((exercise.stride - baseline.stride) / baseline.stride) * 100 : 0;
        double devSpeed = baseline.speed != 0 ? ((exercise.speed - baseline.speed) / baseline.speed) * 100 : 0;

        LocalLevels levels = new LocalLevels();
        levels.temp = gradeTemp(vitals.temperature);
        levels.heart = gradeHeart(pet, vitals.heartRate);
        levels.spo2 = gradeSpo2(vitals.spo2);
        levels.resp = gradeResp(pet, vitals.respiratoryRate);
        levels.calorie = gradeCalorie(calorieDeviation, timeRange);
        levels.stepFreq = gradeDeviation(devStep, timeRange, normStep);
        levels.stride = gradeDeviation(devStride, timeRange, normStride);
        levels.speed = gradeDeviation(devSpeed, timeRange, normStep, true);

        String[][] pairs = {
                { levels.temp, gradeTemp(prev.vitals.temperature) },
                { levels.heart, gradeHeart(pet, prev.vitals.heartRate) },
                { levels.spo2, gradeSpo2(prev.vitals.spo2) },
                { levels.resp, gradeResp(pet, prev.vitals.respiratoryRate) },
        };
        int worsened = 0;
        int improved = 0;
        for (String[] p : pairs) {
            int d = LEVEL_POINTS.get(p[0]) - LEVEL_POINTS.get(p[1]);
            if (d >= 1) worsened++;
            if (d <= -1) improved++;
        }
        int trendPoints = worsened >= 2 ? 1 : 0;

        double vitalsAvg = (LEVEL_POINTS.get(levels.temp) + LEVEL_POINTS.get(levels.heart)
                + LEVEL_POINTS.get(levels.spo2) + LEVEL_POINTS.get(levels.resp)) / 4.0;
        double exerciseAvg = (LEVEL_POINTS.get(levels.stepFreq) + LEVEL_POINTS.get(levels.stride)
                + LEVEL_POINTS.get(levels.speed)) / 3.0;
        double score = round2(vitalsAvg * 0.5 + exerciseAvg * 0.25 + LEVEL_POINTS.get(levels.calorie) * 0.15 + trendPoints * 0.1);

        String grade;
        if (vitals.temperature < 37.0 || vitals.temperature > 40.0 || vitals.spo2 < 90) {
            grade = "D";
        } else {
            double a = timeRange.equals("day") ? 0.6 : timeRange.equals("week") ? 0.5 : 0.4;
            double b = timeRange.equals("day") ? 1.8 : timeRange.equals("week") ? 1.5 : 1.2;
            double c = timeRange.equals("day") ? 3.5 : timeRange.equals("week") ? 3.0 : 2.5;
            if (score <= a) grade = "A";
            else if (score <= b) grade = "B";
            else if (score <= c) grade = "C";
            else grade = "D";
        }

        List<AbnormalItem> abnormal = new ArrayList<>();
        List<AbnDef> defs = new ArrayList<>();
        defs.add(new AbnDef("temperature", "体温", levels.temp,
                vitals.temperature > 39.5 ? "建议排查感染/炎症，环境降温并观察 24h" : "注意保暖复测，排查低体温原因"));
        defs.add(new AbnDef("heart_rate", "心率", levels.heart, "静息复测、排除应激，必要时心电图/心超排查"));
        defs.add(new AbnDef("spo2", "血氧饱和度", levels.spo2, "改善通风、观察呼吸，必要时立即排查呼吸/循环系统"));
        defs.add(new AbnDef("respiratory_rate", "呼吸频率", levels.resp, "降温、静息复测，必要时胸片/听诊排查"));
        defs.add(new AbnDef("calories", "卡路里", levels.calorie,
                calorieDeviation < 0 ? "适当增加低冲击运动与营养摄入" : "调整运动计划、排查代谢性疾病"));
        defs.add(new AbnDef("step_frequency", "步频", levels.stepFreq, "调整运动强度、排查焦虑源，必要时神经学检查"));
        defs.add(new AbnDef("step_length", "步幅", levels.stride, "减少运动量观察 3 天，必要时影像学检查（X光/关节触诊）"));
        defs.add(new AbnDef("movement_speed", "运动速度", levels.speed, "渐进式运动恢复，必要时心肺功能评估"));
        for (AbnDef def : defs) {
            if (L_CONCERN.equals(def.level) || L_ABNORMAL.equals(def.level) || L_DANGER.equals(def.level)) {
                AbnormalItem ai = new AbnormalItem();
                ai.key = def.key;
                ai.label = def.label;
                ai.value = def.level;
                ai.level = L_DANGER.equals(def.level) ? "danger" : "warn";
                ai.suggestion = def.suggestion;
                abnormal.add(ai);
            }
        }

        List<String> recommendations = new ArrayList<>();
        String low = timeRange.equals("day") ? "今日" : timeRange.equals("week") ? "本周" : "本月";
        if ("A".equals(grade)) recommendations.add(low + "整体健康稳定，各项指标均在正常范围，继续保持当前生活节奏。");
        if ("B".equals(grade)) recommendations.add(low + "个别指标轻微波动，属正常生理范围，建议观察 2-3 天，如持续偏离再考虑调整。");
        if ("C".equals(grade)) recommendations.add(low + "存在亚健康信号，建议调整饮食与运动、观察异常指标，并预约兽医基础体检。");
        if ("D".equals(grade)) recommendations.add(low + "存在明显病理风险，请尽快联系宠物医院就诊，并携带本周期完整数据。");
        if (!L_NORMAL.equals(levels.calorie)) recommendations.add("关注每日运动量，保证能量摄入与消耗均衡。");
        if (!L_NORMAL.equals(levels.stepFreq) || !L_NORMAL.equals(levels.stride) || !L_NORMAL.equals(levels.speed)) {
            recommendations.add("运动指标较基线偏离，建议循序渐进地安排运动，避免突然加大强度。");
        }

        StringBuilder labels = new StringBuilder();
        for (int i = 0; i < abnormal.size(); i++) {
            if (i > 0) labels.append("、");
            labels.append(abnormal.get(i).label);
        }
        String rootCause;
        if (!abnormal.isEmpty()) {
            rootCause = "周期内主要异常集中在：" + labels + "。"
                    + (abnormal.size() >= 3 ? "存在多系统关联信号，建议尽快全面检查。" : "建议针对上述指标加强监测并复查。");
        } else {
            rootCause = "各指标均在正常参考范围内，整体状态良好。";
        }

        LocalAnalysis la = new LocalAnalysis();
        la.levels = levels;
        la.score = score;
        la.grade = grade;
        la.deviations = new LinkedHashMap<>();
        la.deviations.put("stepFreq", baseline.stepFreq != 0 ? round1(devStep) : 0.0);
        la.deviations.put("stride", baseline.stride != 0 ? round1(devStride) : 0.0);
        la.deviations.put("speed", baseline.speed != 0 ? round1(devSpeed) : 0.0);
        la.deviations.put("calorie", round1(calorieDeviation));
        la.calorie = new Calorie();
        la.calorie.rer = rer;
        la.calorie.der = der;
        la.calorie.actual = actual + rer;
        la.calorie.deviationPct = round1(calorieDeviation);
        la.abnormal = abnormal;
        la.recommendations = recommendations;
        la.rootCause = rootCause;
        return la;
    }

    private static String buildOfflineDetail(
            PetInfo pet, String timeRange, VitalsAgg vitals,
            ExerciseAgg exercise, ExerciseAgg baseline, LocalAnalysis analysis) {
        String periodLabel = timeRange.equals("day") ? "单日" : timeRange.equals("week") ? "近7天" : "近30天";
        String[][] rows = {
                { "体温", vitals.temperature + " ℃", analysis.levels.temp, "38.0 ~ 39.2 ℃" },
                { "静息心率", vitals.heartRate + " 次/分", analysis.levels.heart, "按体型/年龄分层" },
                { "血氧饱和度", vitals.spo2 + " %", analysis.levels.spo2, "≥ 95 %" },
                { "呼吸频率", vitals.respiratoryRate + " 次/分", analysis.levels.resp, "按体型/物种分层" },
                { "卡路里(日均)", Math.round(analysis.calorie.actual) + " kcal", analysis.levels.calorie,
                        "DER≈" + Math.round(analysis.calorie.der) + " kcal" },
        };
        StringBuilder vitalMd = new StringBuilder();
        for (int i = 0; i < rows.length; i++) {
            String[] r = rows[i];
            vitalMd.append("| ").append(r[0]).append(" | ").append(r[1]).append(" | ").append(r[2]).append(" | ").append(r[3]).append(" |");
            if (i < rows.length - 1) vitalMd.append("\n");
        }
        String exRows = "| 步频 | " + exercise.stepFreq + " 步/分 | " + baseline.stepFreq + " 步/分 | "
                + analysis.deviations.get("stepFreq") + "% | " + analysis.levels.stepFreq + " |\n"
                + "| 步幅 | " + exercise.stride + " cm | " + baseline.stride + " cm | "
                + analysis.deviations.get("stride") + "% | " + analysis.levels.stride + " |\n"
                + "| 运动速度 | " + exercise.speed + " m/s | " + baseline.speed + " m/s | "
                + analysis.deviations.get("speed") + "% | " + analysis.levels.speed + " |";
        StringBuilder recMd = new StringBuilder();
        List<String> recs = analysis.recommendations;
        for (int i = 0; i < recs.size(); i++) {
            recMd.append(i + 1).append(". ").append(recs.get(i));
            if (i < recs.size() - 1) recMd.append("\n");
        }
        String review = "D".equals(analysis.grade) ? "尽快"
                : "C".equals(analysis.grade) ? "1 周内"
                : "B".equals(analysis.grade) ? "2 周内" : "每月";

        return "# " + pet.name + " 健康报告（" + periodLabel + "）\n\n"
                + "> 说明：AI 分析服务暂不可用，本报告由本地规则引擎按《宠物健康数据分析规则体系（行业修订版 v2.1）》生成，仅供参考，不替代兽医临床诊断。\n\n"
                + "## 一、宠物基本信息\n"
                + "- 物种：" + ("dog".equals(pet.species) ? "犬" : "猫") + " · 品种：" + pet.breed + "\n"
                + "- 体重：" + pet.weight + " kg · 月龄：" + ageMonths(pet.birthDate) + "\n"
                + "- 性别：" + ("male".equals(pet.gender) ? "雄性" : "雌性") + " · 绝育：" + (pet.sterilized ? "是" : "否")
                + " · 生命阶段：" + lifeStageOf(pet) + "\n\n"
                + "## 二、周期体征数据（" + periodLabel + "中位数）\n"
                + "| 指标 | 周期中位数 | 等级 | 参考区间 |\n"
                + "|------|-----------|------|----------|\n"
                + vitalMd + "\n\n"
                + "## 三、周期运动数据（" + periodLabel + " vs 基线）\n"
                + "| 指标 | 周期中位数 | 基线 | 偏离 | 等级 |\n"
                + "|------|-----------|------|------|------|\n"
                + exRows + "\n"
                + "> 日均步数：" + exercise.dailyActivity + " · 日均运动时长：" + exercise.durationMin + " 分钟 · 周期总步数："
                + exercise.totalActivity + "\n\n"
                + "## 四、报告结论\n"
                + "- **综合评级：" + analysis.grade + " 级**（加权评分 " + analysis.score + "）\n"
                + "- " + GRADE_DESC.get(analysis.grade) + "\n"
                + "- 归因分析：" + analysis.rootCause + "\n"
                + "- 建议清单：\n"
                + recMd + "\n"
                + "- 建议复查间隔：" + review + "复查";
    }

    /* ============================================================
     * 报告趋势（buildTrend，对应 report.ts）
     * ============================================================ */

    private static TrendPoint tp(long ts, double value) {
        TrendPoint p = new TrendPoint();
        p.ts = ts;
        p.value = value;
        return p;
    }

    private static double calorieOf(double steps) {
        return Math.round(steps * 0.05);
    }

    private static ReportTrend buildTrend(ReportItem report, PetInfo pet) {
        double spanDays = (report.endAt - report.startAt) / (double) DAY;
        ReportTrend t = new ReportTrend();
        if (spanDays <= 1.5) {
            List<HealthMetric> hourly = new ArrayList<>();
            List<HealthMetric> h = health.get(report.petId);
            if (h != null) {
                for (HealthMetric m : h) if (m.ts >= report.startAt && m.ts <= report.endAt) hourly.add(m);
            }
            for (HealthMetric m : hourly) {
                t.heartRate.add(tp(m.ts, m.heartRate));
                t.respiratoryRate.add(tp(m.ts, m.respiratoryRate));
                t.spo2.add(tp(m.ts, m.spo2));
                t.temperature.add(tp(m.ts, m.temperature));
                t.calorie.add(tp(m.ts, calorieOf(m.activity)));
                DayExercise e = pet != null ? dayExercise(pet, m.ts, m.activity, 620) : null;
                t.stepFreq.add(tp(m.ts, e != null ? e.stepFreq : 0));
                t.stride.add(tp(m.ts, e != null ? e.stride : 0));
                t.speed.add(tp(m.ts, e != null ? e.speed : 0));
            }
            return t;
        }
        List<DailyAgg> days = filterDaily(report.petId, report.startAt, report.endAt);
        for (DailyAgg d : days) {
            t.heartRate.add(tp(d.ts, d.heartRate.avg));
            t.respiratoryRate.add(tp(d.ts, d.respiratoryRate.avg));
            t.spo2.add(tp(d.ts, d.spo2.avg));
            t.temperature.add(tp(d.ts, d.temperature.avg));
            t.calorie.add(tp(d.ts, calorieOf(d.steps)));
            DayExercise e = pet != null ? dayExercise(pet, d.ts, d.steps, 12800) : null;
            t.stepFreq.add(tp(d.ts, e != null ? e.stepFreq : 0));
            t.stride.add(tp(d.ts, e != null ? e.stride : 0));
            t.speed.add(tp(d.ts, e != null ? e.speed : 0));
        }
        return t;
    }

    /* ============================================================
     * 报告生成（AI 优先，失败回退本地规则引擎）
     * ============================================================ */

    public static GeneratedReport generateReportForPet(String petId, GenerateOpts opts) {
        PetInfo pet = findPetById(petId);
        if (pet == null) throw new MockError("宠物不存在", 404);
        long endAt = opts.endAt != null ? opts.endAt : System.currentTimeMillis();
        long startAt = opts.startAt != null ? opts.startAt : endAt - 6 * DAY;
        if (!Double.isFinite((double) startAt) || !Double.isFinite((double) endAt) || endAt <= startAt) {
            throw new MockError("时间段无效");
        }
        if (endAt - startAt > 30 * DAY) throw new MockError("时间段不能超过 30 天");
        String timeRange = (opts.timeRange != null && !opts.timeRange.isEmpty())
                ? opts.timeRange : deriveTimeRange(startAt, endAt);

        VitalsAgg vitals = aggVitals(pet.id, startAt, endAt);
        ExerciseAgg exercise = aggExercise(pet, startAt, endAt);
        Extremes extremes = aggExtremes(pet.id, startAt, endAt);
        ExerciseAgg baseline = aggExercise(pet, startAt - baselineWindow(timeRange) * DAY, startAt);
        Period prev = new Period();
        prev.vitals = aggVitals(pet.id, startAt - (endAt - startAt), startAt);
        prev.exercise = aggExercise(pet, startAt - (endAt - startAt), startAt);

        double rer = 70 * Math.pow(pet.weight, 0.75);
        double der = rer * derFactor(pet, lifeStageOf(pet));
        double calorieActual = dailyCalorie(exercise);
        double calorieDeviation = der != 0 ? ((calorieActual + rer - der) / der) * 100 : 0;

        ReportInput input = new ReportInput();
        input.startAt = startAt;
        input.endAt = endAt;
        input.timeRange = timeRange;
        input.pet = pet;
        input.vitals = vitals;
        input.exercise = exercise;
        input.baseline = baseline;
        input.prev = prev;
        input.calorie = new Calorie();
        input.calorie.rer = rer;
        input.calorie.der = der;
        input.calorie.actual = calorieActual;
        input.calorie.deviationPct = round1(calorieDeviation);
        input.extremes = extremes;

        ReportItem report;
        try {
            String content = callAi(SYSTEM_PROMPT, buildUserPrompt(input));
            Object aiObj = extractJson(content);
            if (!(aiObj instanceof Map) || !((Map<?, ?>) aiObj).containsKey("overall_grade")) {
                throw new MockError("AI 返回结构异常");
            }
            input.source = "ai";
            report = mapAiReport(pet, (Map<String, Object>) aiObj, input);
        } catch (Exception ex) {
            LocalAnalysis analysis = analyzeLocal(pet, timeRange, vitals, exercise, baseline, prev);
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("overall_grade", analysis.grade);
            fallback.put("overall_score", analysis.score);
            fallback.put("grade_description", GRADE_DESC.get(analysis.grade));
            fallback.put("report_summary", pet.name
                    + (timeRange.equals("day") ? "今日" : timeRange.equals("week") ? "本周" : "本月")
                    + "健康评估：综合评级 " + analysis.grade + " 级，" + analysis.rootCause);
            fallback.put("report_detail", buildOfflineDetail(pet, timeRange, vitals, exercise, baseline, analysis));
            fallback.put("abnormal_indicators", abnormalLabels(analysis.abnormal));
            fallback.put("root_cause_analysis", analysis.rootCause);
            fallback.put("recommendations", new ArrayList<Object>(analysis.recommendations));
            Map<String, Object> vetRef = new LinkedHashMap<>();
            vetRef.put("needed", "D".equals(analysis.grade));
            vetRef.put("urgency", "D".equals(analysis.grade) ? "urgent" : "routine");
            vetRef.put("warning", "D".equals(analysis.grade) ? "建议尽快联系宠物医院就诊，并携带本周期完整数据。" : "");
            vetRef.put("suggested_exams", "D".equals(analysis.grade)
                    ? new ArrayList<Object>(Arrays.asList("血常规", "影像学检查（X 光 / 超声）"))
                    : new ArrayList<Object>());
            fallback.put("vet_referral", vetRef);
            input.source = "offline";
            report = mapAiReport(pet, fallback, input);
        }

        reports.add(report);
        UserInfo owner = findUserById(pet.ownerId);
        GeneratedReport out = new GeneratedReport();
        out.report = report;
        out.petName = pet.name;
        out.petAvatar = pet.avatar;
        out.species = pet.species;
        out.doctorName = null;
        out.ownerId = pet.ownerId;
        out.ownerName = owner != null ? owner.name : "";
        out.ownerAvatar = owner != null ? owner.avatar : "";
        out.trend = buildTrend(report, pet);
        return out;
    }

    private static List<String> abnormalLabels(List<AbnormalItem> abnormal) {
        List<String> out = new ArrayList<>();
        for (AbnormalItem a : abnormal) out.add(a.label);
        return out;
    }

    /* ============================================================
     * Mock 路由（运营端 / 宠物端共用同一套生成逻辑）
     * ============================================================ */

    private static GenerateOpts optsFromBody(Map<String, Object> body) {
        GenerateOpts o = new GenerateOpts();
        o.startAt = body.containsKey("startAt") ? toLong(body.get("startAt")) : null;
        o.endAt = body.containsKey("endAt") ? toLong(body.get("endAt")) : null;
        o.timeRange = (String) body.get("timeRange");
        return o;
    }

    /** 运营端：手动生成报告 */
    public static GeneratedReport adminGenerateReport(MockContext ctx) {
        requireRole(ctx, "admin");
        Map<String, Object> body = (Map<String, Object>) ctx.body;
        String petId = body == null ? null : (String) body.get("petId");
        if (petId == null || petId.isEmpty()) throw new MockError("请选择宠物");
        return generateReportForPet(petId, optsFromBody(body));
    }

    /** 宠物端：手动生成报告 */
    public static GeneratedReport userGenerateReport(MockContext ctx) {
        UserInfo user = requireUser(ctx);
        Map<String, Object> body = (Map<String, Object>) ctx.body;
        String petId = body == null ? null : (String) body.get("petId");
        if (petId == null || petId.isEmpty()) throw new MockError("请选择宠物");
        if (user.petIds == null || !user.petIds.contains(petId)) throw new MockError("无权操作该宠物", 403);
        return generateReportForPet(petId, optsFromBody(body));
    }
}
