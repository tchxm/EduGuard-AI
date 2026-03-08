import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-400 to-secondary">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-white">EduGuard AI</div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Intelligent Attendance System Powered by AI
        </h1>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Revolutionize your classroom with AI-powered face recognition, real-time attendance tracking, and comprehensive reporting.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" variant="primary">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/#features">
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🔐"
              title="Face Recognition"
              description="AI-powered face detection for quick and accurate attendance marking"
            />
            <FeatureCard
              icon="📊"
              title="Real-time Reports"
              description="Instant analytics and insights into attendance patterns and trends"
            />
            <FeatureCard
              icon="📱"
              title="Multi-platform"
              description="Works seamlessly on desktop, tablet, and mobile devices"
            />
            <FeatureCard
              icon="🔔"
              title="Smart Notifications"
              description="Automated alerts for absences and important attendance events"
            />
            <FeatureCard
              icon="🎓"
              title="Student Management"
              description="Comprehensive student enrollment and tracking system"
            />
            <FeatureCard
              icon="🔒"
              title="Secure & Private"
              description="Enterprise-grade security with role-based access control"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your attendance system?
          </h2>
          <p className="text-blue-100 mb-8">
            Join thousands of educators using EduGuard AI
          </p>
          <Link href="/register">
            <Button size="lg" variant="primary">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted">
          <p>&copy; 2024 EduGuard AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 border border-border rounded-lg hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  );
}
