import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Rocket, Target, Zap } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
      <header className="p-6">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-white text-2xl font-bold">CareerBoost</div>
          <div className="space-x-4">
            <Button variant="ghost" className="text-white hover:text-indigo-200">
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="outline" className="border-white hover:bg-white hover:text-purple-900">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
            About CareerBoost
          </h1>
          <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            At CareerBoost, we're revolutionizing career development with cutting-edge AI technology. Our mission is to empower job seekers and professionals to reach their full potential.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
          {[
            { icon: Rocket, title: "Our Mission", description: "To provide innovative tools that streamline the job search process and boost career growth." },
            { icon: Target, title: "Our Vision", description: "A world where every professional has access to personalized, AI-powered career guidance." },
            { icon: Zap, title: "Our Approach", description: "Combining advanced AI algorithms with human expertise to deliver unparalleled career solutions." },
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-white bg-opacity-10 rounded-lg">
              <item.icon className="h-12 w-12 text-indigo-300 mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">{item.title}</h2>
              <p className="text-indigo-200">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Join Us on Your Career Journey</h2>
          <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            Whether you're just starting out or looking to take your career to the next level, CareerBoost is here to support you every step of the way.
          </p>
          <Button size="lg" className="bg-white text-purple-900 hover:bg-indigo-100 transition-all duration-200 transform hover:scale-105">
            <Link href="/signup">Get Started Now</Link>
          </Button>
        </div>
      </main>

      <footer className="bg-purple-900 bg-opacity-50 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-4 md:mb-0">&copy; 2024 CareerBoost. All rights reserved.</div>
          <div className="flex space-x-4">
            <Link href="/privacy" className="text-indigo-200 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-indigo-200 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-indigo-200 hover:text-white transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>

      <Link href="/" className="fixed bottom-4 left-4 text-white hover:text-indigo-200 flex items-center">
        <Button variant="ghost" className="p-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}