import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { logger } from '../logger';
import type { EmailAnalysis } from '../../types';

interface ExtractionFunctionSchema {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: {
      is_actionable: {
        type: string;
        description: string;
      };
      tasks: {
        type: string;
        items: {
          type: string;
          properties: {
            title: { type: string; description: string };
            priority: { type: string; description: string };
            deadline: { type: string; description: string };
            task_type: { 
              type: string; 
              enum: string[]; 
              description: string 
            };
            company: { type: string; description: string };
            role: { type: string; description: string };
            details: { type: string; description: string };
            links: { 
              type: string; 
              items: { type: string }; 
              description: string 
            };
          };
          required: string[];
        };
      };
    };
    required: string[];
  };
}

/**
 * Analyzes email content using LangChain to extract actionable tasks.
 * @param emailContent The raw text content of the email.
 * @returns A promise that resolves to a structured object with extracted tasks.
 */
export const emailAnalysisChain = async (emailContent: string): Promise<EmailAnalysis> => {
  try {
    logger.info('Starting email analysis with LangChain');

    // 1. Define the LLM
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o", // Using a powerful and cost-effective model
      temperature: 0.0,
    });

    // 2. Define the Prompt
    const promptTemplate = PromptTemplate.fromTemplate(`
      Analyze the following email content and extract any actionable tasks, interviews, or deadlines.

      Email Content:
      ---
      {email_content}
      ---

      If the email is not actionable (e.g., spam, newsletter, notification), return "is_actionable" as false.
      Otherwise, extract the tasks into the specified JSON format. Pay close attention to deadlines and context.
      A "Physics Test Preparation" is an "assignment". A meeting confirmation for a job is an "interview".
    `);

    // 3. Define the desired JSON output structure
    const extractionFunctionSchema: ExtractionFunctionSchema = {
      name: "email_task_extractor",
      description: "Extracts tasks, deadlines, and interviews from an email.",
      parameters: {
        type: "object",
        properties: {
          is_actionable: {
            type: "boolean",
            description: "Set to true if the email contains any actionable items, otherwise false.",
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "A concise title for the task." },
                priority: { type: "number", description: "A priority score from 1 (Low) to 10 (Urgent)." },
                deadline: { type: "string", description: "The deadline in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ), or null if none." },
                task_type: { 
                  type: "string", 
                  enum: ["interview", "meeting", "assignment", "general"], 
                  description: "The type of task." 
                },
                company: { type: "string", description: "The company name, if applicable (especially for interviews)." },
                role: { type: "string", description: "The job role, if applicable (especially for interviews)." },
                details: { type: "string", description: "A summary of the task details." },
                links: { 
                  type: "array", 
                  items: { type: "string" }, 
                  description: "Any relevant URLs found in the email." 
                },
              },
              required: ["title", "priority", "task_type", "details"],
            },
          },
        },
        required: ["is_actionable", "tasks"],
      },
    };

    // 4. Create the processing chain
    const chain = promptTemplate
      .pipe(llm.bind({
        functions: [extractionFunctionSchema],
        function_call: { name: "email_task_extractor" },
      }))
      .pipe(new JsonOutputFunctionsParser());

    // 5. Invoke the chain with the email content
    logger.info("Analyzing email with LangChain...");
    const result = await chain.invoke({ email_content: emailContent });
    
    logger.info('Email analysis completed', { 
      isActionable: (result as Record<string, unknown>).is_actionable,
      taskCount: (result as Record<string, unknown>).tasks?.length || 0
    });

    return result as EmailAnalysis;
  } catch (error) {
    logger.error('Email analysis failed', error as Error, { emailContent: emailContent.substring(0, 100) });
    throw new Error('Failed to analyze email content');
  }
};

