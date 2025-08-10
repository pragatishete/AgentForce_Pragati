'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResumeFormData {
  name: string;
  email: string;
  linkedin: string;
  github: string;
  education: string;
  experience: string[];
  projects: string[];
}

export default function CreateResumePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ResumeFormData>({
    name: '',
    email: '',
    linkedin: '',
    github: '',
    education: '',
    experience: [''],
    projects: ['']
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof ResumeFormData
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleArrayInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    field: 'experience' | 'projects',
    index: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? e.target.value : item))
    }));
  };

  const addExperienceField = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, '']
    }));
  };

  const addProjectField = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, '']
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
  
    try {
      if (!formData.name || !formData.email || !formData.education) {
        throw new Error('Please fill in all required fields (Name, Email, and Education)');
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
  
      const formattedData = {
        ...formData,
        experience: formData.experience.filter(exp => exp.trim() !== ''),
        projects: formData.projects.filter(proj => proj.trim() !== '')
      };
  
      const response = await fetch('http://localhost:8000/generate_resume/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to generate resume: ${response.statusText}`);
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${formData.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  
      setSuccess('Resume generated successfully!');
      // Removing router.push to prevent redirecting
      // router.push('/dashboard'); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Create Your Resume</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.name}
              onChange={(e) => handleInputChange(e, 'name')}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.email}
              onChange={(e) => handleInputChange(e, 'email')}
            />
          </div>

          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium text-white">LinkedIn</label>
            <input
              type="url"
              id="linkedin"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.linkedin}
              onChange={(e) => handleInputChange(e, 'linkedin')}
            />
          </div>

          <div>
            <label htmlFor="github" className="block text-sm font-medium text-white">GitHub</label>
            <input
              type="url"
              id="github"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.github}
              onChange={(e) => handleInputChange(e, 'github')}
            />
          </div>

          <div>
            <label htmlFor="education" className="block text-sm font-medium text-white">
              Education <span className="text-red-500">*</span>
            </label>
            <textarea
              id="education"
              required
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.education}
              onChange={(e) => handleInputChange(e, 'education')}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-white">Experience</label>
              <button
                type="button"
                onClick={addExperienceField}
                className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Experience
              </button>
            </div>
            {formData.experience.map((exp, index) => (
              <textarea
                key={index}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                value={exp}
                onChange={(e) => handleArrayInputChange(e, 'experience', index)}
                placeholder={`Experience ${index + 1}`}
              />
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-white">Projects</label>
              <button
                type="button"
                onClick={addProjectField}
                className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Project
              </button>
            </div>
            {formData.projects.map((proj, index) => (
              <textarea
                key={index}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                value={proj}
                onChange={(e) => handleArrayInputChange(e, 'projects', index)}
                placeholder={`Project ${index + 1}`}
              />
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 text-white font-bold rounded-md shadow-lg transition ${
                isLoading ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading ? 'Generating...' : 'Generate Resume'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
