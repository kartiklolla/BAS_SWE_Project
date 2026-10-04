import { Link } from 'react-router-dom';
import { Sparkle } from '../components/Status';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-10 text-center">
      <Sparkle className="mx-auto h-10 w-10 text-lagoon-400" />
      <p className="eyebrow mt-3">Oh dear</p>
      <h1 className="text-4xl font-semibold">Lost in the stacks</h1>
      <p className="mt-3 text-ink-muted">This page wandered off. Let's get you back to the books.</p>
      <Link to="/" className="btn-primary mt-6">Back to the shelves</Link>
    </div>
  );
}
