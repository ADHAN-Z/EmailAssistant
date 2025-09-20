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

    // Get current date for comparison
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 2. Define the Prompt with better instructions
    const promptTemplate = PromptTemplate.fromTemplate(`
      Analyze the following email content and extract any actionable tasks, interviews, or deadlines.

      Email Content:
      ---
      {email_content}
      ---

      Current Date: {current_date}

      IMPORTANT INSTRUCTIONS:
      1. If the email is not actionable (e.g., spam, newsletter, notification), return "is_actionable" as false.
      2. ONLY extract tasks with deadlines that are TODAY or in the FUTURE. Do NOT create tasks for past dates.
      3. Use priority scale: 1=Low, 2=Medium, 3=High, 4=Urgent
      4. For interviews: Use company name and role if available
      5. For assignments: Focus on the subject/topic
      6. If no clear deadline is mentioned, you may set deadline to null
      7. Skip any tasks that have already passed based on the current date

      Examples:
      - "Physics test tomorrow" → priority 4 (urgent, due soon)
      - "Project due next week" → priority 3 (high, important deadline)
      - "Meeting next month" → priority 2 (medium, future planning)
      - "General reminder" → priority 1 (low, no urgency)
    `);

    // 3. Define the desired JSON output structure
    const extractionFunctionSchema: ExtractionFunctionSchema = {
      name: "email_task_extractor",
      description: "Extracts tasks, deadlines, and interviews from an email, filtering out past due items.",
      parameters: {
        type: "object",
        properties: {
          is_actionable: {
            type: "boolean",
            description: "Set to true if the email contains any actionable items with future or current deadlines, otherwise false.",
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "A concise title for the task." },
                priority: { type: "number", description: "A priority score: 1 (Low), 2 (Medium), 3 (High), 4 (Urgent)." },
                deadline: { type: "string", description: "The deadline in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ), or null if none. Must be current date or future." },
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
    const result = await chain.invoke({ 
      email_content: emailContent,
      current_date: currentDateStr
    });
    
    // 6. Post-process to ensure data quality
    const processedResult = result as EmailAnalysis;
    
    // Filter out any tasks with past deadlines (double-check)
    if (processedResult.tasks) {
      processedResult.tasks = processedResult.tasks.filter(task => {
        if (!task.deadline) return true; // Keep tasks without deadlines
        
        const taskDeadline = new Date(task.deadline);
        const isValidDate = !isNaN(taskDeadline.getTime());
        const isFutureOrToday = taskDeadline >= new Date(currentDateStr);
        
        if (!isValidDate) {
          logger.warn('Invalid deadline format detected', { deadline: task.deadline, title: task.title });
          return false;
        }
        
        if (!isFutureOrToday) {
          logger.info('Filtering out past due task', { 
            title: task.title, 
            deadline: task.deadline,
            currentDate: currentDateStr 
          });
          return false;
        }
        
        // Ensure priority is within valid range (1-4)
        if (task.priority < 1) task.priority = 1;
        if (task.priority > 4) task.priority = 4;
        
        return true;
      });
      
      // Update is_actionable based on filtered tasks
      processedResult.is_actionable = processedResult.tasks.length > 0;
    }
    
    logger.info('Email analysis completed', { 
      isActionable: processedResult.is_actionable,
      taskCount: processedResult.tasks?.length || 0
    });

    return processedResult;
  } catch (error) {
    logger.error('Email analysis failed', error as Error, { emailContent: emailContent.substring(0, 100) });
    throw new Error('Failed to analyze email content');
  }
};