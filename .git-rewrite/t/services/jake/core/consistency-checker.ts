/**
 * Character Consistency Checker
 * 
 * Validates that generated scripts match Jake's character bible
 * Rejects scripts that are off-brand
 */

import { JAKE_CHARACTER, CONSISTENCY_PATTERNS } from './character-bible.js';
import { CharacterConsistencyCheck, JakeTone } from '../../../types/jake.js';

export class CharacterConsistencyChecker {
  /**
   * Check if a script passes Jake's character requirements
   */
  check(script: string, expectedTone?: JakeTone): CharacterConsistencyCheck {
    const violations: string[] = [];
    let score = 100;

    // 1. Check for banned phrases
    const bannedMatches = this.checkBannedPhrases(script);
    if (bannedMatches.length > 0) {
      violations.push(`Contains banned phrases: ${bannedMatches.join(', ')}`);
      score -= 40;
    }

    // 2. Check for required patterns (contractions, address terms)
    const hasContractions = CONSISTENCY_PATTERNS.required_patterns[1].test(script);
    if (!hasContractions) {
      violations.push('Missing Jake contractions (gonna, wanna, ain\'t, etc.)');
      score -= 15;
    }

    // 3. Check word count
    const wordCount = script.split(/\s+/).length;
    if (wordCount > CONSISTENCY_PATTERNS.max_words) {
      violations.push(`Too long: ${wordCount} words (max ${CONSISTENCY_PATTERNS.max_words})`);
      score -= 20;
    }
    if (wordCount < CONSISTENCY_PATTERNS.min_words) {
      violations.push(`Too short: ${wordCount} words (min ${CONSISTENCY_PATTERNS.min_words})`);
      score -= 10;
    }

    // 4. Check tone markers if tone specified
    if (expectedTone && !this.checkToneMatch(script, expectedTone)) {
      violations.push(`Tone doesn't match expected: ${expectedTone}`);
      score -= 15;
    }

    // 5. Check for forbidden patterns
    const forbiddenMatches = this.checkForbiddenPatterns(script);
    if (forbiddenMatches.length > 0) {
      violations.push(`Contains forbidden patterns: ${forbiddenMatches.join(', ')}`);
      score -= 30;
    }

    return {
      passed: violations.length === 0 && score >= 70,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Check for banned phrases from character bible
   */
  private checkBannedPhrases(script: string): string[] {
    const matches: string[] = [];
    
    for (const banned of JAKE_CHARACTER.banned) {
      const regex = new RegExp(banned.replace(/[.*+?^${}()|[\]\]/g, '\$&'), 'i');
      if (regex.test(script)) {
        matches.push(banned);
      }
    }

    return matches;
  }

  /**
   * Check for forbidden patterns
   */
  private checkForbiddenPatterns(script: string): string[] {
    const matches: string[] = [];

    for (const pattern of CONSISTENCY_PATTERNS.forbidden_patterns) {
      if (pattern.test(script)) {
        matches.push(pattern.source);
      }
    }

    return matches;
  }

  /**
   * Check if script matches expected tone
   */
  private checkToneMatch(script: string, tone: JakeTone): boolean {
    const tonePattern = CONSISTENCY_PATTERNS.tone_markers[tone];
    return tonePattern ? tonePattern.test(script) : true;
  }

  /**
   * Suggest improvements for a failed script
   */
  suggestImprovements(script: string): string[] {
    const suggestions: string[] = [];

    // Check for contractions
    if (!/\b(gonna|wanna|gotta|ain't|lemme)\b/i.test(script)) {
      suggestions.push('Add Jake contractions: gonna, wanna, ain\'t, lemme');
    }

    // Check for address term
    if (!/\b(partner|friend|boss|chief|pal)\b/i.test(script)) {
      suggestions.push('Add an address term: partner, friend, boss');
    }

    // Check word count
    const wordCount = script.split(/\s+/).length;
    if (wordCount > CONSISTENCY_PATTERNS.max_words) {
      suggestions.push(`Reduce to max ${CONSISTENCY_PATTERNS.max_words} words`);
    }

    return suggestions;
  }
}

/**
 * Singleton instance
 */
export const consistencyChecker = new CharacterConsistencyChecker();
