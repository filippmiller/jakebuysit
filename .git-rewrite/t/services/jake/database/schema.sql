-- Jake Voice & Character System - Database Schema

-- Script Templates Library
CREATE TABLE jake_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  tone TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  success_rate FLOAT DEFAULT 0.0,
  play_rate FLOAT DEFAULT 0.0,
  completion_rate FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Engagement Analytics
CREATE TABLE jake_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  scenario TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  played BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  skipped_at FLOAT,
  offer_accepted BOOLEAN,
  tier_used INTEGER CHECK (tier_used IN (1, 2, 3)),
  tone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jake_scripts_scenario ON jake_scripts(scenario);
CREATE INDEX idx_jake_engagement_user ON jake_engagement(user_id);
CREATE INDEX idx_jake_engagement_created ON jake_engagement(created_at DESC);
