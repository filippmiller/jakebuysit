"""
Recommendation Engine
Implements collaborative filtering and content-based recommendation algorithms
"""
import asyncpg
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import math
import json


class RecommendationEngine:
    def __init__(self, db_pool: asyncpg.Pool, cache_client):
        self.db = db_pool
        self.cache = cache_client

    async def get_user_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        exclude_offer_ids: List[str] = []
    ) -> List[Dict]:
        """
        Generate personalized recommendations for a user using hybrid approach:
        1. Collaborative filtering (users who viewed X also viewed Y)
        2. Content-based (similar to what user viewed before)
        3. Trending items as fallback
        """
        # Check cache first
        cache_key = f"recommendations:user:{user_id}:{limit}"
        cached = await self.cache.get(cache_key)
        if cached:
            recommendations = json.loads(cached)
            # Filter out excluded offers
            recommendations = [r for r in recommendations if r['offer_id'] not in exclude_offer_ids]
            return recommendations[:limit]

        # Get user's activity history
        user_history = await self._get_user_activity(user_id, limit=50)
        if not user_history:
            # New user - show trending items
            return await self.get_trending_items(days=7, limit=limit)

        # Collaborative filtering: find similar users
        collab_recs = await self._collaborative_filtering(user_id, user_history, limit)

        # Content-based: find similar items to what user viewed/accepted
        content_recs = await self._content_based_filtering(user_id, user_history, limit)

        # Merge and rank recommendations
        recommendations = self._merge_recommendations(
            collab_recs,
            content_recs,
            exclude_ids=exclude_offer_ids + [h['offer_id'] for h in user_history]
        )

        # Fill remaining slots with trending if needed
        if len(recommendations) < limit:
            trending = await self.get_trending_items(days=7, limit=limit - len(recommendations))
            for item in trending:
                if item['offer_id'] not in exclude_offer_ids:
                    recommendations.append(item)

        # Limit results
        recommendations = recommendations[:limit]

        # Cache for 1 hour
        await self.cache.setex(cache_key, 3600, json.dumps(recommendations))

        return recommendations

    async def get_similar_items(
        self,
        offer_id: str,
        limit: int = 10,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Find items similar to the given offer using:
        1. Category/brand/model matching
        2. Price range similarity
        3. User preference signals if user_id provided
        """
        cache_key = f"recommendations:similar:{offer_id}:{limit}"
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)

        # Get reference offer details
        query = """
            SELECT item_category, item_brand, item_model, item_condition,
                   offer_amount, item_subcategory
            FROM offers
            WHERE id = $1 AND status NOT IN ('cancelled', 'expired', 'declined')
        """
        reference = await self.db.fetchrow(query, offer_id)
        if not reference:
            return []

        # Find similar offers using cosine similarity on features
        similar = await self._find_similar_by_features(reference, limit + 1, exclude_id=offer_id)

        # If user provided, personalize the ranking
        if user_id:
            user_prefs = await self._get_user_preferences(user_id)
            similar = self._rerank_by_preferences(similar, user_prefs)

        results = similar[:limit]

        # Cache for 1 hour
        await self.cache.setex(cache_key, 3600, json.dumps(results))

        return results

    async def get_trending_items(
        self,
        days: int = 7,
        limit: int = 10,
        category: Optional[str] = None
    ) -> List[Dict]:
        """
        Get trending items based on recent activity (views + accepts)
        Trending score = (view_count * 1.0) + (accept_count * 10.0)
        """
        cache_key = f"recommendations:trending:{days}:{category or 'all'}:{limit}"
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)

        since = datetime.utcnow() - timedelta(days=days)

        category_filter = "AND o.item_category = $2" if category else ""
        params = [since] + ([category] if category else [])

        query = f"""
            WITH activity_counts AS (
                SELECT
                    ua.offer_id,
                    COUNT(*) FILTER (WHERE ua.activity_type = 'view') AS view_count,
                    COUNT(*) FILTER (WHERE ua.activity_type = 'accept') AS accept_count
                FROM user_activity ua
                WHERE ua.created_at >= $1
                GROUP BY ua.offer_id
            )
            SELECT
                o.id AS offer_id,
                o.item_category,
                o.item_brand,
                o.item_model,
                o.item_condition,
                o.offer_amount,
                o.photos->0->>'thumbnail_url' AS thumbnail_url,
                ac.view_count,
                ac.accept_count,
                (ac.view_count * 1.0 + ac.accept_count * 10.0) AS trending_score
            FROM activity_counts ac
            JOIN offers o ON ac.offer_id = o.id
            WHERE o.status = 'ready'
            {category_filter}
            ORDER BY trending_score DESC, o.created_at DESC
            LIMIT {limit}
        """

        rows = await self.db.fetch(query, *params)

        results = [
            {
                'offer_id': str(row['offer_id']),
                'score': float(row['trending_score']) / 100.0,  # Normalize
                'reason': f"Trending: {row['view_count']} views, {row['accept_count']} accepts",
                'item_category': row['item_category'],
                'item_brand': row['item_brand'],
                'item_model': row['item_model'],
                'item_condition': row['item_condition'],
                'offer_amount': float(row['offer_amount']) if row['offer_amount'] else None,
                'thumbnail_url': row['thumbnail_url'],
            }
            for row in rows
        ]

        # Cache for 30 minutes (shorter for trending)
        await self.cache.setex(cache_key, 1800, json.dumps(results))

        return results

    # ====== PRIVATE HELPER METHODS ======

    async def _get_user_activity(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's recent activity (views and accepts)"""
        query = """
            SELECT DISTINCT ON (ua.offer_id)
                ua.offer_id,
                ua.activity_type,
                ua.time_spent_seconds,
                o.item_category,
                o.item_brand,
                o.item_model,
                o.offer_amount
            FROM user_activity ua
            JOIN offers o ON ua.offer_id = o.id
            WHERE ua.user_id = $1
                AND ua.activity_type IN ('view', 'accept')
                AND ua.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY ua.offer_id, ua.created_at DESC
            LIMIT $2
        """
        rows = await self.db.fetch(query, user_id, limit)
        return [dict(row) for row in rows]

    async def _collaborative_filtering(
        self,
        user_id: str,
        user_history: List[Dict],
        limit: int
    ) -> List[Dict]:
        """
        Collaborative filtering: find users with similar viewing patterns
        and recommend what they viewed/accepted
        """
        if not user_history:
            return []

        viewed_offer_ids = [h['offer_id'] for h in user_history]

        # Find users who viewed the same items
        query = """
            WITH similar_users AS (
                SELECT
                    ua.user_id,
                    COUNT(DISTINCT ua.offer_id) AS overlap_count
                FROM user_activity ua
                WHERE ua.offer_id = ANY($1::uuid[])
                    AND ua.user_id != $2
                    AND ua.activity_type IN ('view', 'accept')
                GROUP BY ua.user_id
                HAVING COUNT(DISTINCT ua.offer_id) >= 2
                ORDER BY overlap_count DESC
                LIMIT 20
            ),
            recommended_offers AS (
                SELECT
                    ua.offer_id,
                    COUNT(DISTINCT ua.user_id) AS recommender_count,
                    COUNT(*) FILTER (WHERE ua.activity_type = 'accept') AS accept_count
                FROM user_activity ua
                JOIN similar_users su ON ua.user_id = su.user_id
                WHERE ua.offer_id != ALL($1::uuid[])
                    AND ua.activity_type IN ('view', 'accept')
                GROUP BY ua.offer_id
            )
            SELECT
                o.id AS offer_id,
                o.item_category,
                o.item_brand,
                o.item_model,
                o.item_condition,
                o.offer_amount,
                o.photos->0->>'thumbnail_url' AS thumbnail_url,
                ro.recommender_count,
                ro.accept_count
            FROM recommended_offers ro
            JOIN offers o ON ro.offer_id = o.id
            WHERE o.status = 'ready'
            ORDER BY ro.accept_count DESC, ro.recommender_count DESC
            LIMIT $3
        """

        rows = await self.db.fetch(query, viewed_offer_ids, user_id, limit)

        return [
            {
                'offer_id': str(row['offer_id']),
                'score': 0.8 + (0.2 * min(row['accept_count'], 5) / 5.0),
                'reason': f"Users who viewed similar items also liked this ({row['recommender_count']} users)",
                'item_category': row['item_category'],
                'item_brand': row['item_brand'],
                'item_model': row['item_model'],
                'item_condition': row['item_condition'],
                'offer_amount': float(row['offer_amount']) if row['offer_amount'] else None,
                'thumbnail_url': row['thumbnail_url'],
            }
            for row in rows
        ]

    async def _content_based_filtering(
        self,
        user_id: str,
        user_history: List[Dict],
        limit: int
    ) -> List[Dict]:
        """
        Content-based filtering: find items similar to what user has viewed/accepted
        based on category, brand, price range
        """
        if not user_history:
            return []

        # Analyze user preferences from history
        categories = defaultdict(int)
        brands = defaultdict(int)
        price_sum = 0
        price_count = 0

        for activity in user_history:
            weight = 2 if activity['activity_type'] == 'accept' else 1
            if activity['item_category']:
                categories[activity['item_category']] += weight
            if activity['item_brand']:
                brands[activity['item_brand']] += weight
            if activity['offer_amount']:
                price_sum += float(activity['offer_amount']) * weight
                price_count += weight

        # Get top preferences
        top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
        top_brands = sorted(brands.items(), key=lambda x: x[1], reverse=True)[:3]
        avg_price = price_sum / price_count if price_count > 0 else 0

        # Build query to find similar items
        category_list = [c[0] for c in top_categories]
        brand_list = [b[0] for b in top_brands]

        viewed_ids = [h['offer_id'] for h in user_history]

        query = """
            SELECT
                o.id AS offer_id,
                o.item_category,
                o.item_brand,
                o.item_model,
                o.item_condition,
                o.offer_amount,
                o.photos->0->>'thumbnail_url' AS thumbnail_url,
                CASE
                    WHEN o.item_category = ANY($1::text[]) THEN 2
                    ELSE 0
                END +
                CASE
                    WHEN o.item_brand = ANY($2::text[]) THEN 2
                    ELSE 0
                END +
                CASE
                    WHEN o.offer_amount BETWEEN $3 * 0.7 AND $3 * 1.3 THEN 1
                    ELSE 0
                END AS similarity_score
            FROM offers o
            WHERE o.id != ALL($4::uuid[])
                AND o.status = 'ready'
                AND (
                    o.item_category = ANY($1::text[])
                    OR o.item_brand = ANY($2::text[])
                )
            ORDER BY similarity_score DESC, o.created_at DESC
            LIMIT $5
        """

        rows = await self.db.fetch(query, category_list, brand_list, avg_price, viewed_ids, limit)

        return [
            {
                'offer_id': str(row['offer_id']),
                'score': min(1.0, 0.5 + (row['similarity_score'] * 0.15)),
                'reason': self._build_similarity_reason(row, category_list, brand_list),
                'item_category': row['item_category'],
                'item_brand': row['item_brand'],
                'item_model': row['item_model'],
                'item_condition': row['item_condition'],
                'offer_amount': float(row['offer_amount']) if row['offer_amount'] else None,
                'thumbnail_url': row['thumbnail_url'],
            }
            for row in rows
        ]

    def _build_similarity_reason(self, row, top_categories, top_brands) -> str:
        """Build human-readable reason for content-based recommendation"""
        reasons = []
        if row['item_category'] in top_categories:
            reasons.append(f"same category ({row['item_category']})")
        if row['item_brand'] in top_brands:
            reasons.append(f"brand you like ({row['item_brand']})")

        if reasons:
            return f"Similar to items you viewed: {', '.join(reasons)}"
        return "Based on your interests"

    async def _find_similar_by_features(
        self,
        reference: dict,
        limit: int,
        exclude_id: str
    ) -> List[Dict]:
        """Find offers similar to reference using feature matching"""
        query = """
            SELECT
                o.id AS offer_id,
                o.item_category,
                o.item_brand,
                o.item_model,
                o.item_condition,
                o.offer_amount,
                o.photos->0->>'thumbnail_url' AS thumbnail_url,
                CASE WHEN o.item_category = $1 THEN 3 ELSE 0 END +
                CASE WHEN o.item_subcategory = $2 THEN 2 ELSE 0 END +
                CASE WHEN o.item_brand = $3 THEN 2 ELSE 0 END +
                CASE WHEN o.item_condition = $4 THEN 1 ELSE 0 END +
                CASE WHEN o.offer_amount BETWEEN $5 * 0.8 AND $5 * 1.2 THEN 1 ELSE 0 END
                AS similarity_score
            FROM offers o
            WHERE o.id != $6::uuid
                AND o.status = 'ready'
            ORDER BY similarity_score DESC, o.created_at DESC
            LIMIT $7
        """

        rows = await self.db.fetch(
            query,
            reference['item_category'],
            reference['item_subcategory'],
            reference['item_brand'],
            reference['item_condition'],
            reference['offer_amount'] or 0,
            exclude_id,
            limit
        )

        return [
            {
                'offer_id': str(row['offer_id']),
                'score': min(1.0, row['similarity_score'] / 9.0),
                'reason': self._build_feature_similarity_reason(row, reference),
                'item_category': row['item_category'],
                'item_brand': row['item_brand'],
                'item_model': row['item_model'],
                'item_condition': row['item_condition'],
                'offer_amount': float(row['offer_amount']) if row['offer_amount'] else None,
                'thumbnail_url': row['thumbnail_url'],
            }
            for row in rows
        ]

    def _build_feature_similarity_reason(self, item: dict, reference: dict) -> str:
        """Build reason for feature-based similarity"""
        matches = []
        if item['item_category'] == reference['item_category']:
            matches.append('same category')
        if item['item_brand'] == reference['item_brand']:
            matches.append('same brand')
        if item['item_condition'] == reference['item_condition']:
            matches.append('similar condition')

        if matches:
            return f"Similar item: {', '.join(matches)}"
        return "Related item"

    async def _get_user_preferences(self, user_id: str) -> Dict:
        """Extract user preferences from activity history"""
        query = """
            SELECT
                o.item_category,
                o.item_brand,
                COUNT(*) AS frequency
            FROM user_activity ua
            JOIN offers o ON ua.offer_id = o.id
            WHERE ua.user_id = $1
                AND ua.created_at >= NOW() - INTERVAL '60 days'
            GROUP BY o.item_category, o.item_brand
            ORDER BY frequency DESC
        """
        rows = await self.db.fetch(query, user_id)

        prefs = {
            'categories': {},
            'brands': {}
        }

        for row in rows:
            if row['item_category']:
                prefs['categories'][row['item_category']] = row['frequency']
            if row['item_brand']:
                prefs['brands'][row['item_brand']] = row['frequency']

        return prefs

    def _rerank_by_preferences(self, items: List[Dict], preferences: Dict) -> List[Dict]:
        """Adjust item scores based on user preferences"""
        category_prefs = preferences.get('categories', {})
        brand_prefs = preferences.get('brands', {})

        for item in items:
            boost = 0
            if item['item_category'] in category_prefs:
                boost += 0.1 * min(category_prefs[item['item_category']], 5) / 5.0
            if item['item_brand'] in brand_prefs:
                boost += 0.1 * min(brand_prefs[item['item_brand']], 5) / 5.0

            item['score'] = min(1.0, item['score'] + boost)

        return sorted(items, key=lambda x: x['score'], reverse=True)

    def _merge_recommendations(
        self,
        collab_recs: List[Dict],
        content_recs: List[Dict],
        exclude_ids: List[str]
    ) -> List[Dict]:
        """
        Merge collaborative and content-based recommendations
        Deduplicates and ranks by score
        """
        seen = set(exclude_ids)
        merged = []

        # Interleave recommendations (prioritize collaborative slightly)
        all_recs = []
        for i in range(max(len(collab_recs), len(content_recs))):
            if i < len(collab_recs):
                all_recs.append(collab_recs[i])
            if i < len(content_recs):
                all_recs.append(content_recs[i])

        for rec in all_recs:
            if rec['offer_id'] not in seen:
                merged.append(rec)
                seen.add(rec['offer_id'])

        # Sort by score
        return sorted(merged, key=lambda x: x['score'], reverse=True)
