-- Profit Tracking Migration
-- Adds sales table and profit calculation support

-- Sales table - tracks completed sales and profit
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sale details
  sold_price DECIMAL(10,2) NOT NULL, -- Final sale price (revenue)
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Costs
  offer_amount DECIMAL(10,2) NOT NULL, -- Amount paid to seller
  shipping_cost DECIMAL(10,2) DEFAULT 0, -- Shipping label cost
  ebay_fees DECIMAL(10,2) DEFAULT 0, -- eBay fees (if crossposted)
  platform_fees DECIMAL(10,2) DEFAULT 0, -- Other platform fees
  total_costs DECIMAL(10,2) NOT NULL, -- Sum of all costs

  -- Profit calculation
  profit DECIMAL(10,2) NOT NULL, -- Net profit (sold_price - total_costs)
  profit_margin DECIMAL(5,2), -- Profit margin percentage

  -- Sale metadata
  sale_platform TEXT DEFAULT 'direct', -- 'direct', 'ebay', 'amazon', etc.
  sale_reference TEXT, -- External sale ID if crossposted

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_sales_user_sold_at ON sales(user_id, sold_at DESC);
CREATE INDEX idx_sales_user_profit ON sales(user_id, profit DESC);
CREATE INDEX idx_sales_offer ON sales(offer_id);
CREATE INDEX idx_sales_platform ON sales(sale_platform);
CREATE INDEX idx_sales_sold_at ON sales(sold_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add profit estimation fields to offers
ALTER TABLE offers
ADD COLUMN estimated_profit DECIMAL(10,2),
ADD COLUMN estimated_shipping_cost DECIMAL(10,2) DEFAULT 8.50, -- Average USPS Priority cost
ADD COLUMN estimated_platform_fees DECIMAL(10,2) DEFAULT 0;

-- Index for profit queries
CREATE INDEX idx_offers_estimated_profit ON offers(estimated_profit) WHERE estimated_profit IS NOT NULL;

-- View for profit analytics (denormalized for performance)
CREATE OR REPLACE VIEW profit_analytics AS
SELECT
  s.user_id,
  COUNT(s.id) as total_sales,
  SUM(s.profit) as total_profit,
  AVG(s.profit) as avg_profit_per_sale,
  AVG(s.profit_margin) as avg_profit_margin,
  MIN(s.sold_at) as first_sale_at,
  MAX(s.sold_at) as last_sale_at,
  -- Category breakdown (from offers)
  o.item_category,
  COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW()) THEN s.id END) as current_month_sales,
  SUM(CASE WHEN DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW()) THEN s.profit ELSE 0 END) as current_month_profit
FROM sales s
JOIN offers o ON s.offer_id = o.id
GROUP BY s.user_id, o.item_category;

-- Comments
COMMENT ON TABLE sales IS 'Tracks completed sales and profit calculations for sellers';
COMMENT ON COLUMN sales.profit IS 'Net profit after all costs (sold_price - total_costs)';
COMMENT ON COLUMN sales.profit_margin IS 'Profit margin percentage ((profit / sold_price) * 100)';
COMMENT ON VIEW profit_analytics IS 'Denormalized view for fast profit analytics queries';
