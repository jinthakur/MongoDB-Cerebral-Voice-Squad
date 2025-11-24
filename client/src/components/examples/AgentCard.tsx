import AgentCard from '../AgentCard'
import { Compass, Database, Palette, Shield } from 'lucide-react'

export default function AgentCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      <AgentCard
        agentType="architect"
        name="Architect Agent"
        role="System Design & Architecture"
        icon={Compass}
        message="I'll use a sidebar layout with protected routes and implement a clean component hierarchy."
        status="complete"
        audioUrl="https://example.com/audio"
      />
      
      <AgentCard
        agentType="backend"
        name="Backend Agent"
        role="API & Database Design"
        icon={Database}
        message="I'll create JWT auth endpoints and a users table with session management."
        status="speaking"
        audioUrl="https://example.com/audio"
      />
      
      <AgentCard
        agentType="frontend"
        name="Frontend Agent"
        role="UI/UX Implementation"
        icon={Palette}
        status="thinking"
      />
      
      <AgentCard
        agentType="qa"
        name="QA Agent"
        role="Testing & Quality Assurance"
        icon={Shield}
        status="idle"
      />
    </div>
  )
}
