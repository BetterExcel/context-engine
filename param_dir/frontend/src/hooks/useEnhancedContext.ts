import { useState, useEffect, useCallback } from 'react';
import { 
  ComprehensiveContext, 
  StreamingContext, 
  StreamingPhase,
  ProgressiveDisclosure,
  DisclosureLevel,
  InteractiveExploration
} from '../types/enhanced-context';

interface UseEnhancedContextOptions {
  enableStreaming?: boolean;
  autoAdvanceDisclosure?: boolean;
}

interface UseEnhancedContextReturn {
  context: ComprehensiveContext | null;
  streamingContext: StreamingContext | null;
  progressiveDisclosure: ProgressiveDisclosure;
  interactiveExploration: InteractiveExploration;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setContext: (context: ComprehensiveContext | null) => void;
  startStreaming: (phases: StreamingPhase[]) => void;
  updateStreamingProgress: (phase: StreamingPhase, progress: number) => void;
  completeStreaming: (finalContext: ComprehensiveContext) => void;
  setDisclosureLevel: (level: DisclosureLevel) => void;
  updateExploration: (exploration: Partial<InteractiveExploration>) => void;
  resetExploration: () => void;
  setError: (error: string | null) => void;
}

export const useEnhancedContext = (
  options: UseEnhancedContextOptions = {}
): UseEnhancedContextReturn => {
  const {
    enableStreaming = true,
    autoAdvanceDisclosure = false
  } = options;

  // Core state
  const [context, setContext] = useState<ComprehensiveContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [streamingContext, setStreamingContext] = useState<StreamingContext | null>(null);

  // Progressive disclosure state
  const [progressiveDisclosure, setProgressiveDisclosure] = useState<ProgressiveDisclosure>({
    level: DisclosureLevel.STANDARD,
    availableLevels: Object.values(DisclosureLevel),
    content: {
      summary: true,
      details: true,
      technical: false,
      evidence: false
    }
  });

  // Interactive exploration state
  const [interactiveExploration, setInteractiveExploration] = useState<InteractiveExploration>({
    drillDownPath: [],
    filters: {
      insightTypes: [],
      priorities: [],
      categories: [],
      confidenceThreshold: 0.5
    }
  });

  // Auto-advance disclosure level based on context complexity
  useEffect(() => {
    if (autoAdvanceDisclosure && context) {
      let recommendedLevel = DisclosureLevel.STANDARD;
      
      if (context.complexity === 'simple') {
        recommendedLevel = DisclosureLevel.SUMMARY;
      } else if (context.complexity === 'very_complex') {
        recommendedLevel = DisclosureLevel.DETAILED;
      } else if (context.insights.length > 10 || context.risks.length > 5) {
        recommendedLevel = DisclosureLevel.DETAILED;
      }

      if (recommendedLevel !== progressiveDisclosure.level) {
        setProgressiveDisclosure(prev => ({
          ...prev,
          level: recommendedLevel
        }));
      }
    }
  }, [context, autoAdvanceDisclosure, progressiveDisclosure.level]);

  // Update content visibility based on disclosure level
  useEffect(() => {
    const content = {
      summary: true,
      details: progressiveDisclosure.level !== DisclosureLevel.SUMMARY,
      technical: progressiveDisclosure.level === DisclosureLevel.DETAILED || 
                progressiveDisclosure.level === DisclosureLevel.EXPERT,
      evidence: progressiveDisclosure.level === DisclosureLevel.EXPERT
    };

    setProgressiveDisclosure(prev => ({
      ...prev,
      content
    }));
  }, [progressiveDisclosure.level]);

  // Streaming management
  const startStreaming = useCallback((phases: StreamingPhase[]) => {
    if (!enableStreaming) return;

    setIsLoading(true);
    setError(null);
    setContext(null);
    
    setStreamingContext({
      isStreaming: true,
      progress: 0,
      currentPhase: phases[0] || StreamingPhase.DATA_PARSING,
      completedPhases: [],
      estimatedTimeRemaining: phases.length * 2 // Rough estimate: 2 seconds per phase
    });
  }, [enableStreaming]);

  const updateStreamingProgress = useCallback((phase: StreamingPhase, progress: number) => {
    setStreamingContext(prev => {
      if (!prev) return null;

      // const phaseIndex = Object.values(StreamingPhase).indexOf(phase);
      const totalPhases = Object.values(StreamingPhase).length;
      const phaseProgress = progress / totalPhases;
      const completedPhaseProgress = prev.completedPhases.length / totalPhases;
      const overallProgress = Math.min(100, (completedPhaseProgress + phaseProgress) * 100);

      // Estimate remaining time based on current progress
      const elapsedTime = Date.now() - (prev as any).startTime || 0;
      const estimatedTotalTime = overallProgress > 0 ? (elapsedTime / overallProgress) * 100 : 0;
      const estimatedTimeRemaining = Math.max(0, (estimatedTotalTime - elapsedTime) / 1000);

      return {
        ...prev,
        currentPhase: phase,
        progress: overallProgress,
        estimatedTimeRemaining
      };
    });
  }, []);



  const completeStreaming = useCallback((finalContext: ComprehensiveContext) => {
    setStreamingContext(prev => prev ? {
      ...prev,
      isStreaming: false,
      progress: 100,
      estimatedTimeRemaining: 0
    } : null);
    
    setContext(finalContext);
    setIsLoading(false);
    
    // Auto-clear streaming context after a delay
    setTimeout(() => {
      setStreamingContext(null);
    }, 2000);
  }, []);

  // Disclosure level management
  const setDisclosureLevel = useCallback((level: DisclosureLevel) => {
    setProgressiveDisclosure(prev => ({
      ...prev,
      level
    }));
  }, []);

  // Exploration management
  const updateExploration = useCallback((exploration: Partial<InteractiveExploration>) => {
    setInteractiveExploration(prev => ({
      ...prev,
      ...exploration
    }));
  }, []);

  const resetExploration = useCallback(() => {
    setInteractiveExploration({
      drillDownPath: [],
      filters: {
        insightTypes: [],
        priorities: [],
        categories: [],
        confidenceThreshold: 0.5
      }
    });
  }, []);

  return {
    context,
    streamingContext,
    progressiveDisclosure,
    interactiveExploration,
    isLoading,
    error,
    
    // Actions
    setContext,
    startStreaming,
    updateStreamingProgress,
    completeStreaming,
    setDisclosureLevel,
    updateExploration,
    resetExploration,
    setError
  };
};