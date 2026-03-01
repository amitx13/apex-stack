import { Button } from "@/components/ui/button"
import { Home } from 'lucide-react'
import { Link } from "react-router-dom"

export const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Sad face */}
        <svg
          className="mx-auto h-24 w-24 text-muted-foreground/30"
          fill="none" viewBox="0 0 24 24"
          stroke="currentColor" aria-hidden="true"
        >
          <path
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        {/* Text */}
        <div>
          <h1 className="text-8xl font-extrabold text-foreground">404</h1>
          <p className="text-xl font-semibold text-foreground mt-2">Page not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Oops! The page you're looking for doesn't exist or was moved.
          </p>
        </div>

        {/* Action */}
        <Button asChild className="h-10 px-6">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>

      </div>
    </div>
  )
}
