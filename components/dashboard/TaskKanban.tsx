'use client';

import { useState, useEffect } from 'react';
import { Task } from '@prisma/client';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';

interface TaskKanbanProps {
  initialTasks: Task[];
}

type Columns = {
  [key: string]: {
    name: string;
    items: Task[];
  };
};

export function TaskKanban({ initialTasks }: TaskKanbanProps) {
  const [columns, setColumns] = useState<Columns>({});

  useEffect(() => {
    const todo = initialTasks.filter((task) => task.status === 'todo');
    const inProgress = initialTasks.filter((task) => task.status === 'inProgress');
    const done = initialTasks.filter((task) => task.status === 'done');

    setColumns({
      todo: { name: 'To Do', items: todo },
      inProgress: { name: 'In Progress', items: inProgress },
      done: { name: 'Done', items: done },
    });
  }, [initialTasks]);

  const onDragEnd: OnDragEndResponder = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceItems = [...sourceColumn.items];
    const destItems = [...destColumn.items];
    const [removed] = sourceItems.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
        // Moving within the same column
        sourceItems.splice(destination.index, 0, removed);
        setColumns({
            ...columns,
            [source.droppableId]: { ...sourceColumn, items: sourceItems },
        });
    } else {
        // Moving to a different column
        destItems.splice(destination.index, 0, removed);
        setColumns({
            ...columns,
            [source.droppableId]: { ...sourceColumn, items: sourceItems },
            [destination.droppableId]: { ...destColumn, items: destItems },
        });
    }

    // Persist the status change to the database
    fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destination.droppableId }),
    }).catch(err => console.error("Failed to update task status:", err));
  };


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(columns).map(([columnId, column]) => (
          <Droppable key={columnId} droppableId={columnId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`bg-[#1C1C1C] p-4 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-gray-800' : ''}`}
              >
                <h3 className="font-semibold mb-4 text-gray-300">{column.name}</h3>
                {column.items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskCard task={item} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}