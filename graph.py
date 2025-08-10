import logging
from langchain_google_genai import GoogleGenerativeAI
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain.prompts import PromptTemplate
from reportlab.lib.pagesizes import letter, LETTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import  re
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

llm = GoogleGenerativeAI(model="gemini-pro", api_key=GOOGLE_API_KEY)

class State(TypedDict):
    messages: Annotated[Sequence[str], "The messages in the conversation"]
    resume: Annotated[str, "The generated resume"]
    ats_feedback: Annotated[str, "Feedback from the ATS checker"]
    ats_score: Annotated[float, "ATS compatibility score"]
    improvement_strategy: Annotated[str, "Strategy for improving the resume"]
    iterations: Annotated[int, "Number of improvement iterations"]
    final_result: Annotated[str, "The final result of the workflow"]

def get_content(llm_output):
    if isinstance(llm_output, str):
        return llm_output
    elif hasattr(llm_output, 'content'):
        return llm_output.content
    else:
        return str(llm_output)

def resume_builder(state: State) -> State:
    # logger.debug("Entering resume_builder")
    try:
        input_data = state["messages"][0]
        improvement_strategy = state.get("improvement_strategy", "")
        prompt = PromptTemplate.from_template(
            "Create a professional resume based on the following information:\n\n{input_data}\n\n"
            "Improvement strategy (if any):\n{improvement_strategy}\n\n"
            "Generate a well-formatted resume:"
        )
        resume = llm.invoke(prompt.format(input_data=input_data, improvement_strategy=improvement_strategy))
        resume_content = get_content(resume)
        # logger.debug(f"Resume generated: {resume_content[:100]}...")  # Log first 100 characters
        return {
            "messages": state["messages"],
            "resume": resume_content,
            "ats_feedback": state.get("ats_feedback", ""),
            "ats_score": state.get("ats_score", 0.0),
            "improvement_strategy": state.get("improvement_strategy", ""),
            "iterations": state.get("iterations", 0),
            "final_result": ""
        }
    except Exception as e:
        # logger.error(f"Error in resume_builder: {e}")
        return {
            "messages": state["messages"],
            "resume": "Error generating resume",
            "ats_feedback": "",
            "ats_score": 0.0,
            "improvement_strategy": "",
            "iterations": state.get("iterations", 0),
            "final_result": ""
        }

def ats_checker(state: State) -> State:
    # logger.debug("Entering ats_checker")
    try:
        resume = state["resume"]
        prompt = PromptTemplate.from_template(
            "You are an Applicant Tracking System (ATS) checker. Analyze the following resume "
            "and provide feedback on its ATS compatibility, including suggestions for improvement. "
            "Also, provide a percentage match (0-100%) based on how well the resume matches the job requirements:\n\n"
            "Resume:\n{resume}\n\n"
            "Provide your analysis, feedback, and percentage match:"
        )
        feedback = llm.invoke(prompt.format(resume=resume))
        feedback_content = get_content(feedback)
        
        # Extract score using regex
        import re
        score_match = re.search(r'(\d+(?:\.\d+)?)%', feedback_content)
        if score_match:
            score = float(score_match.group(1)) / 100
        else:
            # logger.warning("No percentage found in feedback")
            score = 0.0
        
        # logger.debug(f"ATS Score: {score}")
        return {
            "messages": state["messages"],
            "resume": state["resume"],
            "ats_feedback": feedback_content,
            "ats_score": score,
            "improvement_strategy": state["improvement_strategy"],
            "iterations": state["iterations"],
            "final_result": ""
        }
    except Exception as e:
        # logger.error(f"Error in ats_checker: {e}")
        return {
            "messages": state["messages"],
            "resume": state["resume"],
            "ats_feedback": "Error in ATS checking",
            "ats_score": 0.0,
            "improvement_strategy": state["improvement_strategy"],
            "iterations": state["iterations"],
            "final_result": ""
        }

def decision(state: State):
    # logger.debug(f"Entering decision. ATS Score: {state['ats_score']}, Iterations: {state['iterations']}")
    ats_score = state["ats_score"]
    iterations = state["iterations"]
    if ats_score >= 0.9 or iterations >= 5:
        return "final"
    else:
        return "improvement"

def improvement(state: State) -> State:
    # logger.debug("Entering improvement")
    ats_feedback = state["ats_feedback"]
    prompt = PromptTemplate.from_template(
        "Based on the following ATS feedback, provide a concise strategy to improve the resume:\n\n"
        "ATS Feedback:\n{ats_feedback}\n\n"
        "Improvement strategy:"
    )
    improvement_strategy = llm.invoke(prompt.format(ats_feedback=ats_feedback))
    return {
        "messages": state["messages"],
        "resume": state["resume"],
        "ats_feedback": state["ats_feedback"],
        "ats_score": state["ats_score"],
        "improvement_strategy": get_content(improvement_strategy),
        "iterations": state["iterations"] + 1,
        "final_result": ""
    }

def final(state: State) -> State:
    # logger.debug("Entering final")
    final_resume = state['resume']
    score = state['ats_score']
    iterations = state['iterations']
    ats_feedback = state['ats_feedback']
    final_result = f"Resume achieved an ATS score of {score:.2%} after {iterations} iterations.\n\nResume Content:\n\n{final_resume}\n\nATS Feedback:\n\n{ats_feedback}"
    # logger.info(f"Final result: {final_result[:100]}...")  # Log first 100 characters
    return {
        "messages": state["messages"],
        "resume": state["resume"],
        "ats_feedback": state["ats_feedback"],
        "ats_score": state["ats_score"],
        "improvement_strategy": state["improvement_strategy"],
        "iterations": state["iterations"],
        "final_result": final_result
    }

def run_resume_ats_workflow(input_data: str):
    workflow = StateGraph(State)
    workflow.add_node("resume_builder", resume_builder)
    workflow.add_node("ats_checker", ats_checker)
    workflow.add_node("improvement", improvement)
    workflow.add_node("final", final)
    workflow.add_conditional_edges(
        "ats_checker",
        decision,
        {
            "improvement": "improvement",
            "final": "final"
        }
    )
    workflow.add_edge("resume_builder", "ats_checker")
    workflow.add_edge("improvement", "resume_builder")
    workflow.add_edge("improvement", END)
    workflow.set_entry_point("resume_builder")
    graph = workflow.compile()
    
    try:
        # logger.info("Starting resume generation workflow")
        result = graph.invoke({
            "messages": [input_data],
            "resume": "",
            "ats_feedback": "",
            "ats_score": 0.0,
            "improvement_strategy": "",
            "iterations": 0,
            "final_result": ""
        })
        # logger.info("Workflow completed successfully")
        # print( result["final_result"] )
        return result
        
    except Exception as e:
        # logger.error(f"Error running workflow: {e}")
        return None

# ... (rest of the code remains the same)


def parse_resume_data(result):
    try:
        # Split the cleaned text into lines
        lines = [line for line in result.strip().splitlines() if line.strip()]
        parsed_data = {}

        # Initialize placeholders with default values
        parsed_data.update({
            'name': '',
            'contact_info': '',
            'summary': '',
            'experience': [],
            'education': '',
            'skills': {},
            'projects': [],
            'certifications': [],
            'additional_info': ''
        })

        # Helper function to detect if a line is a section heading
        def is_section(line):
            return any(
                section in line.lower()
                for section in ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'additional']
            )

        # Regular expressions for dynamic parsing
        email_regex = re.compile(r'\S+@\S+')
        phone_regex = re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
        linkedin_regex = re.compile(r'linkedin\.com/in/\S+')
        github_regex = re.compile(r'github\.com/\S+')

        # Capture name and contact info from the first few lines
        contact_info_lines = []
        for i, line in enumerate(lines):
            if email_regex.search(line) or phone_regex.search(line) or linkedin_regex.search(line) or github_regex.search(line):
                contact_info_lines.append(line)
            else:
                parsed_data['name'] = lines[0].strip() if i == 0 else parsed_data['name']
            if len(contact_info_lines) >= 3:
                break
        parsed_data['contact_info'] = ' | '.join(contact_info_lines)

        # Identify section indices dynamically
        section_indices = {}
        for i, line in enumerate(lines):
            if is_section(line):
                section_name = line.lower().strip().split()[0]
                section_indices[section_name] = i

        # Parse Summary
        if 'summary' in section_indices:
            summary_start = section_indices['summary'] + 1
            summary_end = min([v for k, v in section_indices.items() if v > summary_start] + [len(lines)])
            parsed_data['summary'] = ' '.join(lines[summary_start:summary_end]).strip()

        # Parse Experience
        if 'experience' in section_indices:
            exp_start = section_indices['experience'] + 1
            exp_end = min([v for k, v in section_indices.items() if v > exp_start] + [len(lines)])
            current_job = {}
            for line in lines[exp_start:exp_end]:
                if '|' in line:  # Check for job title | company | dates format
                    if current_job:
                        parsed_data['experience'].append(current_job)
                    parts = line.split('|')
                    current_job = {
                        'title': parts[0].strip() if len(parts) > 0 else '',
                        'company': parts[1].strip() if len(parts) > 1 else '',
                        'dates': parts[2].strip() if len(parts) > 2 else '',
                        'duties': []
                    }
                elif line.strip().startswith('-') or line.strip().startswith('•'):
                    if current_job:
                        current_job['duties'].append(line.strip()[1:].strip())
            if current_job:
                parsed_data['experience'].append(current_job)

        # Parse Education
        if 'education' in section_indices:
            edu_start = section_indices['education'] + 1
            edu_end = min([v for k, v in section_indices.items() if v > edu_start] + [len(lines)])
            parsed_data['education'] = ' '.join(lines[edu_start:edu_end]).strip()

        # Parse Skills
        if 'skills' in section_indices:
            skills_start = section_indices['skills'] + 1
            skills_end = min([v for k, v in section_indices.items() if v > skills_start] + [len(lines)])
            for line in lines[skills_start:skills_end]:
                if ':' in line:
                    key, value = line.split(':', 1)
                    parsed_data['skills'][key.strip()] = value.strip()
                else:
                    parsed_data['skills'].setdefault('General', []).append(line.strip())

        # Parse Projects
        if 'projects' in section_indices:
            proj_start = section_indices['projects'] + 1
            current_project = {}
            for line in lines[proj_start:]:
                if ':' in line:
                    if current_project:
                        parsed_data['projects'].append(current_project)
                    parts = line.split(':', 1)
                    current_project = {
                        'name': parts[0].strip(),
                        'description': parts[1].strip() if len(parts) > 1 else ''
                    }
                else:
                    if current_project:
                        current_project['description'] += ' ' + line.strip()
            if current_project:
                parsed_data['projects'].append(current_project)

        # Parse Certifications
        if 'certifications' in section_indices:
            cert_start = section_indices['certifications'] + 1
            cert_end = len(lines)
            parsed_data['certifications'] = [line.strip() for line in lines[cert_start:cert_end] if line.strip()]
        # print(parsed_data)
        return parsed_data

    except Exception as e:
        logging.error(f"Error parsing resume data: {e}")
        return {
            'name': 'Error parsing resume',
            'contact_info': '',
            'summary': 'Error occurred while parsing the resume.',
            'experience': [],
            'education': '',
            'skills': {},
            'projects': [],
            'certifications': [],
            'additional_info': ''
        }

def extract_resume_content(text):
    # Identify the start and end markers
    start_marker = "Resume Content:"
    end_marker = "ATS Feedback:"
    
    # Extract the content between the markers
    start = text.find(start_marker)
    end = text.find(end_marker)
    
    if start != -1 and end != -1:
        resume_content = text[start + len(start_marker):end].strip()
        return resume_content
    else:
        return "Resume content not found."

def create_resume_pdf(file_name, details):
    doc = SimpleDocTemplate(file_name, pagesize=LETTER, rightMargin=72, leftMargin=72, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    # Create custom styles
    styles.add(ParagraphStyle(
        name='NameStyle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=6,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='ContactStyle',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=20,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6,
        textColor='navy'
    ))
    
    styles.add(ParagraphStyle(
        name='BulletPoint',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=20,
        bulletIndent=10,
        spaceBefore=2,
        spaceAfter=2
    ))
    
# Add the missing JobTitle style
    styles.add(ParagraphStyle(
        name='JobTitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=6,
        textColor='black',
        bold=True  # Make the job title bold
    ))
    story = []
    
    # Header section
    story.append(Paragraph(details['name'], styles['NameStyle']))
    story.append(Paragraph(details['contact_info'], styles['ContactStyle']))
    
    # Summary section
    if details['summary']:
        story.append(Paragraph('SUMMARY', styles['SectionHeader']))
        story.append(Paragraph(details['summary'], styles['Normal']))
        story.append(Spacer(1, 12))
    
    # Experience section (empty in your case)
    if details['experience']:
        story.append(Paragraph('PROFESSIONAL EXPERIENCE', styles['SectionHeader']))
        for job in details['experience']:
            # Job title and company line
            job_header = f"{job['title']} | {job['company']}"
            if job.get('location') and job.get('date'):
                job_header += f" | {job['location']} | {job['date']}"
            story.append(Paragraph(job_header, styles['JobTitle']))
            
            # Job duties
            for duty in job['duties']:
                story.append(Paragraph(f"• {duty}", styles['BulletPoint']))
            story.append(Spacer(1, 6))
    
    # Education section
    if details['education']:
        story.append(Paragraph('EDUCATION', styles['SectionHeader']))
        story.append(Paragraph(details['education'], styles['Normal']))
        story.append(Spacer(1, 12))
    
    # Skills section
    if details['skills']:
        story.append(Paragraph('SKILLS', styles['SectionHeader']))
        skills_text = ""
        for skill, value in details['skills'].items():
            if skills_text:
                skills_text += "<br/>"
            skills_text += f"<b>{skill}:</b> {value}"
        story.append(Paragraph(skills_text, styles['Normal']))
        story.append(Spacer(1, 12))
    
    # Projects section
    if details['projects']:
        story.append(Paragraph('PROJECTS', styles['SectionHeader']))
        for project in details['projects']:
            project_text = f"<b>{project['name']}:</b> {project['description']}"
            story.append(Paragraph(project_text, styles['Normal']))
            story.append(Spacer(1, 6))
    
    # Certifications section (if not empty)
    if details['certifications']:
        story.append(Paragraph('CERTIFICATIONS', styles['SectionHeader']))
        for cert in details['certifications']:
            story.append(Paragraph(cert, styles['Normal']))
        story.append(Spacer(1, 12))

    # Additional Information
    if details['additional_info']:
        story.append(Paragraph('ADDITIONAL INFORMATION', styles['SectionHeader']))
        story.append(Paragraph(details['additional_info'], styles['Normal']))
        story.append(Spacer(1, 12))
    
    try:
        print(story)
        # Generate the PDF
        doc.build(story)
        # print(f"PDF successfully generated: {file_name}")
    except Exception as e:
        # print(f"Error generating PDF: {e}")
        raise

# Helper function to safely create text for PDF
def clean_text_for_pdf(text):
    text=extract_resume_content(text)
    # print(text)
    if not text:
        return ""
    # Replace problematic characters
     # Remove markdown-style headers like ## or **
    clean_text = re.sub(r"##?\s*", "", text)  # Remove ## and # headers
    clean_text = re.sub(r"\*\*|\*", "", clean_text)  # Remove bold (**) or italic (*)

    # Remove extra whitespace/newlines
    clean_text = re.sub(r"\n{2,}", "\n", clean_text)  # Convert multiple newlines into a single newline
    clean_text = clean_text.strip()  # Remove leading/trailing whitespace
    # print(clean_text)
    return clean_text