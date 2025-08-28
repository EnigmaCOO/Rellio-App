import { Filter } from 'bad-words';
import OpenAI from 'openai';
import { storage } from '../storage';

// Initialize bad-words filter
const filter = new Filter();

// Allow spiritual/religious terms that should never be blocked
const SPIRITUAL_ALLOWLIST = [
  'god', 'allah', 'jesus', 'christ', 'buddha', 'krishna', 'vishnu', 'shiva',
  'prophet', 'prayer', 'faith', 'sacred', 'holy', 'divine', 'spiritual',
  'worship', 'blessed', 'salvation', 'enlightenment', 'meditation', 'scripture',
  'bible', 'quran', 'torah', 'vedas', 'dharma', 'karma', 'nirvana', 'heaven',
  'soul', 'spirit', 'angel', 'miracle', 'blessing', 'grace', 'mercy', 'love',
  'peace', 'wisdom', 'truth', 'light', 'eternal', 'infinite', 'creator'
];

// Remove spiritual terms from bad-words filter
filter.removeWords(...SPIRITUAL_ALLOWLIST);

// Religious bias keywords and hate speech patterns
const RELIGIOUS_BIAS_KEYWORDS = [
  'superior religion', 'false god', 'fake religion', 'heretic', 'infidel',
  'cult', 'devil worship', 'satanic', 'evil religion', 'false prophet',
  'heathen', 'pagan scum', 'godless', 'blasphemer', 'apostate'
];

const RELIGIOUS_HATE_PATTERNS = [
  /hate\s+(christianity|islam|judaism|hinduism|buddhism|christians|muslims|jews|hindus|buddhists)/i,
  /kill\s+(christians|muslims|jews|hindus|buddhists)/i,
  /(christians|muslims|jews|hindus|buddhists)\s+are\s+(evil|stupid|terrorists|inferior)/i,
  /(christianity|islam|judaism|hinduism|buddhism)\s+is\s+(evil|fake|false|stupid|terrorist)/i,
  /destroy\s+(christianity|islam|judaism|hinduism|buddhism)/i,
  /burn\s+(churches|mosques|synagogues|temples)/i
];

// Custom banned words specific to religious contexts
const CUSTOM_BANNED_WORDS = [
  'jihadi', 'terrorist religion', 'nazi', 'holocaust denier', 'supremacist',
  'radical extremist', 'fundamentalist scum', 'religious fanatic'
];

// Add custom words to filter
filter.addWords(...CUSTOM_BANNED_WORDS);

// OpenAI client for AI-based moderation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  confidence?: number;
  flagType?: 'offensive_language' | 'hate_speech' | 'religious_bias' | 'ai_detected';
  suggestion?: string;
}

// Check for offensive language using bad-words filter
function checkOffensiveLanguage(text: string): ModerationResult {
  const lowerText = text.toLowerCase();
  
  // Skip moderation if text contains spiritual/religious terms
  const containsSpiritual = SPIRITUAL_ALLOWLIST.some(term => 
    lowerText.includes(term.toLowerCase())
  );
  
  if (containsSpiritual) {
    // Allow spiritual discussions without profanity filtering
    return { isBlocked: false };
  }
  
  if (filter.isProfane(text)) {
    return {
      isBlocked: true,
      reason: 'Message contains offensive language',
      flagType: 'offensive_language',
      suggestion: 'Please rephrase your message using respectful language.'
    };
  }
  return { isBlocked: false };
}

// Check for religious bias and hate speech
function checkReligiousBias(text: string): ModerationResult {
  const lowerText = text.toLowerCase();
  
  // Check for religious bias keywords
  for (const keyword of RELIGIOUS_BIAS_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        isBlocked: true,
        reason: 'Message contains religious bias or hate speech',
        flagType: 'religious_bias',
        suggestion: 'Rellio promotes unity across all religious traditions. Please share your thoughts respectfully.'
      };
    }
  }
  
  // Check for hate speech patterns
  for (const pattern of RELIGIOUS_HATE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isBlocked: true,
        reason: 'Message contains hate speech targeting religious groups',
        flagType: 'hate_speech',
        suggestion: 'Let\'s focus on understanding and learning together across all traditions.'
      };
    }
  }
  
  return { isBlocked: false };
}

// Use OpenAI moderation API for advanced detection
async function checkAIModerationAPI(text: string): Promise<ModerationResult> {
  try {
    const lowerText = text.toLowerCase();
    
    // Skip AI moderation for spiritual questions and discussions
    const containsSpiritual = SPIRITUAL_ALLOWLIST.some(term => 
      lowerText.includes(term.toLowerCase())
    );
    
    // Also allow common spiritual question patterns
    const spiritualQuestionPatterns = [
      /who\s+is\s+(god|allah|jesus|christ|buddha)/i,
      /what\s+is\s+(god|faith|prayer|salvation|enlightenment)/i,
      /how\s+to\s+(pray|meditate|find\s+god)/i,
      /meaning\s+of\s+(life|love|peace)/i
    ];
    
    const isSpiritualQuestion = spiritualQuestionPatterns.some(pattern => 
      pattern.test(text)
    );
    
    if (containsSpiritual || isSpiritualQuestion) {
      // Allow legitimate spiritual discussions
      return { isBlocked: false };
    }
    
    const response = await openai.moderations.create({
      input: text,
    });
    
    const result = response.results[0];
    
    if (result.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category);
      
      return {
        isBlocked: true,
        reason: `Content flagged for: ${categories.join(', ')}`,
        flagType: 'ai_detected',
        confidence: Math.max(...Object.values(result.category_scores)) * 100,
        suggestion: 'Message blocked to promote unity—please rephrase respectfully.'
      };
    }
    
    return { isBlocked: false };
  } catch (error) {
    console.error('OpenAI moderation API error:', error);
    // Fallback to other checks if API fails
    return { isBlocked: false };
  }
}

// Main moderation function
export async function moderateMessage(text: string, userId?: string): Promise<ModerationResult> {
  console.log(`🔍 Moderating message: "${text}" for user: ${userId}`);
  
  // Check for spiritual content first - bypass all moderation for spiritual questions
  const lowerText = text.toLowerCase();
  const containsSpiritual = SPIRITUAL_ALLOWLIST.some(term => 
    lowerText.includes(term.toLowerCase())
  );
  
  const spiritualQuestionPatterns = [
    /who\s+is\s+(god|allah|jesus|christ|buddha)/i,
    /what\s+is\s+(god|faith|prayer|salvation|enlightenment)/i,
    /how\s+to\s+(pray|meditate|find\s+god)/i,
    /meaning\s+of\s+(life|love|peace)/i
  ];
  
  const isSpiritualQuestion = spiritualQuestionPatterns.some(pattern => 
    pattern.test(text)
  );
  
  if (containsSpiritual || isSpiritualQuestion) {
    console.log(`✅ Allowing spiritual content: "${text}"`);
    return { isBlocked: false };
  }
  
  // Check if user is banned
  if (userId) {
    try {
      const user = await storage.getUser(userId);
      if (user && user.banned === 1) {
        const banExpired = user.banExpiresAt && new Date(user.banExpiresAt) < new Date();
        if (!banExpired) {
          console.log(`❌ User ${userId} is banned`);
          return {
            isBlocked: true,
            reason: user.banReason || 'Your account has been suspended',
            flagType: 'offensive_language'
          };
        }
      }
    } catch (error) {
      console.error('Error checking user ban status:', error);
    }
  }

  // Run all moderation checks
  const checks = [
    checkOffensiveLanguage(text),
    checkReligiousBias(text),
    await checkAIModerationAPI(text)
  ];

  console.log(`🔍 Moderation results - Offensive: ${checks[0].isBlocked}, Bias: ${checks[1].isBlocked}, AI: ${checks[2].isBlocked}`);

  // Return the first blocking result
  for (const result of checks) {
    if (result.isBlocked) {
      // Log the moderation action
      if (userId) {
        await logModerationAction(userId, 'message_blocked', {
          originalMessage: text,
          flagType: result.flagType,
          reason: result.reason
        });
      }
      console.log(`❌ Message blocked for user ${userId}: ${result.reason}`);
      return result;
    }
  }

  console.log(`✅ Message allowed: "${text}"`);
  return { isBlocked: false };
}

// Log moderation actions for audit trail
export async function logModerationAction(
  userId: string,
  action: string,
  details: any,
  moderatorId?: string
) {
  try {
    await storage.createModerationLog({
      userId,
      action,
      details,
      moderatorId: moderatorId || 'system'
    });
  } catch (error) {
    console.error('Error logging moderation action:', error);
  }
}

// Flag message for review
export async function flagMessage(
  messageId: number,
  sessionId: string,
  content: string,
  flagReason: string,
  userId?: string,
  reportedBy?: string,
  aiConfidence?: number
) {
  try {
    await storage.createFlaggedMessage({
      messageId,
      sessionId,
      userId,
      content,
      flagReason,
      reportedBy,
      aiConfidence
    });
  } catch (error) {
    console.error('Error flagging message:', error);
  }
}

// Issue warning to user
export async function issueWarning(userId: string, reason: string) {
  try {
    const user = await storage.getUser(userId);
    if (user) {
      const newWarningCount = (user.moderationWarnings || 0) + 1;
      
      await storage.updateUser(userId, {
        moderationWarnings: newWarningCount
      });

      // Auto-ban after 3 warnings
      if (newWarningCount >= 3) {
        await banUser(userId, 'Multiple moderation violations', 7); // 7 day ban
      }

      await logModerationAction(userId, 'warning_issued', {
        reason,
        warningCount: newWarningCount
      });
    }
  } catch (error) {
    console.error('Error issuing warning:', error);
  }
}

// Ban user
export async function banUser(userId: string, reason: string, durationDays: number = 7) {
  try {
    const banExpiresAt = new Date();
    banExpiresAt.setDate(banExpiresAt.getDate() + durationDays);

    await storage.updateUser(userId, {
      banned: 1,
      banReason: reason,
      banExpiresAt
    });

    await logModerationAction(userId, 'user_banned', {
      reason,
      duration: `${durationDays} days`,
      expiresAt: banExpiresAt
    });
  } catch (error) {
    console.error('Error banning user:', error);
  }
}

// Clean up expired bans
export async function cleanupExpiredBans() {
  try {
    // This would need to be implemented in storage
    console.log('Cleaning up expired bans...');
    // TODO: Implement in storage layer
  } catch (error) {
    console.error('Error cleaning up expired bans:', error);
  }
}