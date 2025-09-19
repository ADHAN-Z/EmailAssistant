import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { logger } from '../logger';
import type { Question } from '../../types';

interface InterviewQuestionSchema {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: {
      questions: {
        type: string;
        items: {
          type: string;
          properties: {
            type: {
              type: string;
              enum: string[];
              description: string;
            };
            question: {
              type: string;
              description: string;
            };
          };
          required: string[];
        };
      };
    };
    required: string[];
  };
}

interface InterviewQuestionResult {
  questions: Question[];
}

/**
 * Generates tailored interview questions using LangChain.
 * @param company The company name.
 * @param role The job role.
 * @param interviewType The type of interview (e.g., 'technical', 'behavioral').
 * @returns A promise that resolves to an array of question objects.
 */
export const generateInterviewQuestions = async (
  company: string, 
  role: string, 
  interviewType: string = 'technical'
): Promise<Question[]> => {
  try {
    logger.info('Generating interview questions', { company, role, interviewType });

    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o",
      temperature: 0.5, // A bit more creative for question generation
    });

    const promptTemplate = PromptTemplate.fromTemplate(`
      You are an expert career coach. Generate 5 high-quality, tailored interview questions for the following scenario:

      Company: {company}
      Role: {role}
      Interview Type: {interview_type}

      Include a mix of behavioral, technical, and company-specific questions relevant to the role. For example, for a "Software Engineer" role, include a coding challenge idea or a system design question.
    `);

    const extractionFunctionSchema: InterviewQuestionSchema = {
      name: "interview_question_generator",
      description: "Generates tailored interview questions.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["behavioral", "technical", "company-specific"],
                  description: "The category of the question.",
                },
                question: {
                  type: "string",
                  description: "The interview question.",
                },
              },
              required: ["type", "question"],
            },
          },
        },
        required: ["questions"],
      },
    };

    const chain = promptTemplate
      .pipe(llm.bind({
        functions: [extractionFunctionSchema],
        function_call: { name: "interview_question_generator" },
      }))
      .pipe(new JsonOutputFunctionsParser());

    logger.info(`Generating questions for ${role} at ${company}...`);
    const result = await chain.invoke({
      company,
      role,
      interview_type: interviewType,
    }) as InterviewQuestionResult;

    const questions = result.questions || [];
    logger.info('Interview questions generated successfully', { 
      questionCount: questions.length,
      company,
      role 
    });

    return questions;
  } catch (error) {
    logger.error('Failed to generate interview questions', error as Error, { 
      company, 
      role, 
      interviewType 
    });
    throw new Error('Failed to generate interview questions');
  }
};

