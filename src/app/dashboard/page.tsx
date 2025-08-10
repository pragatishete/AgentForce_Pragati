'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, CheckSquare, PenTool, Users, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    console.log('User logged out')
    router.push('/')
  }

  const features = [
    { title: 'Create Resume', description: 'Build a professional resume tailored to your career goals.', href: '/create-resume', icon: FileText },
    { title: 'Resume Checker', description: 'Get instant feedback and suggestions to improve your resume.', href: '/resume-checker', icon: CheckSquare },
    { title: 'Cover Letter Generator', description: 'Create compelling cover letters for your job applications.', href: '/cover-letter', icon: PenTool },
    { title: 'Interview Preparation', description: 'Practice with tailored interview questions for your target role.', href: '/interview-prep', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800">
      {/* Navigation */}
      <nav className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">CareerBoost</h1>
          <Button
            variant="ghost"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="
              text-white hover:text-white 
              hover:bg-indigo-600/80 active:bg-indigo-500 focus-visible:bg-indigo-700 
              transition-all duration-300 transform hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2
            "
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto mt-8 px-4 pb-8">
        <h2 className="text-3xl font-bold text-white mb-6">Welcome to Your Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href} passHref>
              <Card className="
                bg-white bg-opacity-10 hover:bg-opacity-20 
                transition-all duration-300 transform hover:scale-105 
                cursor-pointer border-none
              ">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white flex items-center">
                    <feature.icon className="mr-2 h-6 w-6" />
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>

        {/* Logout Confirmation Modal */}
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 bg-white p-6 rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold mb-4 text-gray-800">Confirm Logout</CardTitle>
                <CardDescription className="mb-4 text-gray-600">
                  Are you sure you want to log out?
                </CardDescription>
              </CardHeader>
              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsLogoutConfirmOpen(false)} 
                  className="bg-white text-black border border-gray-400 hover:bg-gray-200 transition-all duration-300"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout} 
                  className="bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                >
                  Logout
                </Button>
              </div>
            </Card>
          </div>
        )}

    </div>
  )
}
