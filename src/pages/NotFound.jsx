import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundInline({ kind = 'page', backTo = '/' }) {
  return (
    <div className="wrap grid min-h-[70svh] place-items-center pt-32 text-center">
      <div>
        <p className="eyebrow mb-4 justify-center">404</p>
        <h1 className="display-face text-mega">Not here.</h1>
        <p className="mx-auto mt-5 max-w-md text-mute">
          This {kind} doesn’t exist, was moved, or isn’t published yet.
        </p>
        <div className="mt-9 flex justify-center">
          <Button to={backTo}>Go back</Button>
        </div>
      </div>
    </div>
  )
}

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[100svh] place-items-center text-center">
      <div>
        <p className="display-face text-display leading-none text-line/10">404</p>
        <h1 className="display-face -mt-6 text-mega md:-mt-10">Lost the thread.</h1>
        <p className="mx-auto mt-5 max-w-md text-mute">
          The page you’re after doesn’t exist. Let’s get you back to building.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Button to="/">Home</Button>
          <Link
            to="/opportunities"
            className="grid h-12 place-items-center rounded-full border border-line/20 px-6 text-bone hover:border-line/40"
          >
            Browse opportunities
          </Link>
        </div>
      </div>
    </div>
  )
}
