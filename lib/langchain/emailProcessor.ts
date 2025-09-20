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

export const emailAnalysisChain = async (emailContent: string): Promise<EmailAnalysis> => {
  try {
    // 1. Define the LLM
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o",
      temperature: 0.0,
    });

    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];

    // 2. Define the Prompt
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
    `);

    // 3. Define JSON schema
    const extractionFunctionSchema: ExtractionFunctionSchema = {
      name: "email_task_extractor",
      description: "Extracts tasks, deadlines, and interviews from an email, filtering out past due items.",
      parameters: {
        type: "object",
        properties: {
          is_actionable: {
            type: "boolean",
            description: "True if email contains actionable items with current/future deadlines, else false.",
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title." },
                priority: { type: "number", description: "Priority: 1 (Low) to 4 (Urgent)." },
                deadline: { type: "string", description: "ISO date or null." },
                task_type: { 
                  type: "string", 
                  enum: ["interview", "meeting", "assignment", "general"], 
                  description: "Type of task." 
                },
                company: { type: "string", description: "Company name (for interviews)." },
                role: { type: "string", description: "Role (for interviews)." },
                details: { type: "string", description: "Task details." },
                links: { 
                  type: "array", 
                  items: { type: "string" }, 
                  description: "Relevant URLs." 
                },
              },
              required: ["title", "priority", "task_type", "details"],
            },
          },
        },
        required: ["is_actionable", "tasks"],
      },
    };

    // 4. Create processing chain
    const chain = promptTemplate
      .pipe(llm.bind({
        functions: [extractionFunctionSchema],
        function_call: { name: "email_task_extractor" },
      }))
      .pipe(new JsonOutputFunctionsParser());

    // 5. Invoke the chain
    const result = await chain.invoke({ 
      email_content: emailContent,
      current_date: currentDateStr
    });
    
    const processedResult = result as EmailAnalysis;
    
    // 6. Post-process tasks
    if (processedResult.tasks) {
      processedResult.tasks = processedResult.tasks.filter(task => {
        if (!task.deadline) return true;
        
        const taskDeadline = new Date(task.deadline);
        const isValidDate = !isNaN(taskDeadline.getTime());
        const isFutureOrToday = taskDeadline >= new Date(currentDateStr);
        
        if (!isValidDate) {
          logger.warn('Invalid deadline format', { deadline: task.deadline, title: task.title });
          return false;
        }
        
        if (!isFutureOrToday) {
          return false;
        }
        
        if (task.priority < 1) task.priority = 1;
        if (task.priority > 4) task.priority = 4;
        
        return true;
      });
      
      processedResult.is_actionable = processedResult.tasks.length > 0;
    }
    
    logger.info('Email analysis done', { 
      isActionable: processedResult.is_actionable,
      taskCount: processedResult.tasks?.length || 0
    });

    return processedResult;
  } catch (error) {
    logger.error('Email analysis failed', error as Error, { emailContent: emailContent.substring(0, 100) });
    throw new Error('Failed to analyze email content');
  }
};
