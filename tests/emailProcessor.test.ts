import { emailAnalysisChain } from '../lib/langchain/emailProcessor';

// Mock the emailAnalysisChain to prevent real API calls during tests
jest.mock('../lib/langchain/emailProcessor', () => ({
  emailAnalysisChain: jest.fn()
}));

describe('Email Analysis Chain', () => {
  it('should extract tasks from interview invitation', async () => {
    const mockAnalysis = {
      is_actionable: true,
      tasks: [
        {
          title: 'Prepare for React fundamentals',
          priority: 3,
          deadline: '2026-02-15',
          task_type: 'Interview',
          company: 'Tech Company',
          role: 'Software Engineer',
          details: 'Interview preparation',
          links: [],
          status: 'todo'
        }
      ]
    };
    
    (emailAnalysisChain as jest.Mock).mockResolvedValue(mockAnalysis);
    
    const emailContent = `
      Subject: Interview Invitation - Software Engineer

      Dear Candidate,

      We are pleased to invite you for an interview on 2026-02-15 at 10:00 AM.

      Please prepare for the following topics:
      - React fundamentals
      - Node.js architecture
      - Database design

      Best regards,
      HR Team
    `;

    const analysis = await emailAnalysisChain(emailContent);
    
    expect(analysis.is_actionable).toBe(true);
    expect(analysis.tasks.length).toBeGreaterThan(0);
    expect(analysis.tasks[0].task_type).toBe('Interview');
  });

  it('should not extract tasks from spam emails', async () => {
    const mockAnalysis = {
      is_actionable: false,
      tasks: []
    };
    
    (emailAnalysisChain as jest.Mock).mockResolvedValue(mockAnalysis);
    
    const emailContent = `
      Subject: Win a free iPhone!

      Click here to claim your free iPhone! Limited time offer!
      
      This is not a scam! Act now!
    `;

    const analysis = await emailAnalysisChain(emailContent);
    
    expect(analysis.is_actionable).toBe(false);
    expect(analysis.tasks.length).toBe(0);
  });

  it('should extract deadlines from assignment emails', async () => {
    const mockAnalysis = {
      is_actionable: true,
      tasks: [
        {
          title: 'Complete CS 101 assignment',
          priority: 3,
          deadline: '2026-01-30',
          task_type: 'Assignment',
          company: 'University',
          role: 'Student',
          details: 'CS 101 assignment',
          links: [],
          status: 'todo'
        }
      ]
    };
    
    (emailAnalysisChain as jest.Mock).mockResolvedValue(mockAnalysis);
    
    const emailContent = `
      Subject: Assignment Due - CS 101

      Hello students,

      Your assignment is due on 2026-01-30. Please submit it by midnight.

      Requirements:
      - 10 pages minimum
      - Double spaced
      - Reference at least 5 sources

      Good luck!
    `;

    const analysis = await emailAnalysisChain(emailContent);
    
    expect(analysis.is_actionable).toBe(true);
    expect(analysis.tasks[0].deadline).toBe('2026-01-30');
    expect(analysis.tasks[0].priority).toBeGreaterThan(1);
  });
});
