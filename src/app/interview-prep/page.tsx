'use client';

import { useState } from 'react';

type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
};

export default function InterviewPrepPage() {
  const [formData, setFormData] = useState({
    job_description: '',
    job_role: '',
    experience_level: 'beginner',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false); // State to manage answer visibility

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const formBody = new URLSearchParams(formData as any).toString(); // Convert to URLSearchParams

    try {
      const response = await fetch('http://localhost:8000/interview-prep/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Use form-urlencoded
        },
        body: formBody,
      });

      if (!response.ok) {
        const errorResponse = await response.json(); // Get error message from response
        throw new Error(errorResponse.detail || 'Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setCurrentQuestion(0);
      setScore(0);
      setShowResults(false);
      setShowAnswer(false); // Reset show answer state
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleAnswer = (selectedAnswer: number) => {
    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setShowAnswer(false); // Reset answer visibility for the next question
    } else {
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setShowResults(false);
    setScore(0);
    setShowAnswer(false); // Reset answer visibility on quiz reset
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Interview Preparation</h2>
        {questions.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-white">Job Description</label>
              <textarea
                id="jobDescription"
                name="job_description"
                rows={5}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black"
                value={formData.job_description}
                onChange={handleChange}
              ></textarea>
            </div>
            <div>
              <label htmlFor="jobRole" className="block text-sm font-medium text-white">Job Role</label>
              <input
                type="text"
                id="jobRole"
                name="job_role"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black"
                value={formData.job_role}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-white">Experience Level</label>
              <select
                id="level"
                name="experience_level"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black"
                value={formData.experience_level}
                onChange={handleChange}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Questions
              </button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </form>
        ) : showResults ? (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Quiz Results</h3>
            <p className="text-xl text-white mb-4">You scored {score} out of {questions.length}</p>
            <button
              onClick={resetQuiz}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            {/* MCQ Question Text */}
            <h3 className="text-lg font-bold text-yellow-300 mb-4">{questions[currentQuestion].text}</h3> {/* Question color */}

            {/* Answer Options */}
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="block w-full text-left px-4 py-2 mb-2 bg-gray-200 hover:bg-gray-300 rounded-md text-blue-600" // Changed text color to blue
              >
                {option}
              </button>
            ))}

            {/* Show Answer Button */}
            <button
              onClick={() => setShowAnswer(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Show Answer
            </button>

            {/* Correct Answer Display */}
            {showAnswer && (
              <div className="mt-4 text-white">
                Correct Answer: {questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
