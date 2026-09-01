import { createFileRoute } from '@tanstack/react-router'
import { PlannerApp } from '../features/planner/PlannerApp'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return <PlannerApp />
}
