"""
Fraud pattern detection rules and known fraud signatures.
"""
from typing import List, Dict, Optional
import re
from datetime import datetime, timedelta


class FraudPatterns:
    """Database of known fraud patterns and detection rules."""

    # Suspicious description patterns (stock phrases used by fraudsters)
    SUSPICIOUS_PHRASES = [
        r"brand new in box",
        r"never used",
        r"still sealed",
        r"limited edition",
        r"rare find",
        r"quick sale",
        r"need gone asap",
        r"moving sale",
        r"urgent",
        r"must sell today",
        r"below market",
        r"stolen",
        r"fell off truck",
    ]

    # Patterns indicating possible stock photos
    STOCK_PHOTO_INDICATORS = [
        "perfect lighting",
        "white background",
        "professional photography",
        "no visible damage or wear",
        "pristine condition",
    ]

    # Geographic mismatch patterns
    HIGH_RISK_IP_PATTERNS = [
        # VPN/Proxy services
        r"nordvpn",
        r"expressvpn",
        r"tor-exit",
        r"datacenter",
        # Known fraud hotspots (placeholder - would use real GeoIP data)
    ]

    # Category-specific risk patterns
    HIGH_RISK_CATEGORIES = {
        "Phones & Tablets": {
            "reason": "High resale value, commonly stolen",
            "risk_multiplier": 1.3,
        },
        "Consumer Electronics": {
            "reason": "Frequently targeted for fraud",
            "risk_multiplier": 1.2,
        },
        "Collectibles & Vintage": {
            "reason": "Difficult to verify authenticity",
            "risk_multiplier": 1.15,
        },
    }

    # Price anomaly thresholds
    PRICE_ANOMALY_THRESHOLDS = {
        "significantly_above_fmv": 1.5,  # Offer > 150% of FMV
        "suspiciously_high": 1.3,  # Offer > 130% of FMV
        "unusually_low": 0.3,  # Offer < 30% of FMV (possible low-quality item or scam)
    }

    # Velocity limits (submissions per time window)
    VELOCITY_LIMITS = {
        "critical": {"offers_1h": 10, "offers_24h": 50},
        "high": {"offers_1h": 5, "offers_24h": 20},
        "medium": {"offers_1h": 3, "offers_24h": 10},
    }

    # New account risk thresholds
    NEW_ACCOUNT_DAYS = 30
    NEW_ACCOUNT_MAX_OFFER_VALUE = 100.0

    @classmethod
    def detect_suspicious_description(cls, description: Optional[str]) -> Dict:
        """
        Check description for suspicious phrases.

        Returns:
            Dict with 'detected', 'matches', and 'severity'
        """
        if not description:
            return {"detected": False, "matches": [], "severity": "none"}

        description_lower = description.lower()
        matches = []

        for pattern in cls.SUSPICIOUS_PHRASES:
            if re.search(pattern, description_lower):
                matches.append(pattern)

        severity = "none"
        if len(matches) >= 3:
            severity = "high"
        elif len(matches) >= 2:
            severity = "medium"
        elif len(matches) >= 1:
            severity = "low"

        return {
            "detected": len(matches) > 0,
            "matches": matches,
            "severity": severity,
            "count": len(matches),
        }

    @classmethod
    def calculate_price_anomaly_score(
        cls, offer_amount: float, fmv: float
    ) -> Dict:
        """
        Calculate price anomaly risk score.

        Returns:
            Dict with 'score', 'ratio', 'anomaly_type'
        """
        if fmv <= 0:
            return {
                "score": 50,
                "ratio": 0,
                "anomaly_type": "invalid_fmv",
                "severity": "medium",
            }

        ratio = offer_amount / fmv

        # Suspiciously high offers
        if ratio >= cls.PRICE_ANOMALY_THRESHOLDS["significantly_above_fmv"]:
            return {
                "score": 80,
                "ratio": ratio,
                "anomaly_type": "significantly_above_fmv",
                "severity": "high",
                "explanation": f"Offer is {ratio:.1f}x FMV (${offer_amount} vs ${fmv})",
            }
        elif ratio >= cls.PRICE_ANOMALY_THRESHOLDS["suspiciously_high"]:
            return {
                "score": 50,
                "ratio": ratio,
                "anomaly_type": "suspiciously_high",
                "severity": "medium",
                "explanation": f"Offer is {ratio:.1f}x FMV (${offer_amount} vs ${fmv})",
            }

        # Suspiciously low offers (possible damaged/fake item)
        elif ratio <= cls.PRICE_ANOMALY_THRESHOLDS["unusually_low"]:
            return {
                "score": 60,
                "ratio": ratio,
                "anomaly_type": "unusually_low",
                "severity": "medium",
                "explanation": f"Offer is only {ratio:.1%} of FMV (${offer_amount} vs ${fmv})",
            }

        # Normal range
        else:
            return {
                "score": 0,
                "ratio": ratio,
                "anomaly_type": "none",
                "severity": "none",
            }

    @classmethod
    def calculate_velocity_score(
        cls,
        offers_1h: int,
        offers_24h: int,
        total_value_24h: float,
    ) -> Dict:
        """
        Calculate velocity risk score based on submission patterns.

        Returns:
            Dict with 'score', 'severity', 'flags'
        """
        flags = []
        score = 0

        # Check critical velocity
        if (
            offers_1h >= cls.VELOCITY_LIMITS["critical"]["offers_1h"]
            or offers_24h >= cls.VELOCITY_LIMITS["critical"]["offers_24h"]
        ):
            score = 100
            flags.append("critical_velocity")
            severity = "critical"

        # Check high velocity
        elif (
            offers_1h >= cls.VELOCITY_LIMITS["high"]["offers_1h"]
            or offers_24h >= cls.VELOCITY_LIMITS["high"]["offers_24h"]
        ):
            score = 70
            flags.append("high_velocity")
            severity = "high"

        # Check medium velocity
        elif (
            offers_1h >= cls.VELOCITY_LIMITS["medium"]["offers_1h"]
            or offers_24h >= cls.VELOCITY_LIMITS["medium"]["offers_24h"]
        ):
            score = 40
            flags.append("medium_velocity")
            severity = "medium"
        else:
            severity = "none"

        # Check total value
        if total_value_24h > 5000:
            score += 30
            flags.append("high_value_velocity")
            severity = max(severity, "high", key=lambda x: ["none", "low", "medium", "high", "critical"].index(x))

        return {
            "score": min(score, 100),
            "severity": severity,
            "flags": flags,
            "offers_1h": offers_1h,
            "offers_24h": offers_24h,
            "total_value_24h": total_value_24h,
        }

    @classmethod
    def calculate_user_trust_score(
        cls,
        user_created_at: Optional[datetime],
        user_trust_score: float,
        offer_amount: float,
    ) -> Dict:
        """
        Calculate user trust risk score.

        Returns:
            Dict with 'score', 'severity', 'flags'
        """
        flags = []
        score = 0

        # New account risk
        if user_created_at:
            # Ensure both datetimes are timezone-aware
            now = datetime.now(user_created_at.tzinfo) if user_created_at.tzinfo else datetime.utcnow()
            account_age_days = (now - user_created_at).days

            if account_age_days < cls.NEW_ACCOUNT_DAYS:
                if offer_amount > cls.NEW_ACCOUNT_MAX_OFFER_VALUE:
                    score += 50
                    flags.append("new_account_high_value")
                else:
                    score += 20
                    flags.append("new_account")

        # Low trust score
        if user_trust_score < 30:
            score += 50
            flags.append("low_trust_score")
        elif user_trust_score < 50:
            score += 25
            flags.append("medium_trust_score")

        # Determine severity
        if score >= 70:
            severity = "high"
        elif score >= 40:
            severity = "medium"
        elif score >= 20:
            severity = "low"
        else:
            severity = "none"

        return {
            "score": min(score, 100),
            "severity": severity,
            "flags": flags,
            "user_trust_score": user_trust_score,
        }

    @classmethod
    def get_category_risk_multiplier(cls, category: str) -> Dict:
        """
        Get risk multiplier for product category.

        Returns:
            Dict with 'multiplier', 'reason'
        """
        if category in cls.HIGH_RISK_CATEGORIES:
            return cls.HIGH_RISK_CATEGORIES[category]
        else:
            return {"risk_multiplier": 1.0, "reason": "Standard risk category"}

    @classmethod
    def detect_ip_patterns(cls, ip_address: Optional[str]) -> Dict:
        """
        Detect suspicious IP patterns (VPN, datacenter, etc.).

        Placeholder implementation - would use real GeoIP/threat intelligence.

        Returns:
            Dict with 'detected', 'patterns', 'severity'
        """
        if not ip_address:
            return {"detected": False, "patterns": [], "severity": "none"}

        # Placeholder: In production, would use MaxMind GeoIP2, IPQualityScore, etc.
        # For now, basic heuristics
        detected_patterns = []

        # Check for common VPN/proxy patterns
        for pattern in cls.HIGH_RISK_IP_PATTERNS:
            if re.search(pattern, ip_address.lower()):
                detected_patterns.append(pattern)

        severity = "none"
        if len(detected_patterns) >= 2:
            severity = "high"
        elif len(detected_patterns) >= 1:
            severity = "medium"

        return {
            "detected": len(detected_patterns) > 0,
            "patterns": detected_patterns,
            "severity": severity,
        }
