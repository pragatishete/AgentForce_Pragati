import re
from pypdf import PdfReader
from datetime import date
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
# from langchain.chains. import LLMChain
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List
import re
import json
from dotenv import load_dotenv
import os
import logging.handlers
# Get API key
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
# Initialize the Google GenAI API with your API key
# gemini_api_key = "AIzaSyA7I6py7FzVOAejYLJ5Rr5kV6Hb0W4qevA"

# Initialize the Gemini model
llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-pro", api_key=GOOGLE_API_KEY)
# Function to extract information from the resume
def extract_resume_info(resume_path):
    reader = PdfReader(resume_path)
    resume_text = ""
    for page in reader.pages:
        resume_text += page.extract_text() or ""

    # Use regex to extract name, email, phone, and address
    name = re.search(r"^(.+)$", resume_text, re.MULTILINE)
    email = re.search(r"Email:\s*(\S+)", resume_text)
    address = re.search(r"^(.*?)(?=Phone:)", resume_text, re.MULTILINE)

    return (
        name.group(1).strip() if name else "Unknown",
        email.group(1).strip() if email else "Unknown",
        address.group(0).strip() if address else "Unknown",
    )

# Function to generate the cover letter
def generate_cover_letter(job_role, company_name, job_description, resume_path):
    name, email, address = extract_resume_info(resume_path)

    cover_letter_template = f"""
    {name}
    {address}
    {email + "@gmail.com"}
    {date.today()}

    Hiring Manager
    {company_name}

    Dear Hiring Manager,

    I am writing to express my enthusiastic interest in the {job_role} position at {company_name}. With my proven experience in software development and a strong passion for creating innovative applications, I am confident that I possess the skills and dedication to excel in this role.

    {job_description}

    I believe my skills align with your needs, and I look forward to discussing how I can contribute to your team.

    Thank you for your time and consideration.

    Sincerely,
    {name}
    """

    return cover_letter_template

# Define the prompt template for generating MCQs
prompt_template = """
You are an expert interviewer creating technical MCQs for a candidate applying for the role of {job_role}.
The candidate's experience level is {experience_level}, and here is the job description: {job_description}.

Generate 15 MCQs relevant to this role and experience level. 
Each MCQ should have:
1. A question
2. Four options (A, B, C, D)
3. A correct answer

Example Format:
Q1. [Question]
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Answer: [Correct Option]
"""

# Create a LangChain prompt template instance
template = PromptTemplate(
    input_variables=["job_role", "job_description", "experience_level"],
    template=prompt_template
)

# Function to generate MCQs using LangChain and GenAI
def generate_mcqs(job_role, job_description, experience_level):
    # Prepare the chain
    # llm_chain = LLMChain(
    #     llm=llm,  # Uses Google's GenAI
    #     prompt=template
    # )

    formatted_prompt = prompt_template.format(
        job_role=job_role,
        job_description=job_description,
        experience_level=experience_level
    )

    print(formatted_prompt)
    result = llm.invoke(input =  formatted_prompt)
    print(result)

    # Run the chain with user inputs
    # result = llm_chain.run({
    #     "job_role": job_role,
    #     "job_description": job_description,
    #     "experience_level": experience_level
    # })

    return result.content

class MCQOption(BaseModel):
    text: str
    options: List[str]
    correctAnswer: int

class MCQList(BaseModel):
    questions: List[MCQOption]

def clean_text(text: str) -> str:
    # Remove markdown formatting
    text = re.sub(r'\*\*', '', text)
    # Remove backticks and code formatting
    text = text.replace('`', '')
    # Clean quotes and backslashes
    text = text.replace('\\"', '"')
    text = text.replace('\\', '')
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text.strip()

def parse_mcqs(raw_output: str) -> List[dict]:
    # Split the text into individual questions
    questions = re.split(r'Q\d+\.', raw_output)[1:]
    
    parsed_questions = []
    
    for question in questions:
        # Extract the question text
        question_text = question.split('A)')[0].strip()
        question_text = clean_text(question_text)
        
        # Extract options
        options = []
        option_pattern = r'[A-D]\)(.*?)(?=[A-D]\)|Answer:|$)'
        matches = re.finditer(option_pattern, question, re.DOTALL)
        
        for match in matches:
            option_text = clean_text(match.group(1))
            options.append(option_text)
            
        # Extract correct answer
        answer_match = re.search(r'Answer:\s*([A-D])', question)
        if answer_match:
            correct_answer = ord(answer_match.group(1)) - ord('A')
        else:
            correct_answer = 0
            
        parsed_question = {
            "text": question_text,
            "options": options,
            "correctAnswer": correct_answer
        }
        
        parsed_questions.append(parsed_question)
    
    return parsed_questions
def clean_mcq_json(raw_json: dict) -> List[dict]:
    # Get the questions string from the JSON
    questions_str = raw_json.get("questions", "[]")
    
    # Parse the string into a Python object
    try:
        # First parse the string into a list of dictionaries
        questions = json.loads(questions_str)
        
        # Clean the list - no need for JSON encoding/escaping
        cleaned_questions = []
        for q in questions:
            cleaned_q = {
                "text": q["text"],
                "options": q["options"],
                "correctAnswer": q["correctAnswer"]
            }
            cleaned_questions.append(cleaned_q)
        
        return cleaned_questions
        
    except json.JSONDecodeError:
        return []
# Modified generate_mcqs function to include parsing
# def generate_and_parse_mcqs(job_role, job_description, experience_level):
#     # Your existing LLMChain setup here
#     raw_mcqs = generate_mcqs(job_role, job_description, experience_level)
    
#     # Parse the raw output into the desired format
#     parsed_mcqs = parse_mcqs(raw_mcqs)
    
#     # Convert to JSON string without pretty printing and escape characters
#     return json.dumps(parsed_mcqs, ensure_ascii=False, separators=(',', ':'))

def generate_and_parse_mcqs(job_description, job_role,  experience_level):
    # Get raw MCQs
    raw_mcqs = generate_mcqs(job_role, job_description, experience_level)
    
    # If the output is already a dictionary, clean it directly
    if isinstance(raw_mcqs, dict):
        return clean_mcq_json(raw_mcqs)
    
    # If it's a string, try to parse it as JSON first
    try:
        json_data = json.loads(raw_mcqs)
        return clean_mcq_json(json_data)
    except json.JSONDecodeError:
        # If it's not valid JSON, use the original parser
        return parse_mcqs(raw_mcqs)