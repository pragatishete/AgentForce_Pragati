from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import engine, SessionLocal, Base
from models import User
from schemas import SignupSchema, LoginSchema
from utils import extract_resume_info, generate_cover_letter, generate_and_parse_mcqs
from fastapi.responses import FileResponse
from typing import List
from fpdf import FPDF
import os
import PyPDF2 as pdf
from pathlib import Path
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser, ResponseSchema, StructuredOutputParser
from graph import run_resume_ats_workflow, parse_resume_data, create_resume_pdf, clean_text_for_pdf
from fastapi.responses import StreamingResponse
from typing import List
import logging
from io import BytesIO

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the base directory and load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

# Initialize FastAPI app
app = FastAPI()

# Allow CORS for Next.js frontend
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the database tables
Base.metadata.create_all(bind=engine)

# For password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Resume evaluation models and setup
class ResumeEvaluation(BaseModel):
    mistakes: List[str] = Field(description="List of formatting, content, or structural issues")
    missing_keywords: List[str] = Field(description="Keywords from job description missing from resume")
    jd_match: int = Field(description="Numerical percentage (0-100) based on overall match")
    suggestions: List[str] = Field(description="Detailed Improvement suggestions")

parser = PydanticOutputParser(pydantic_object=ResumeEvaluation)

# Initialize LangChain components
template = """Act as an expert ATS (Applicant Tracking System) and professional resume reviewer. Your task is to analyze the job description and resume provided below.

Job Description:
{job_description}

Resume Text:
{resume_text}

{format_instructions}

{{"Mistakes": ["List each formatting, content, or structural issue"],
"MissingKeywords": ["List each important keyword from the job description that is missing from the resume"],
"JD Match": "Numerical percentage (0-100) based on overall match with the job description",
"Suggestions": ["First specific improvement suggestion",
"Second specific improvement suggestion",
"Add more specific, actionable suggestions here"]}}

Important guidelines:
1. List each suggestion as a separate item in the Suggestions array
2. Make each suggestion specific and actionable
3. Include at least 3-5 detailed suggestions for improvement
4. List all important missing keywords
5. Ensure suggestions are clear and implementable
6. List all the mistakes as a separate item 

Ensure the response is in valid JSON format with all sections properly formatted as arrays."""

prompt = ChatPromptTemplate.from_template(template=template)
model = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=GOOGLE_API_KEY,
    temperature=0
)

# Utility functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def check_email_exists(db: Session, email: str) -> bool:
    return db.query(User).filter(User.email == email).first() is not None

def input_pdf_text(uploaded_file: UploadFile) -> str:
    try:
        reader = pdf.PdfReader(uploaded_file.file)
        text = ""
        for page in range(len(reader.pages)):
            text += reader.pages[page].extract_text()
        return ' '.join(text.split())
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")

# API Routes
@app.get("/")
async def root():
    return {"message": "Welcome to the Resume Analyzer API. Visit /docs for API documentation."}

@app.post("/signup")
async def signup(user: SignupSchema, db: Session = Depends(get_db)):
    if check_email_exists(db, user.email):
        raise HTTPException(status_code=400, detail="Email already exists.")
    
    hashed_password = hash_password(user.password)
    new_user = User(email=user.email, password=hashed_password, phone_number=user.phone_number)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/login")
async def login(user: LoginSchema, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    return {"message": "Login successful"}

@app.post("/cover-letter/")
async def create_cover_letter(
    resume: UploadFile = File(...), 
    job_role: str = Form(...), 
    company_name: str = Form(...), 
    job_description: str = Form(...)
):
    resume_path = f"temp_{resume.filename}"
    with open(resume_path, "wb") as buffer:
        buffer.write(await resume.read())

    name, email, address = extract_resume_info(resume_path)
    cover_letter = generate_cover_letter(job_role, company_name, job_description, resume_path)

    os.remove(resume_path)

    return {
        "name": name,
        "email": email,
        "address": address,
        "cover_letter": cover_letter
    }

@app.post("/interview-prep/")
async def interview_prep(
    job_description: str = Form(...), 
    job_role: str = Form(...), 
    experience_level: str = Form(...)
):
    try:
        mcqs = generate_and_parse_mcqs(job_description, job_role, experience_level)
        return {"questions": mcqs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Pydantic model with EmailStr for validation
class ResumeInput(BaseModel):
    name: str
    email: EmailStr
    linkedin: str
    github: str
    education: str
    experience: List[str]
    projects: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "linkedin": "https://linkedin.com/in/johndoe",
                "github": "https://github.com/johndoe",
                "education": "Bachelor's in Computer Science",
                "experience": ["Software Engineer at Company A", "Developer at Company B"],
                "projects": ["Project A description", "Project B description"]
            }
        }

@app.post("/generate_resume/")
async def generate_resume(resume_input: ResumeInput):
    logger.info(f"Received request with data: {resume_input}")
    
    try:
        # Collect resume data as formatted string
        input_data_str = (
            f"Name: {resume_input.name}\n"
            f"Email: {resume_input.email}\n"
            f"LinkedIn: {resume_input.linkedin}\n"
            f"GitHub: {resume_input.github}\n"
            f"Education: {resume_input.education}\n"
            f"Experience:\n" + "\n".join([f"- {exp}" for exp in resume_input.experience]) + "\n"
            f"Projects:\n" + "\n".join([f"- {proj}" for proj in resume_input.projects])
        )

        # Run ATS workflow and generate resume data
        result = run_resume_ats_workflow(input_data_str)
        if not result or "final_result" not in result or not result["final_result"]:
            logger.error("Failed to generate resume: Workflow returned None or no final result")
            raise HTTPException(status_code=500, detail="Failed to generate resume")

        # Parse the result and create PDF in-memory
        text = clean_text_for_pdf(result["final_result"])
        parsed_data = parse_resume_data(text)
        
        # Use BytesIO as an in-memory buffer for the PDF
        pdf_buffer = BytesIO()
        create_resume_pdf(pdf_buffer, parsed_data)
        pdf_buffer.seek(0)
        
        # Return a response with the PDF for download
        response = StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=resume_{parsed_data['name'].replace(' ', '_').lower()}.pdf"
            }
        )
        logger.info("Successfully generated resume")
        return response

    except Exception as e:
        logger.error(f"Error generating resume: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/resume-checker")
async def evaluate_resume(job_description: str = Form(...), resume: UploadFile = File(...)):
    try:
        if not resume.filename.endswith('.pdf'):
            return {"error": "Please upload a PDF file"}

        resume_text = input_pdf_text(resume)
        messages = prompt.format_messages(
            job_description=job_description,
            resume_text=resume_text,
            format_instructions=parser.get_format_instructions()
        )
        
        response =  model.invoke(input = messages)
        
        try:
            parsed_response = parser.parse(response.content)
            return {
                "Mistakes": parsed_response.mistakes,
                "MissingKeywords": parsed_response.missing_keywords,
                "JD Match": parsed_response.jd_match,
                "Suggestions": parsed_response.suggestions,
            }
        except Exception as e:
            return {"error": str(e)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Additional utility function for cleaning up
# @app.on_event("shutdown")
# def cleanup_temp_files():