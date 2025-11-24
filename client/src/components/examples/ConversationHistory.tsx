import ConversationHistory from '../ConversationHistory'
import { useState } from 'react'

const mockConversations = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 3600000),
    command: 'Build a user dashboard with authentication',
    status: 'completed' as const,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 7200000),
    command: 'Create a REST API for blog posts with CRUD operations',
    status: 'completed' as const,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 10800000),
    command: 'Implement Stripe payment integration',
    status: 'in-progress' as const,
  },
];

export default function ConversationHistoryExample() {
  const [activeId, setActiveId] = useState('1');

  return (
    <div className="w-64 p-4">
      <ConversationHistory
        conversations={mockConversations}
        onSelectConversation={setActiveId}
        activeId={activeId}
      />
    </div>
  )
}
