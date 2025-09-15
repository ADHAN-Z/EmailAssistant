import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { syncGmailEmails } from '@/lib/gmail';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { emailAnalysisChain } from '@/lib/langchain/emailProcessor'; 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // 1. Fetch emails from Gmail
    const emails = await syncGmailEmails(session.accessToken);
    if (emails.length === 0) {
        return NextResponse.json({ success: true, message: "No new emails to process." });
    }

    let totalTasksCreated = 0;
    const allTasksToCreate = [];

    // 2. Process each email with LangChain
    for (const email of emails) {
      try {
        const analysis = await emailAnalysisChain(email.content);

        if (analysis && analysis.is_actionable) {
          // 3. Prepare tasks for database insertion
          for (const task of analysis.tasks) {
            allTasksToCreate.push({
              title: task.title,
              priority: task.priority,
              deadline: task.deadline ? new Date(task.deadline) : null,
              taskType: task.task_type, // Maps to taskType in schema
              company: task.company,
              role: task.role,
              details: task.details,
              links: task.links || [],
              status: 'todo',
              userId: session.user.id, // <-- Link task to the user
            });
          }
        }
      } catch (e) {
         console.error(`Could not process email ${email.id} with LangChain:`, e);
         // Continue to next email
      }
    }

    // 4. Save all extracted tasks to the database in one go
    if (allTasksToCreate.length > 0) {
        await prisma.task.createMany({
            data: allTasksToCreate,
        });
        totalTasksCreated = allTasksToCreate.length;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete. Created ${totalTasksCreated} new tasks.` 
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to sync emails.' }, { status: 500 });
  }
}