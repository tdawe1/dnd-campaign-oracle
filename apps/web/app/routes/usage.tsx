import { createFileRoute } from '@tanstack/react-router'
import { UsageView } from '../../components/views/UsageView'

export const Route = createFileRoute('/usage')({
  component: UsagePage,
})

function UsagePage() {
  return <UsageView />
}
