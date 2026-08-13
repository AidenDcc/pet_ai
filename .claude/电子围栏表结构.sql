-- =============================================================
-- 数心智能宠物健康平台 - 电子围栏模块数据表结构
-- 数据库：MySQL 8.0 | 存储引擎：InnoDB | 字符集：utf8mb4
-- 生成日期：2026-08-13
--
-- 设计约定（与《数据库表设计说明书》一致）：
--   * 表名、字段名使用小写下划线命名法
--   * 主键统一为 ID，BIGINT 自增长
--   * 所有表包含标准审计字段：create_by / create_date /
--     last_update_by / last_update_date / del_flag
--   * 索引命名：idx_表名_字段名；唯一索引：uk_表名_字段名
--   * 外键以字段 + 注释方式关联，不在建表时强制约束
--
-- 模块说明：
--   电子围栏 = 围栏管理（pet_fence）+ 围栏告警记录（pet_fence_alert）
--   相对设计说明书 V1.1，pet_fence 新增 fence_type 字段，
--   以支持动态中心点（跟随手机实时定位）围栏。
-- =============================================================

-- -------------------------------------------------------------
-- 1. 电子围栏表 pet_fence
--    宠物安全区域（每只宠物可配置多个围栏）。
--    围栏类型：fixed 固定中心点（地图选点）/ dynamic 动态中心点
--    （以手机实时定位为中心，每只宠物仅一条）。
--    关联：pet_id -> pet.id；create_by -> sys_user.id
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pet_fence` (
  `id`               BIGINT        NOT NULL AUTO_INCREMENT COMMENT '主键，自增长',
  `pet_id`           BIGINT        NOT NULL                COMMENT '宠物ID',
  `fence_name`       VARCHAR(100)  NOT NULL                COMMENT '围栏名称（如：小区、公园、跟随手机）',
  `fence_type`       TINYINT       NOT NULL DEFAULT 1      COMMENT '围栏类型：1-固定中心点（地图选点），2-动态中心点（跟随手机实时定位，每只宠物仅一条）',
  `center_lng`       DECIMAL(10,6) NOT NULL                COMMENT '中心点经度',
  `center_lat`       DECIMAL(10,6) NOT NULL                COMMENT '中心点纬度',
  `radius`           INT           NOT NULL DEFAULT 500    COMMENT '围栏半径（米）',
  `enabled`          TINYINT       NOT NULL DEFAULT 1      COMMENT '是否启用：0-关闭，1-启用',
  `address`          VARCHAR(500)  NULL                    COMMENT '中心点物理地址（省市区，可选冗余，用于列表展示）',
  `create_by`        BIGINT        NOT NULL DEFAULT 0      COMMENT '创建人ID',
  `create_date`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_update_by`   BIGINT        NOT NULL DEFAULT 0      COMMENT '最后更新人ID',
  `last_update_date` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `del_flag`         TINYINT       NOT NULL DEFAULT 0      COMMENT '删除标记：0-正常，1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_fence_pet` (`pet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电子围栏表：宠物安全区域（每只宠物可配置多个）';

-- 说明：动态中心点围栏在业务层保证"每只宠物有且仅有一条"，
-- 可在应用层写入时校验（pet_id + fence_type=2 唯一）。
-- 如需数据库兜底，可加冗余生成列唯一索引：
--   ALTER TABLE `pet_fence`
--     ADD COLUMN `dyn_flag` TINYINT GENERATED ALWAYS AS
--       (CASE WHEN `fence_type` = 2 THEN 1 ELSE NULL END) STORED,
--     ADD UNIQUE KEY `uk_fence_dynamic` (`pet_id`, `dyn_flag`);

-- -------------------------------------------------------------
-- 2. 围栏告警记录表 pet_fence_alert
--    宠物出入围栏触发告警记录。
--    关联：pet_id -> pet.id；fence_id -> pet_fence.id；
--          device_id -> pet_device.id
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pet_fence_alert` (
  `id`               BIGINT        NOT NULL AUTO_INCREMENT COMMENT '主键，自增长',
  `pet_id`           BIGINT        NOT NULL                COMMENT '宠物ID',
  `fence_id`         BIGINT        NOT NULL                COMMENT '围栏ID',
  `device_id`        BIGINT        NOT NULL                COMMENT '设备ID',
  `alert_type`       TINYINT       NOT NULL DEFAULT 1      COMMENT '告警类型：1-出围栏，2-入围栏',
  `lng`              DECIMAL(10,6) NULL                    COMMENT '触发位置经度',
  `lat`              DECIMAL(10,6) NULL                    COMMENT '触发位置纬度',
  `alert_date`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '告警时间',
  `status`           TINYINT       NOT NULL DEFAULT 0      COMMENT '处理状态：0-未处理，1-已处理',
  `create_by`        BIGINT        NOT NULL DEFAULT 0      COMMENT '创建人ID',
  `create_date`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_update_by`   BIGINT        NOT NULL DEFAULT 0      COMMENT '最后更新人ID',
  `last_update_date` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `del_flag`         TINYINT       NOT NULL DEFAULT 0      COMMENT '删除标记：0-正常，1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_fence_alert_pet_date` (`pet_id`, `alert_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='围栏告警记录表：宠物出入围栏触发告警';

-- =============================================================
-- 说明与扩展建议：
--   1. 围栏告警记录随数据增长较快，可按月分区或定期归档。
--   2. 若需支持"通知推送记录"，可在 pet_fence_alert 增加
--      push_status 字段，或单独建表记录推送流水。
-- =============================================================
