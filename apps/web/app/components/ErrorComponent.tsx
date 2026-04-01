import { useRouter } from '@tanstack/react-router'
import { Button } from '../../components/ui/Button'

export function ErrorComponent({ error }: { error: Error }) {
    const router = useRouter()

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-500">Something went wrong!</h2>
            <p className="text-neutral-400 max-w-md">{error.message}</p>
            <Button onClick={() => router.invalidate()}>Try Again</Button>
        </div>
    )
}
