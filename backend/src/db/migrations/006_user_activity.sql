-- User Activity Tracking for Recommendation Engine
-- Tracks user interactions with offers for collaborative filtering

CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  -- Activity type
  activity_type TEXT NOT NULL, -- 'view', 'accept', 'decline', 'share'

  -- Context
  source TEXT, -- 'dashboard', 'search', 'recommendation', 'direct'
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'

  -- Engagement metrics
  time_spent_seconds INTEGER, -- how long user viewed the offer
  scroll_depth FLOAT, -- 0.0 to 1.0

  -- Session tracking
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_offer ON user_activity(offer_id, created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type, created_at DESC);
CREATE INDEX idx_user_activity_session ON user_activity(session_id);

-- Composite index for collaborative filtering queries
CREATE INDEX idx_user_activity_collab ON user_activity(user_id, offer_id, activity_type);

-- Index for trending queries (last 7 days)
CREATE INDEX idx_user_activity_trending ON user_activity(created_at DESC, offer_id)
  WHERE activity_type IN ('view', 'accept');

COMMENT ON TABLE user_activity IS 'Tracks user interactions with offers for recommendation engine';
COMMENT ON COLUMN user_activity.time_spent_seconds IS 'Duration user spent viewing the offer';
COMMENT ON COLUMN user_activity.scroll_depth IS 'How far user scrolled through offer details (0-1)';
