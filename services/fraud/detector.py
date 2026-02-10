"""
Core fraud detection engine.
Combines multiple signals to produce risk score.
"""
import structlog
from typing import Dict, List, Optional
from datetime import datetime

try:
    from .models import (
        FraudAnalysisRequest,
        FraudAnalysisResponse,
        FraudFlag,
    )
    from .patterns import FraudPatterns
except ImportError:
    from models import (
        FraudAnalysisRequest,
        FraudAnalysisResponse,
        FraudFlag,
    )
    from patterns import FraudPatterns

logger = structlog.get_logger()


class FraudDetector:
    """
    Main fraud detection engine.

    Scoring Formula:
    risk_score = (
        price_anomaly_score * 0.35 +
        velocity_score * 0.25 +
        pattern_match_score * 0.20 +
        user_trust_score * 0.20
    )
    """

    # Weights for different signal types
    WEIGHTS = {
        "price_anomaly": 0.35,
        "velocity": 0.25,
        "pattern_match": 0.20,
        "user_trust": 0.20,
    }

    # Risk score thresholds
    RISK_THRESHOLDS = {
        "low": 30,
        "medium": 50,
        "high": 70,
        "critical": 85,
    }

    def __init__(self):
        self.patterns = FraudPatterns()

    async def analyze(
        self, request: FraudAnalysisRequest
    ) -> FraudAnalysisResponse:
        """
        Perform comprehensive fraud analysis.

        Args:
            request: Fraud analysis request

        Returns:
            FraudAnalysisResponse with risk score and flags
        """
        logger.info(
            "fraud_analysis_started",
            offer_id=request.offer_id,
            offer_amount=request.offer_amount,
            fmv=request.fmv,
        )

        flags: List[FraudFlag] = []
        breakdown: Dict[str, float] = {}

        # Signal 1: Price Anomaly Detection
        price_result = self._analyze_price_anomaly(request)
        breakdown["price_anomaly"] = price_result["score"]
        if price_result["flags"]:
            flags.extend(price_result["flags"])

        # Signal 2: Velocity Analysis
        velocity_result = self._analyze_velocity(request)
        breakdown["velocity"] = velocity_result["score"]
        if velocity_result["flags"]:
            flags.extend(velocity_result["flags"])

        # Signal 3: Pattern Matching
        pattern_result = self._analyze_patterns(request)
        breakdown["pattern_match"] = pattern_result["score"]
        if pattern_result["flags"]:
            flags.extend(pattern_result["flags"])

        # Signal 4: User Trust Score
        trust_result = self._analyze_user_trust(request)
        breakdown["user_trust"] = trust_result["score"]
        if trust_result["flags"]:
            flags.extend(trust_result["flags"])

        # Calculate weighted risk score
        risk_score = self._calculate_weighted_score(breakdown)

        # Apply category risk multiplier
        category_multiplier = self.patterns.get_category_risk_multiplier(
            request.category
        )
        if category_multiplier["risk_multiplier"] > 1.0:
            risk_score *= category_multiplier["risk_multiplier"]
            risk_score = min(risk_score, 100)  # Cap at 100
            flags.append(
                FraudFlag(
                    type="high_risk_category",
                    severity="medium",
                    score_impact=risk_score - (risk_score / category_multiplier["risk_multiplier"]),
                    description=f"Category '{request.category}' has elevated fraud risk",
                    evidence=category_multiplier,
                )
            )

        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)

        # Generate explanation
        explanation = self._generate_explanation(
            risk_score, risk_level, flags, breakdown
        )

        # Determine recommended action
        recommended_action = self._recommend_action(risk_score, risk_level, flags)

        # Calculate confidence
        confidence = self._calculate_confidence(request, breakdown)

        response = FraudAnalysisResponse(
            offer_id=request.offer_id,
            risk_score=int(risk_score),
            risk_level=risk_level,
            confidence=confidence,
            flags=flags,
            explanation=explanation,
            breakdown=breakdown,
            recommended_action=recommended_action,
        )

        logger.info(
            "fraud_analysis_completed",
            offer_id=request.offer_id,
            risk_score=response.risk_score,
            risk_level=risk_level,
            flag_count=len(flags),
            recommended_action=recommended_action,
        )

        return response

    def _analyze_price_anomaly(
        self, request: FraudAnalysisRequest
    ) -> Dict:
        """Analyze price vs FMV anomalies."""
        result = self.patterns.calculate_price_anomaly_score(
            request.offer_amount, request.fmv
        )

        flags = []
        if result["severity"] in ["medium", "high", "critical"]:
            flags.append(
                FraudFlag(
                    type="price_anomaly",
                    severity=result["severity"],
                    score_impact=result["score"],
                    description=result.get(
                        "explanation",
                        f"Offer amount anomaly detected (ratio: {result['ratio']:.2f})",
                    ),
                    evidence={
                        "offer_amount": request.offer_amount,
                        "fmv": request.fmv,
                        "ratio": result["ratio"],
                        "anomaly_type": result["anomaly_type"],
                    },
                )
            )

        return {"score": result["score"], "flags": flags}

    def _analyze_velocity(self, request: FraudAnalysisRequest) -> Dict:
        """
        Analyze user submission velocity.

        Note: In production, would query database for user's recent offers.
        For now, using placeholder logic.
        """
        # Placeholder: Would query database for actual velocity data
        # For now, use conservative estimates based on user_offer_count
        offers_1h = min(request.user_offer_count // 24, 10)
        offers_24h = min(request.user_offer_count, 50)
        total_value_24h = request.offer_amount * offers_24h

        result = self.patterns.calculate_velocity_score(
            offers_1h=offers_1h,
            offers_24h=offers_24h,
            total_value_24h=total_value_24h,
        )

        flags = []
        if result["severity"] in ["medium", "high", "critical"]:
            flags.append(
                FraudFlag(
                    type="velocity_anomaly",
                    severity=result["severity"],
                    score_impact=result["score"],
                    description=f"Unusual submission velocity detected: {offers_24h} offers in 24h",
                    evidence={
                        "offers_1h": offers_1h,
                        "offers_24h": offers_24h,
                        "total_value_24h": total_value_24h,
                        "flags": result["flags"],
                    },
                )
            )

        return {"score": result["score"], "flags": flags}

    def _analyze_patterns(self, request: FraudAnalysisRequest) -> Dict:
        """Analyze for known fraud patterns."""
        score = 0
        flags = []

        # Check description for suspicious phrases
        if request.description:
            desc_result = self.patterns.detect_suspicious_description(
                request.description
            )
            if desc_result["detected"]:
                pattern_score = len(desc_result["matches"]) * 15
                score += pattern_score

                flags.append(
                    FraudFlag(
                        type="suspicious_description",
                        severity=desc_result["severity"],
                        score_impact=pattern_score,
                        description=f"Description contains {len(desc_result['matches'])} suspicious phrases",
                        evidence=desc_result,
                    )
                )

        # Check IP patterns
        if request.ip_address:
            ip_result = self.patterns.detect_ip_patterns(request.ip_address)
            if ip_result["detected"]:
                ip_score = 30
                score += ip_score

                flags.append(
                    FraudFlag(
                        type="suspicious_ip",
                        severity=ip_result["severity"],
                        score_impact=ip_score,
                        description="IP address shows suspicious patterns (VPN/proxy/datacenter)",
                        evidence=ip_result,
                    )
                )

        # TODO: Add image analysis for stock photos
        # Would call vision service to check if photos are stock images

        return {"score": min(score, 100), "flags": flags}

    def _analyze_user_trust(self, request: FraudAnalysisRequest) -> Dict:
        """Analyze user trustworthiness."""
        result = self.patterns.calculate_user_trust_score(
            user_created_at=request.user_created_at,
            user_trust_score=request.user_trust_score,
            offer_amount=request.offer_amount,
        )

        flags = []
        if result["severity"] in ["medium", "high", "critical"]:
            flag_descriptions = {
                "new_account": "New account (< 30 days)",
                "new_account_high_value": "New account submitting high-value offer",
                "low_trust_score": "User has low trust score",
                "medium_trust_score": "User has medium trust score",
            }

            description = "; ".join(
                flag_descriptions.get(f, f) for f in result["flags"]
            )

            flags.append(
                FraudFlag(
                    type="user_trust",
                    severity=result["severity"],
                    score_impact=result["score"],
                    description=description,
                    evidence={
                        "user_trust_score": result["user_trust_score"],
                        "flags": result["flags"],
                    },
                )
            )

        return {"score": result["score"], "flags": flags}

    def _calculate_weighted_score(self, breakdown: Dict[str, float]) -> float:
        """Calculate final weighted risk score."""
        score = 0.0
        for signal_type, signal_score in breakdown.items():
            weight = self.WEIGHTS.get(signal_type, 0)
            score += signal_score * weight

        return min(score, 100.0)

    def _determine_risk_level(self, risk_score: float) -> str:
        """Map risk score to risk level."""
        if risk_score >= self.RISK_THRESHOLDS["critical"]:
            return "critical"
        elif risk_score >= self.RISK_THRESHOLDS["high"]:
            return "high"
        elif risk_score >= self.RISK_THRESHOLDS["medium"]:
            return "medium"
        else:
            return "low"

    def _generate_explanation(
        self,
        risk_score: float,
        risk_level: str,
        flags: List[FraudFlag],
        breakdown: Dict[str, float],
    ) -> str:
        """Generate human-readable explanation."""
        if risk_level == "low":
            explanation = f"Low fraud risk (score: {int(risk_score)}). "
            explanation += "Transaction appears legitimate with no major red flags."
        elif risk_level == "medium":
            explanation = f"Medium fraud risk (score: {int(risk_score)}). "
            explanation += f"Detected {len(flags)} potential issue(s). "
        elif risk_level == "high":
            explanation = f"High fraud risk (score: {int(risk_score)}). "
            explanation += f"Detected {len(flags)} concerning issue(s). "
        else:  # critical
            explanation = f"Critical fraud risk (score: {int(risk_score)}). "
            explanation += f"Detected {len(flags)} serious fraud indicator(s). "

        # Add top contributors
        top_signals = sorted(
            breakdown.items(), key=lambda x: x[1], reverse=True
        )[:2]
        if top_signals and top_signals[0][1] > 0:
            signal_names = {
                "price_anomaly": "price anomalies",
                "velocity": "submission velocity",
                "pattern_match": "fraud patterns",
                "user_trust": "user trust issues",
            }
            contributors = ", ".join(
                signal_names.get(sig, sig) for sig, _ in top_signals if _ > 10
            )
            if contributors:
                explanation += f"Primary concerns: {contributors}."

        return explanation

    def _recommend_action(
        self, risk_score: float, risk_level: str, flags: List[FraudFlag]
    ) -> str:
        """Recommend action based on risk assessment."""
        # Critical risk → auto-reject
        if risk_level == "critical":
            return "reject"

        # High risk → escalate for manual review
        elif risk_level == "high":
            return "escalate"

        # Medium risk → flag for review
        elif risk_level == "medium":
            # Check for specific high-priority flags
            critical_flags = [
                f for f in flags if f.severity in ["high", "critical"]
            ]
            if critical_flags:
                return "review"
            else:
                return "approve"

        # Low risk → approve
        else:
            return "approve"

    def _calculate_confidence(
        self, request: FraudAnalysisRequest, breakdown: Dict[str, float]
    ) -> float:
        """
        Calculate confidence in the fraud assessment.

        Factors:
        - Availability of data signals
        - Consistency of signals
        """
        confidence = 0.0

        # Base confidence from data availability
        if request.fmv > 0:
            confidence += 0.25
        if request.user_id:
            confidence += 0.20
        if request.user_created_at:
            confidence += 0.15
        if request.ip_address:
            confidence += 0.10
        if request.description:
            confidence += 0.10

        # Adjust for signal consistency
        signal_values = [v for v in breakdown.values() if v > 0]
        if signal_values:
            avg_signal = sum(signal_values) / len(signal_values)
            variance = sum((v - avg_signal) ** 2 for v in signal_values) / len(
                signal_values
            )

            # Low variance (consistent signals) → higher confidence
            if variance < 100:
                confidence += 0.20
            elif variance < 500:
                confidence += 0.10

        return min(confidence, 1.0)


# Global detector instance
fraud_detector = FraudDetector()
