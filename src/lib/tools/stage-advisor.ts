// Stage Advisor — provides stage-based guidance and suggested next steps for initiatives

export interface StageSuggestion {
  text: string;
  chatPrompt: string;
  icon: string;
}

export interface StageGuidance {
  systemPromptAddition: string;
  suggestions: StageSuggestion[];
}

export function getStageGuidance(
  stage: string,
  initiativeTitle: string,
  initiativeId: string
): StageGuidance {
  switch (stage) {
    case 'idea':
      return {
        systemPromptAddition: `This initiative "${initiativeTitle}" is at the IDEA stage. Your role:
- Help validate whether this is worth pursuing
- Search Jira for related or duplicate work
- Ask probing questions about the problem space, target users, and business impact
- Suggest creating a discovery plan with key hypotheses to validate
- If the idea is strong, propose moving it to Discovery stage`,
        suggestions: [
          { text: 'Search for related Jira work', chatPrompt: `Search Jira for issues related to "${initiativeTitle}" and check for duplicates or overlapping work`, icon: 'Search' },
          { text: 'Create discovery plan', chatPrompt: `Create a discovery plan for the initiative "${initiativeTitle}" with key questions to answer and hypotheses to validate`, icon: 'FileText' },
          { text: 'Evaluate business potential', chatPrompt: `Help me evaluate the business potential and strategic fit of "${initiativeTitle}". What questions should we answer?`, icon: 'TrendingUp' },
        ],
      };

    case 'discovery':
      return {
        systemPromptAddition: `This initiative "${initiativeTitle}" is at the DISCOVERY stage. Your role:
- Help synthesize findings from research, interviews, and data analysis
- Identify key risks and dependencies
- When discovery is sufficient, suggest building a business case
- Help fill in the business case fields (whyNeeded, expectedValue, whatIfNot, expectedTimeToMarket)
- Propose moving to Validation when ready`,
        suggestions: [
          { text: 'Summarize discovery findings', chatPrompt: `Summarize what we know so far about "${initiativeTitle}" from discovery. What are the key insights and remaining unknowns?`, icon: 'ClipboardList' },
          { text: 'Draft business case', chatPrompt: `Draft a business case for "${initiativeTitle}" including why it's needed, expected value, and what happens if we don't do it`, icon: 'Briefcase' },
          { text: 'Identify risks', chatPrompt: `What are the key risks for "${initiativeTitle}"? Identify technical, market, and organizational risks and create risk entries`, icon: 'ShieldAlert' },
        ],
      };

    case 'validation':
      return {
        systemPromptAddition: `This initiative "${initiativeTitle}" is at the VALIDATION stage. Your role:
- Review the business case for completeness and strength
- Help strengthen the value proposition with data
- When validation is solid, suggest creating a PRD/spec and a Jira Epic
- Address stakeholder concerns proactively
- Propose moving to Definition when ready`,
        suggestions: [
          { text: 'Review business case', chatPrompt: `Review the business case for "${initiativeTitle}" — is it strong enough to proceed? What's missing?`, icon: 'CheckCircle' },
          { text: 'Draft PRD & create Epic', chatPrompt: `Draft a Product Requirements Document for "${initiativeTitle}" and create an Epic in Jira for it`, icon: 'FileText' },
          { text: 'Stakeholder concerns', chatPrompt: `What stakeholder concerns should we address before moving "${initiativeTitle}" to definition? Help me prepare for the review`, icon: 'Users' },
        ],
      };

    case 'definition':
      return {
        systemPromptAddition: `This initiative "${initiativeTitle}" is at the DEFINITION stage. Your role:
- Help break down the initiative into Features, Stories, and Tasks
- Create Jira issues for each work item with proper hierarchy (Stories under Epics)
- Estimate effort and identify dependencies between items
- Ensure completeness — every acceptance criteria should be testable
- When definition is complete, propose approval`,
        suggestions: [
          { text: 'Break down into Stories', chatPrompt: `Break "${initiativeTitle}" down into Features and Stories. Create Jira issues for each with proper hierarchy under the Epic`, icon: 'GitBranch' },
          { text: 'Estimate effort', chatPrompt: `Help estimate the effort (story points) for "${initiativeTitle}" and its features/stories`, icon: 'Calculator' },
          { text: 'Ready for approval?', chatPrompt: `Is "${initiativeTitle}" fully defined and ready for approval? Check completeness and list any gaps`, icon: 'ThumbsUp' },
        ],
      };

    case 'approved':
      return {
        systemPromptAddition: `This initiative "${initiativeTitle}" is APPROVED and ready for execution. Your role:
- Help plan the sprint backlog and prioritize stories
- Create remaining Jira Stories/Tasks if not already done
- Identify immediate blockers and dependencies
- Help with sprint planning and team allocation
- Track progress and flag risks`,
        suggestions: [
          { text: 'Plan sprint backlog', chatPrompt: `Help plan the sprint backlog for "${initiativeTitle}". Which stories should go in the next sprint?`, icon: 'Calendar' },
          { text: 'Check Jira completeness', chatPrompt: `Check if all Features and Stories for "${initiativeTitle}" exist in Jira. What's missing?`, icon: 'CheckSquare' },
          { text: 'Identify blockers', chatPrompt: `What are the blockers for starting execution on "${initiativeTitle}"? Any dependencies we need to resolve?`, icon: 'AlertTriangle' },
        ],
      };

    default:
      return { systemPromptAddition: '', suggestions: [] };
  }
}

/**
 * Detects if the user's message is about a specific initiative.
 * Matches against initiative titles, Jira keys, or IDs.
 */
export function detectFocusedInitiative(
  message: string,
  initiatives: any[]
): any | null {
  if (!initiatives || initiatives.length === 0) return null;

  const lowerMsg = message.toLowerCase();

  // Match by Jira key (e.g. "MDATA-123")
  for (const init of initiatives) {
    if (init.jiraKey && lowerMsg.includes(init.jiraKey.toLowerCase())) {
      return init;
    }
  }

  // Match by title (fuzzy — check if significant words from the title appear in the message)
  for (const init of initiatives) {
    const titleWords = init.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3); // skip short words
    if (titleWords.length > 0) {
      const matchCount = titleWords.filter((w: string) => lowerMsg.includes(w)).length;
      if (matchCount >= Math.min(2, titleWords.length)) {
        return init;
      }
    }
  }

  // Match by ID
  for (const init of initiatives) {
    if (lowerMsg.includes(init.id)) {
      return init;
    }
  }

  return null;
}
