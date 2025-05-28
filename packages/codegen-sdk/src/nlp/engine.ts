import natural from 'natural';
import nlp from 'compromise';
import { 
  NLPProcessingOptions, 
  NLPResult, 
  NLPProcessingError 
} from '../types';

/**
 * Unified Natural Language Processing Engine
 * Consolidates all NLP functionality into a single, cohesive system
 */
export class UnifiedNLPEngine {
  private tokenizer: natural.WordTokenizer;
  private stemmer: natural.PorterStemmer;
  private sentimentAnalyzer: natural.SentimentAnalyzer;
  private classifier?: natural.LogisticRegressionClassifier;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.sentimentAnalyzer = new natural.SentimentAnalyzer(
      'English',
      this.stemmer,
      'afinn'
    );
  }

  /**
   * Process text with comprehensive NLP analysis
   */
  async processText(
    text: string, 
    options: NLPProcessingOptions = {}
  ): Promise<NLPResult> {
    try {
      const {
        language = 'en',
        confidence = 0.7,
        enableSentimentAnalysis = true,
        enableEntityExtraction = true,
        enableIntentClassification = false
      } = options;

      // Basic text processing
      const tokens = this.tokenizer.tokenize(text);
      const stems = tokens.map(token => this.stemmer.stem(token));

      // Language detection (simplified)
      const detectedLanguage = this.detectLanguage(text);
      
      // Sentiment analysis
      let sentiment;
      if (enableSentimentAnalysis) {
        sentiment = this.analyzeSentiment(tokens);
      }

      // Entity extraction
      let entities;
      if (enableEntityExtraction) {
        entities = this.extractEntities(text);
      }

      // Intent classification
      let intent;
      if (enableIntentClassification && this.classifier) {
        intent = this.classifyIntent(text);
      }

      // Keyword extraction
      const keywords = this.extractKeywords(text);

      // Text summarization
      const summary = this.generateSummary(text);

      return {
        text,
        language: detectedLanguage,
        confidence: this.calculateOverallConfidence(sentiment, entities, intent),
        sentiment,
        entities,
        intent,
        keywords,
        summary
      };

    } catch (error) {
      throw new NLPProcessingError(
        `Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, text: text.substring(0, 100) }
      );
    }
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(tokens: string[]) {
    const stems = tokens.map(token => this.stemmer.stem(token));
    const score = this.sentimentAnalyzer.getSentiment(stems);
    
    let label: 'positive' | 'negative' | 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';
    else label = 'neutral';

    return {
      score: Math.round(score * 100) / 100,
      label
    };
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(text: string) {
    const doc = nlp(text);
    const entities = [];

    // Extract people
    const people = doc.people().out('array');
    people.forEach(person => {
      const match = doc.match(person);
      entities.push({
        text: person,
        type: 'PERSON',
        confidence: 0.8,
        start: match.start || 0,
        end: match.end || person.length
      });
    });

    // Extract places
    const places = doc.places().out('array');
    places.forEach(place => {
      const match = doc.match(place);
      entities.push({
        text: place,
        type: 'LOCATION',
        confidence: 0.8,
        start: match.start || 0,
        end: match.end || place.length
      });
    });

    // Extract organizations
    const organizations = doc.organizations().out('array');
    organizations.forEach(org => {
      const match = doc.match(org);
      entities.push({
        text: org,
        type: 'ORGANIZATION',
        confidence: 0.7,
        start: match.start || 0,
        end: match.end || org.length
      });
    });

    // Extract dates
    const dates = doc.dates().out('array');
    dates.forEach(date => {
      const match = doc.match(date);
      entities.push({
        text: date,
        type: 'DATE',
        confidence: 0.9,
        start: match.start || 0,
        end: match.end || date.length
      });
    });

    return entities;
  }

  /**
   * Classify intent of text (requires trained classifier)
   */
  private classifyIntent(text: string) {
    if (!this.classifier) {
      return undefined;
    }

    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stems = tokens.map(token => this.stemmer.stem(token));
    
    const classification = this.classifier.classify(stems);
    const confidence = this.classifier.getClassifications(stems)[0]?.value || 0;

    return {
      name: classification,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const doc = nlp(text);
    
    // Extract nouns and adjectives as keywords
    const nouns = doc.nouns().out('array');
    const adjectives = doc.adjectives().out('array');
    
    // Combine and filter
    const keywords = [...nouns, ...adjectives]
      .filter(word => word.length > 2)
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 10); // Limit to top 10

    return keywords;
  }

  /**
   * Generate text summary
   */
  private generateSummary(text: string): string {
    if (text.length < 100) {
      return text; // Too short to summarize
    }

    const doc = nlp(text);
    const sentences = doc.sentences().out('array');
    
    if (sentences.length <= 2) {
      return text;
    }

    // Simple extractive summarization - take first and most important sentences
    const summary = sentences.slice(0, Math.min(2, Math.ceil(sentences.length / 3)));
    return summary.join(' ');
  }

  /**
   * Detect language (simplified implementation)
   */
  private detectLanguage(text: string): string {
    // This is a simplified implementation
    // In a real scenario, you'd use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    
    return englishWordCount > words.length * 0.1 ? 'en' : 'unknown';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    sentiment?: any,
    entities?: any[],
    intent?: any
  ): number {
    let totalConfidence = 0;
    let components = 0;

    if (sentiment) {
      totalConfidence += 0.8; // Sentiment analysis is generally reliable
      components++;
    }

    if (entities && entities.length > 0) {
      const avgEntityConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
      totalConfidence += avgEntityConfidence;
      components++;
    }

    if (intent) {
      totalConfidence += intent.confidence;
      components++;
    }

    return components > 0 ? Math.round((totalConfidence / components) * 100) / 100 : 0.5;
  }

  /**
   * Train intent classifier with training data
   */
  trainIntentClassifier(trainingData: Array<{ text: string; intent: string }>) {
    const classifier = new natural.LogisticRegressionClassifier();

    trainingData.forEach(({ text, intent }) => {
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      const stems = tokens.map(token => this.stemmer.stem(token));
      classifier.addDocument(stems, intent);
    });

    classifier.train();
    this.classifier = classifier;
  }

  /**
   * Process code-related text with specialized handling
   */
  async processCodeText(text: string): Promise<NLPResult> {
    // Enhanced processing for code-related content
    const codeKeywords = this.extractCodeKeywords(text);
    const programmingLanguage = this.detectProgrammingLanguage(text);
    
    const baseResult = await this.processText(text, {
      enableSentimentAnalysis: false, // Less relevant for code
      enableEntityExtraction: true,
      enableIntentClassification: true
    });

    return {
      ...baseResult,
      keywords: [...(baseResult.keywords || []), ...codeKeywords],
      metadata: {
        programmingLanguage,
        isCodeRelated: true
      }
    } as NLPResult & { metadata?: any };
  }

  /**
   * Extract programming-specific keywords
   */
  private extractCodeKeywords(text: string): string[] {
    const codePatterns = [
      /\b(function|class|method|variable|array|object|string|number|boolean)\b/gi,
      /\b(if|else|for|while|switch|case|try|catch|finally)\b/gi,
      /\b(public|private|protected|static|const|let|var)\b/gi,
      /\b(import|export|require|module|package)\b/gi
    ];

    const keywords = new Set<string>();
    
    codePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => keywords.add(match.toLowerCase()));
      }
    });

    return Array.from(keywords);
  }

  /**
   * Detect programming language from text
   */
  private detectProgrammingLanguage(text: string): string {
    const languagePatterns = {
      javascript: /\b(function|const|let|var|=>|console\.log)\b/gi,
      python: /\b(def|import|from|print|if __name__)\b/gi,
      java: /\b(public class|private|protected|import java)\b/gi,
      typescript: /\b(interface|type|enum|namespace|as)\b/gi,
      go: /\b(func|package|import|var|:=)\b/gi,
      rust: /\b(fn|let|mut|impl|struct|enum)\b/gi
    };

    for (const [language, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        return language;
      }
    }

    return 'unknown';
  }
}

