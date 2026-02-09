export interface PricingRules {
  category_margins: Record<string, number>;
  condition_multipliers: Record<string, number>;
  min_offer: number;
  max_offer_by_category: Record<string, number>;
  daily_spending_limit: number;
  offer_expiry_hours: number;
}

export interface ConfidenceThresholds {
  auto_price_threshold: number;
  flag_threshold: number;
  auto_escalate_threshold: number;
  high_value_escalate_above: number;
}

export interface DynamicAdjustments {
  inventory_saturation_limit: number;
  inventory_saturation_penalty: number;
  velocity_threshold_days: number;
  velocity_bonus: number;
  loyalty_bonus: number;
  jake_bucks_bonus: number;
}

export interface FraudSettings {
  stock_photo_threshold: number;
  reverse_image_match_threshold: number;
  user_velocity_max_per_day: number;
  new_account_max_offer: number;
  new_account_days: number;
  high_value_id_required_above: number;
}

export type ConfigType = 'pricing' | 'confidence' | 'adjustments' | 'fraud';

export interface ConfigUpdate {
  type: ConfigType;
  data: PricingRules | ConfidenceThresholds | DynamicAdjustments | FraudSettings;
  updatedBy: string;
  reason: string;
}

export interface ConfigAuditLog {
  id: string;
  type: ConfigType;
  changes: Record<string, { old: any; new: any }>;
  updatedBy: string;
  reason: string;
  updatedAt: string;
}
